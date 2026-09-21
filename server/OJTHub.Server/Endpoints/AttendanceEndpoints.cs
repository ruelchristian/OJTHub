using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using OJTHub.Server.Data;
using OJTHub.Server.DTOs;
using OJTHub.Server.Models;
using OJTHub.Server.Services;

namespace OJTHub.Server.Endpoints;

public static class AttendanceEndpoints
{
    public static RouteGroupBuilder MapAttendanceEndpoints(this RouteGroupBuilder group)
    {
        group.MapPost("/time-in", async (TimeInRequest req, ClaimsPrincipal principal, OJTHubDbContext db, IAttendanceService attendanceService) =>
        {
            var userId = GetUserId(principal);
            if (userId == null) return Results.Unauthorized();

            var setting = await db.OjtSettings.FirstOrDefaultAsync(s => s.UserId == userId.Value);
            if (setting == null)
            {
                setting = new OjtSetting { UserId = userId.Value };
                db.OjtSettings.Add(setting);
                await db.SaveChangesAsync();
            }

            var today = DateOnly.FromDateTime(DateTime.UtcNow);

            // Check if there is an active shift
            var existingRecord = await db.AttendanceRecords
                .FirstOrDefaultAsync(a => a.UserId == userId.Value && a.Date == today);

            if (existingRecord != null && existingRecord.TimeOut == null)
            {
                return Results.BadRequest(new { message = "You already have an active shift for today. Please Time-Out first." });
            }

            if (existingRecord != null && existingRecord.TimeOut != null)
            {
                return Results.BadRequest(new { message = "You have already completed your shift for today." });
            }

            // Check GPS accuracy threshold
            if (req.Accuracy > setting.GpsAccuracyThreshold)
            {
                return Results.BadRequest(new
                {
                    message = $"GPS signal is too weak (accuracy: {req.Accuracy:F1}m exceeds allowable limit of {setting.GpsAccuracyThreshold}m). Please move outdoors or near a window and retry."
                });
            }

            // Calculate Haversine distance
            var distance = attendanceService.CalculateDistanceMeters(
                req.Latitude, req.Longitude,
                setting.WorkplaceLatitude, setting.WorkplaceLongitude
            );

            var withinGeofence = distance <= setting.GeofenceRadiusMeters;

            var punchTime = DateTimeOffset.UtcNow;
            if (req.ClientTimestamp.HasValue && 
                req.ClientTimestamp.Value <= DateTimeOffset.UtcNow.AddMinutes(10) && 
                req.ClientTimestamp.Value >= DateTimeOffset.UtcNow.AddDays(-7))
            {
                punchTime = req.ClientTimestamp.Value;
            }

            var record = new AttendanceRecord
            {
                UserId = userId.Value,
                Date = DateOnly.FromDateTime(punchTime.UtcDateTime),
                TimeIn = punchTime,
                TimeInLatitude = req.Latitude,
                TimeInLongitude = req.Longitude,
                TimeInDistance = distance,
                TimeInGpsAccuracy = req.Accuracy,
                TimeInWithinGeofence = withinGeofence,
                LunchBreakMinutes = setting.DefaultLunchMinutes
            };

            db.AttendanceRecords.Add(record);
            await db.SaveChangesAsync();

            var user = await db.Users.FindAsync(userId.Value);

            return Results.Ok(ToDto(record, user?.FullName ?? "Trainee"));
        })
        .RequireAuthorization()
        .WithName("TimeIn")
        .WithTags("Attendance");

        group.MapPost("/time-out", async (TimeOutRequest req, ClaimsPrincipal principal, OJTHubDbContext db, IAttendanceService attendanceService) =>
        {
            var userId = GetUserId(principal);
            if (userId == null) return Results.Unauthorized();

            var setting = await db.OjtSettings.FirstOrDefaultAsync(s => s.UserId == userId.Value);
            var today = DateOnly.FromDateTime(DateTime.UtcNow);

            // Find active shift
            var record = await db.AttendanceRecords
                .FirstOrDefaultAsync(a => a.UserId == userId.Value && a.TimeOut == null);

            if (record == null)
            {
                return Results.BadRequest(new { message = "No active Time-In shift was found. Please Time-In first." });
            }

            // Calculate Haversine distance
            decimal distance = 0;
            bool withinGeofence = true;

            if (setting != null)
            {
                distance = attendanceService.CalculateDistanceMeters(
                    req.Latitude, req.Longitude,
                    setting.WorkplaceLatitude, setting.WorkplaceLongitude
                );
                withinGeofence = distance <= setting.GeofenceRadiusMeters;
            }

            var now = DateTimeOffset.UtcNow;
            if (req.ClientTimestamp.HasValue && 
                req.ClientTimestamp.Value <= DateTimeOffset.UtcNow.AddMinutes(10) && 
                req.ClientTimestamp.Value >= record.TimeIn)
            {
                now = req.ClientTimestamp.Value;
            }
            var lunchMinutes = req.CustomLunchMinutes ?? record.LunchBreakMinutes;
            var maxCapHours = setting != null ? Math.Max(setting.DailyScheduleHours * 2m, 12m) : 16m;
            var netHours = attendanceService.CalculateNetHours(record.TimeIn, now, lunchMinutes, maxCapHours);

            if ((now - record.TimeIn).TotalHours >= 12.0 && string.IsNullOrWhiteSpace(record.SupervisorRemark))
            {
                record.SupervisorRemark = "Extended shift (>12 hours logged; flagged for supervisor verification)";
            }

            record.TimeOut = now;
            record.TimeOutLatitude = req.Latitude;
            record.TimeOutLongitude = req.Longitude;
            record.TimeOutDistance = distance;
            record.TimeOutGpsAccuracy = req.Accuracy;
            record.TimeOutWithinGeofence = withinGeofence;
            record.LunchBreakMinutes = lunchMinutes;
            record.NetRenderedHours = netHours;

            await db.SaveChangesAsync();

            var user = await db.Users.FindAsync(userId.Value);
            return Results.Ok(ToDto(record, user?.FullName ?? "Trainee"));
        })
        .RequireAuthorization()
        .WithName("TimeOut")
        .WithTags("Attendance");

        group.MapGet("/status", async (ClaimsPrincipal principal, OJTHubDbContext db) =>
        {
            var userId = GetUserId(principal);
            if (userId == null) return Results.Unauthorized();

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var record = await db.AttendanceRecords
                .Include(a => a.User)
                .Include(a => a.PerimeterLogs)
                .Where(a => a.UserId == userId.Value)
                .OrderByDescending(a => a.Date)
                .ThenByDescending(a => a.TimeIn)
                .FirstOrDefaultAsync(a => a.Date == today || a.TimeOut == null);

            var setting = await db.OjtSettings.FirstOrDefaultAsync(s => s.UserId == userId.Value);
            var user = await db.Users.FindAsync(userId.Value);

            var hasActiveShift = record != null && record.TimeOut == null;

            return Results.Ok(new AttendanceStatusResponse(
                hasActiveShift,
                record != null ? ToDto(record, user?.FullName ?? "Trainee") : null,
                setting != null ? new OjtSettingDto(
                    setting.Id, setting.CompanyName, setting.WorkplaceLatitude,
                    setting.WorkplaceLongitude, setting.GeofenceRadiusMeters,
                    setting.GpsAccuracyThreshold, setting.TargetTotalHours,
                    setting.DailyScheduleHours, setting.DefaultLunchMinutes
                ) : null
            ));
        })
        .RequireAuthorization()
        .WithName("GetAttendanceStatus")
        .WithTags("Attendance");

        group.MapGet("/history", async (int? month, int? year, ClaimsPrincipal principal, OJTHubDbContext db) =>
        {
            var userId = GetUserId(principal);
            if (userId == null) return Results.Unauthorized();

            var query = db.AttendanceRecords
                .Include(a => a.User)
                .Include(a => a.PerimeterLogs)
                .Where(a => a.UserId == userId.Value);

            if (year.HasValue)
            {
                query = query.Where(a => a.Date.Year == year.Value);
            }

            if (month.HasValue)
            {
                query = query.Where(a => a.Date.Month == month.Value);
            }

            var records = await query
                .OrderByDescending(a => a.Date)
                .ThenByDescending(a => a.TimeIn)
                .ToListAsync();

            var dtos = records.Select(r => ToDto(r, r.User?.FullName ?? "Trainee")).ToList();
            return Results.Ok(dtos);
        })
        .RequireAuthorization()
        .WithName("GetAttendanceHistory")
        .WithTags("Attendance");

        group.MapGet("/hours/summary", async (ClaimsPrincipal principal, OJTHubDbContext db) =>
        {
            var userId = GetUserId(principal);
            if (userId == null) return Results.Unauthorized();

            var setting = await db.OjtSettings.FirstOrDefaultAsync(s => s.UserId == userId.Value);
            var targetHours = setting?.TargetTotalHours ?? 486.0m;

            var records = await db.AttendanceRecords
                .Where(a => a.UserId == userId.Value && a.NetRenderedHours != null)
                .ToListAsync();

            var renderedHours = records.Sum(r => r.NetRenderedHours ?? 0m);
            var remainingHours = Math.Max(0m, targetHours - renderedHours);
            var percentage = targetHours > 0 ? Math.Min(100.0m, Math.Round((renderedHours / targetHours) * 100m, 1)) : 0m;
            var totalDays = records.Count;

            return Results.Ok(new HoursSummaryDto(
                targetHours,
                renderedHours,
                remainingHours,
                percentage,
                totalDays
            ));
        })
        .RequireAuthorization()
        .WithName("GetHoursSummary")
        .WithTags("Attendance");

        group.MapPost("/perimeter-event", async (LogPerimeterEventRequest req, ClaimsPrincipal principal, OJTHubDbContext db) =>
        {
            var userId = GetUserId(principal);
            if (userId == null) return Results.Unauthorized();

            // Find the active shift or specific shift
            var record = req.AttendanceRecordId.HasValue
                ? await db.AttendanceRecords.Include(a => a.PerimeterLogs).FirstOrDefaultAsync(a => a.Id == req.AttendanceRecordId.Value && a.UserId == userId.Value)
                : await db.AttendanceRecords.Include(a => a.PerimeterLogs).FirstOrDefaultAsync(a => a.UserId == userId.Value && a.TimeOut == null);

            if (record == null)
            {
                return Results.BadRequest(new { message = "No active shift found to attach perimeter event." });
            }

            var eventTime = req.ClientTimestamp ?? DateTimeOffset.UtcNow;
            var recentSameEvent = record.PerimeterLogs
                .OrderByDescending(p => p.Timestamp)
                .FirstOrDefault();

            if (recentSameEvent != null && 
                recentSameEvent.EventType == req.EventType && 
                Math.Abs((eventTime - recentSameEvent.Timestamp).TotalSeconds) < 60)
            {
                return Results.Ok(new { message = "Perimeter event already recorded recently.", ignored = true });
            }

            var log = new PerimeterLog
            {
                Id = Guid.NewGuid(),
                AttendanceRecordId = record.Id,
                UserId = userId.Value,
                Timestamp = eventTime,
                EventType = req.EventType,
                Latitude = req.Latitude,
                Longitude = req.Longitude,
                DistanceMeters = req.DistanceMeters,
                GpsAccuracy = req.GpsAccuracy,
                Note = req.Note ?? (req.EventType == "Departed" ? "Stepped outside geofence perimeter" : "Re-entered geofence perimeter")
            };

            db.PerimeterLogs.Add(log);

            if (req.EventType == "Departed")
            {
                record.PerimeterBreachCount++;
            }

            await db.SaveChangesAsync();

            return Results.Ok(new
            {
                message = $"Perimeter {req.EventType.ToLowerInvariant()} event logged successfully.",
                logId = log.Id,
                breachCount = record.PerimeterBreachCount
            });
        })
        .RequireAuthorization()
        .WithName("LogPerimeterEvent")
        .WithTags("Attendance");

        return group;
    }

    private static AttendanceRecordDto ToDto(AttendanceRecord r, string userName) =>
        new(
            r.Id,
            r.UserId,
            userName,
            r.Date,
            r.TimeIn,
            r.TimeInLatitude,
            r.TimeInLongitude,
            r.TimeInDistance,
            r.TimeInGpsAccuracy,
            r.TimeInWithinGeofence,
            r.TimeOut,
            r.TimeOutLatitude,
            r.TimeOutLongitude,
            r.TimeOutDistance,
            r.TimeOutGpsAccuracy,
            r.TimeOutWithinGeofence,
            r.LunchBreakMinutes,
            r.NetRenderedHours,
            r.IsVerified,
            r.VerifiedAt,
            r.SupervisorRemark,
            r.PerimeterBreachCount,
            r.PerimeterLogs?.OrderBy(p => p.Timestamp).Select(p => new PerimeterLogDto(
                p.Id,
                p.AttendanceRecordId,
                p.UserId,
                p.Timestamp,
                p.EventType,
                p.Latitude,
                p.Longitude,
                p.DistanceMeters,
                p.GpsAccuracy,
                p.Note
            )).ToList()
        );

    private static Guid? GetUserId(ClaimsPrincipal principal)
    {
        var claim = principal.FindFirst("userId")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
