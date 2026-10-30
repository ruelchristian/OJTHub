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

            var setting = await GetEffectiveSettingAsync(db, userId.Value);

            // 1. Check for ANY active shift in progress across all dates
            var activeRecord = await db.AttendanceRecords
                .FirstOrDefaultAsync(a => a.UserId == userId.Value && a.TimeOut == null);

            if (activeRecord != null)
            {
                var nowUtc = DateTimeOffset.UtcNow;
                if ((nowUtc - activeRecord.TimeIn).TotalHours >= 20.0)
                {
                    // Auto-close stale runaway zombie shift from past days
                    var maxCap = setting.MaxDailyHours > 0 ? setting.MaxDailyHours : 10.0m;
                    activeRecord.TimeOut = activeRecord.TimeIn.AddHours((double)maxCap);
                    activeRecord.NetRenderedHours = maxCap;
                    activeRecord.SupervisorRemark = string.IsNullOrWhiteSpace(activeRecord.SupervisorRemark)
                        ? $"[Auto-Closed] Exceeded 20h limit; capped at {maxCap:F1}h. Trainee forgot to punch out."
                        : $"{activeRecord.SupervisorRemark} | [Auto-Closed] Capped at {maxCap:F1}h.";
                    await db.SaveChangesAsync();
                }
                else
                {
                    return Results.BadRequest(new { message = "You already have an active shift in progress. Please Time-Out before starting a new shift." });
                }
            }

            var punchTime = DateTimeOffset.UtcNow;
            if (req.ClientTimestamp.HasValue && 
                req.ClientTimestamp.Value <= DateTimeOffset.UtcNow.AddMinutes(10) && 
                req.ClientTimestamp.Value >= DateTimeOffset.UtcNow.AddDays(-7))
            {
                punchTime = req.ClientTimestamp.Value;
            }

            // 2. Weekend shift check (Philippines UTC+8)
            var localPunch = punchTime.ToOffset(TimeSpan.FromHours(8));
            var isWeekend = localPunch.DayOfWeek == DayOfWeek.Saturday || localPunch.DayOfWeek == DayOfWeek.Sunday;
            if (isWeekend && !setting.AllowWeekendPunches && string.IsNullOrWhiteSpace(req.StudentRemark))
            {
                return Results.BadRequest(new { message = "Weekend attendance punches are disabled by your coordinator. If authorized to work weekends, please provide an explanation note." });
            }

            var punchDate = DateOnly.FromDateTime(punchTime.UtcDateTime);
            var today = DateOnly.FromDateTime(DateTime.UtcNow);

            // 3. Prevent infinite punches: check if user already completed a shift today
            var completedToday = await db.AttendanceRecords
                .FirstOrDefaultAsync(a => a.UserId == userId.Value && (a.Date == punchDate || a.Date == today) && a.TimeOut != null);

            if (completedToday != null)
            {
                return Results.BadRequest(new { message = "You have already completed your shift for today. Daily attendance is limited to one shift per day." });
            }

            // Calculate Haversine distance
            decimal distance = 0;
            bool withinGeofence = false;

            if (req.Latitude == 0 && req.Longitude == 0)
            {
                distance = 0;
                withinGeofence = false;
            }
            else
            {
                distance = attendanceService.CalculateDistanceMeters(
                    req.Latitude, req.Longitude,
                    setting.WorkplaceLatitude, setting.WorkplaceLongitude
                );
                withinGeofence = distance <= setting.GeofenceRadiusMeters;
            }

            // Telemetry & Audit: If GPS accuracy exceeds coordinator threshold or no GPS fix, record remark for supervisor review
            string? accuracyRemark = null;
            if (req.Latitude == 0 && req.Longitude == 0)
            {
                accuracyRemark = "Time-In logged without GPS coordinates (device location disabled/unavailable); requires supervisor review.";
            }
            else if (req.Accuracy > setting.GpsAccuracyThreshold)
            {
                accuracyRemark = $"Logged with low GPS precision (±{req.Accuracy:F0}m > {setting.GpsAccuracyThreshold}m limit); recorded for supervisor review.";
            }

            // Anti-fraud: flag historical offline punches for coordinator verification
            var isHistoricalOffline = req.ClientTimestamp.HasValue && 
                Math.Abs((DateTimeOffset.UtcNow - req.ClientTimestamp.Value).TotalMinutes) > 15;

            if (isHistoricalOffline)
            {
                var offlineTag = $"[Historical/Offline Punch: {req.ClientTimestamp:yyyy-MM-dd HH:mm} UTC]";
                accuracyRemark = string.IsNullOrEmpty(accuracyRemark)
                    ? offlineTag
                    : $"{accuracyRemark} | {offlineTag}";
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
                SupervisorRemark = accuracyRemark,
                StudentRemark = !string.IsNullOrWhiteSpace(req.StudentRemark) ? req.StudentRemark.Trim() : null,
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

            var setting = await GetEffectiveSettingAsync(db, userId.Value);
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

            if (req.Latitude == 0 && req.Longitude == 0)
            {
                distance = 0;
                withinGeofence = false;
            }
            else if (setting != null)
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
            var maxCapHours = setting != null && setting.MaxDailyHours > 0 ? setting.MaxDailyHours : 10.0m;
            var netHours = attendanceService.CalculateNetHours(record.TimeIn, now, lunchMinutes, maxCapHours);

            var elapsedShiftHours = (decimal)(now - record.TimeIn).TotalHours;
            var scheduledDailyHours = setting?.DailyScheduleHours ?? 8.0m;

            if (elapsedShiftHours >= maxCapHours && string.IsNullOrWhiteSpace(record.SupervisorRemark))
            {
                record.SupervisorRemark = $"Reached maximum daily cap ({maxCapHours:F1}h limit set by teacher); excess time capped.";
            }

            if (req.Latitude == 0 && req.Longitude == 0)
            {
                var noGpsTimeout = "Time-out logged without GPS coordinates (device location disabled/unavailable)";
                record.SupervisorRemark = string.IsNullOrWhiteSpace(record.SupervisorRemark)
                    ? noGpsTimeout
                    : $"{record.SupervisorRemark} | {noGpsTimeout}";
            }
            else if (setting != null && req.Accuracy > setting.GpsAccuracyThreshold)
            {
                var timeoutNote = $"Time-out logged with low GPS precision (±{req.Accuracy:F0}m > {setting.GpsAccuracyThreshold}m limit)";
                record.SupervisorRemark = string.IsNullOrWhiteSpace(record.SupervisorRemark)
                    ? timeoutNote
                    : $"{record.SupervisorRemark} | {timeoutNote}";
            }

            record.TimeOut = now;
            record.TimeOutLatitude = req.Latitude;
            record.TimeOutLongitude = req.Longitude;
            record.TimeOutDistance = distance;
            record.TimeOutGpsAccuracy = req.Accuracy;
            record.TimeOutWithinGeofence = withinGeofence;
            record.LunchBreakMinutes = lunchMinutes;
            record.NetRenderedHours = netHours;

            // Flag early departure if shift duration is less than scheduled hours
            var isEarlyDeparture = elapsedShiftHours < scheduledDailyHours;
            if (!string.IsNullOrWhiteSpace(req.StudentRemark))
            {
                var trimmed = req.StudentRemark.Trim();
                record.StudentRemark = string.IsNullOrWhiteSpace(record.StudentRemark)
                    ? trimmed
                    : $"{record.StudentRemark} | Time-out: {trimmed}";
            }
            else if (isEarlyDeparture)
            {
                var earlyTag = $"[Early Departure: {elapsedShiftHours:F1}h on duty / {scheduledDailyHours:F1}h scheduled]";
                record.StudentRemark = string.IsNullOrWhiteSpace(record.StudentRemark)
                    ? earlyTag
                    : $"{record.StudentRemark} | {earlyTag}";
            }

            await db.SaveChangesAsync();

            var user = await db.Users.FindAsync(userId.Value);
            return Results.Ok(ToDto(record, user?.FullName ?? "Trainee"));
        })
        .RequireAuthorization()
        .WithName("TimeOut")
        .WithTags("Attendance");

        group.MapPost("/resume-shift", async (ClaimsPrincipal principal, OJTHubDbContext db) =>
        {
            var userId = GetUserId(principal);
            if (userId == null) return Results.Unauthorized();

            var now = DateTimeOffset.UtcNow;
            var today = DateOnly.FromDateTime(now.UtcDateTime);

            // Find the most recently completed shift for today (or within last 30 minutes)
            var rawCompleted = await db.AttendanceRecords
                .Where(a => a.UserId == userId.Value && a.TimeOut != null && (a.Date == today || a.TimeOut >= now.AddMinutes(-30)))
                .ToListAsync();

            var record = rawCompleted
                .OrderByDescending(a => a.TimeOut)
                .FirstOrDefault();

            if (record == null)
            {
                return Results.BadRequest(new { message = "No recent completed shift was found to resume." });
            }

            // Must be within 30-minute grace window
            if (!record.TimeOut.HasValue || now - record.TimeOut.Value > TimeSpan.FromMinutes(30))
            {
                return Results.BadRequest(new { message = "Shift resumption window has expired (must be within 30 minutes of Time-Out). Please consult your supervisor for adjustments." });
            }

            // Clear TimeOut and NetRenderedHours to reactivate shift
            record.TimeOut = null;
            record.NetRenderedHours = null;
            record.StudentRemark = string.IsNullOrWhiteSpace(record.StudentRemark)
                ? $"[Shift Resumed at {now:HH:mm} UTC]"
                : $"{record.StudentRemark} | [Shift Resumed at {now:HH:mm} UTC]";

            await db.SaveChangesAsync();

            var user = await db.Users.FindAsync(userId.Value);
            return Results.Ok(ToDto(record, user?.FullName ?? "Trainee"));
        })
        .RequireAuthorization()
        .WithName("ResumeShift")
        .WithTags("Attendance");

        group.MapGet("/status", async (ClaimsPrincipal principal, OJTHubDbContext db) =>
        {
            var userId = GetUserId(principal);
            if (userId == null) return Results.Unauthorized();

            var now = DateTimeOffset.UtcNow;
            var setting = await GetEffectiveSettingAsync(db, userId.Value);

            // Auto-close stale runaway zombie shift exceeding 20h
            var activeShift = await db.AttendanceRecords
                .FirstOrDefaultAsync(a => a.UserId == userId.Value && a.TimeOut == null);

            if (activeShift != null && (now - activeShift.TimeIn).TotalHours >= 20.0)
            {
                var maxCap = setting.MaxDailyHours > 0 ? setting.MaxDailyHours : 10.0m;
                activeShift.TimeOut = activeShift.TimeIn.AddHours((double)maxCap);
                activeShift.NetRenderedHours = maxCap;
                activeShift.SupervisorRemark = string.IsNullOrWhiteSpace(activeShift.SupervisorRemark)
                    ? $"[Auto-Closed] Exceeded 20h threshold; capped at {maxCap:F1}h limit."
                    : $"{activeShift.SupervisorRemark} | [Auto-Closed] Capped at {maxCap:F1}h.";
                await db.SaveChangesAsync();
            }

            var today = DateOnly.FromDateTime(now.UtcDateTime);
            var cutoff = now.AddHours(-18);
            var rawRecords = await db.AttendanceRecords
                .Include(a => a.User)
                .Include(a => a.PerimeterLogs)
                .Where(a => a.UserId == userId.Value)
                .OrderByDescending(a => a.Date)
                .ToListAsync();

            var records = rawRecords
                .Where(a => a.Date == today || a.TimeOut == null || a.TimeOut >= cutoff)
                .OrderByDescending(a => a.Date)
                .ThenByDescending(a => a.TimeIn)
                .ToList();

            var record = records
                .OrderByDescending(a => a.TimeIn)
                .FirstOrDefault();

            var user = await db.Users.FindAsync(userId.Value);
            var supervisor = user?.SupervisorId != null ? await db.Users.FindAsync(user.SupervisorId.Value) : null;

            var hasActiveShift = record != null && record.TimeOut == null;
            var isLocked = user != null && user.Role == "Trainee" && user.SupervisorId != null;

            return Results.Ok(new AttendanceStatusResponse(
                hasActiveShift,
                record != null ? ToDto(record, user?.FullName ?? "Trainee") : null,
                setting != null ? new OjtSettingDto(
                    setting.Id, setting.CompanyName, setting.WorkplaceLatitude,
                    setting.WorkplaceLongitude, setting.GeofenceRadiusMeters,
                    setting.GpsAccuracyThreshold, setting.TargetTotalHours,
                    setting.DailyScheduleHours, setting.DefaultLunchMinutes,
                    isLocked,
                    supervisor?.FullName,
                    user?.SupervisorId,
                    setting.MaxDailyHours,
                    setting.AllowWeekendPunches
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

            var rawRecords = await query
                .OrderByDescending(a => a.Date)
                .ToListAsync();

            var records = rawRecords
                .OrderByDescending(a => a.Date)
                .ThenByDescending(a => a.TimeIn)
                .ToList();

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

            var setting = await GetEffectiveSettingAsync(db, userId.Value);
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

            var defaultNote = req.EventType switch
            {
                "Departed" => "Stepped outside geofence perimeter",
                "Returned" => "Re-entered geofence perimeter",
                "LocationDisabled" => "Device location was disabled or GPS permission was revoked during active shift",
                "LocationRestored" => "Device location signal restored",
                _ => "Perimeter status change"
            };

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
                Note = req.Note ?? defaultNote
            };

            db.PerimeterLogs.Add(log);

            if (req.EventType == "Departed" || req.EventType == "LocationDisabled")
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
            )).ToList(),
            r.StudentRemark
        );

    private static Guid? GetUserId(ClaimsPrincipal principal)
    {
        var claim = principal.FindFirst("userId")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }

    private static async Task<OjtSetting> GetEffectiveSettingAsync(OJTHubDbContext db, Guid userId)
    {
        var user = await db.Users
            .Include(u => u.Supervisor)
            .FirstOrDefaultAsync(u => u.Id == userId);

        // If trainee is linked to a supervisor, use trainee's specific setting or fallback to supervisor's active workplace rules
        if (user != null && user.Role == "Trainee" && user.SupervisorId != null)
        {
            var traineeSetting = await db.OjtSettings.FirstOrDefaultAsync(s => s.UserId == userId);
            var supervisorSetting = await db.OjtSettings.FirstOrDefaultAsync(s => s.UserId == user.SupervisorId.Value);

            var effective = traineeSetting ?? supervisorSetting;
            if (effective != null)
            {
                return effective;
            }
        }

        var setting = await db.OjtSettings.FirstOrDefaultAsync(s => s.UserId == userId);
        if (setting == null)
        {
            setting = new OjtSetting { UserId = userId, UpdatedAt = DateTimeOffset.UtcNow };
            db.OjtSettings.Add(setting);
            await db.SaveChangesAsync();
        }

        return setting;
    }
}
