using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using OJTHub.Server.Data;
using OJTHub.Server.DTOs;
using OJTHub.Server.Models;
using OJTHub.Server.Services;

namespace OJTHub.Server.Endpoints;

public static class SupervisorEndpoints
{
    public record VerifyAttendanceRequest(
        Guid AttendanceRecordId,
        string? Remark
    );

    public record BatchVerifyRequest(
        Guid TraineeId,
        bool OnlyWithinGeofence = true,
        string? DefaultRemark = "Verified by Supervisor"
    );

    public record TraineeSummaryDto(
        Guid TraineeId,
        string FullName,
        string Email,
        string? StudentId,
        string CompanyName,
        decimal TargetTotalHours,
        decimal RenderedHours,
        decimal CompletionPercentage,
        int PendingVerificationCount,
        OjtSettingDto? Settings = null,
        bool IsOnDuty = false,
        DateTimeOffset? ActiveShiftStartedAt = null,
        string TodayStatus = "NotStarted",
        string? SchoolName = null,
        string? Department = null
    );

    public static RouteGroupBuilder MapSupervisorEndpoints(this RouteGroupBuilder group)
    {
        // ---------------------------------------------------------------------------------
        // Trainee Operations: Link / Unlink Supervisor Invite Code
        // ---------------------------------------------------------------------------------
        group.MapPost("/link-code", async (LinkSupervisorRequest req, ClaimsPrincipal principal, OJTHubDbContext db) =>
        {
            var userId = GetUserId(principal);
            if (userId == null) return Results.Unauthorized();

            var normalizedCode = SupervisorCodeGenerator.NormalizeCode(req.Code);
            if (!SupervisorCodeGenerator.IsValidFormat(normalizedCode))
            {
                return Results.BadRequest(new { message = "Invalid supervisor code format. Expected format: ICCT-2026 or OJT-XXXXX." });
            }

            var trainee = await db.Users
                .Include(u => u.OjtSetting)
                .FirstOrDefaultAsync(u => u.Id == userId.Value);

            if (trainee == null) return Results.NotFound(new { message = "Trainee account not found." });

            var supervisor = await db.Users
                .Include(s => s.OjtSetting)
                .FirstOrDefaultAsync(s => s.Role == "Supervisor" && s.SupervisorCode == normalizedCode);

            if (supervisor == null)
            {
                return Results.NotFound(new { message = $"No supervisor found with code \"{normalizedCode}\". Please verify with your coordinator." });
            }

            // Link trainee to supervisor
            trainee.SupervisorId = supervisor.Id;
            if (!string.IsNullOrWhiteSpace(supervisor.SchoolName))
            {
                trainee.SchoolName = supervisor.SchoolName;
            }
            if (!string.IsNullOrWhiteSpace(supervisor.Department))
            {
                trainee.Department = supervisor.Department;
            }

            // If supervisor has configured settings, inherit class rules while preserving any existing trainee company location
            if (supervisor.OjtSetting != null)
            {
                if (trainee.OjtSetting == null)
                {
                    trainee.OjtSetting = new OjtSetting
                    {
                        UserId = trainee.Id,
                        CompanyName = supervisor.OjtSetting.CompanyName,
                        WorkplaceLatitude = supervisor.OjtSetting.WorkplaceLatitude,
                        WorkplaceLongitude = supervisor.OjtSetting.WorkplaceLongitude,
                        GeofenceRadiusMeters = supervisor.OjtSetting.GeofenceRadiusMeters
                    };
                    db.OjtSettings.Add(trainee.OjtSetting);
                }

                trainee.OjtSetting.GpsAccuracyThreshold = supervisor.OjtSetting.GpsAccuracyThreshold;
                trainee.OjtSetting.TargetTotalHours = supervisor.OjtSetting.TargetTotalHours;
                trainee.OjtSetting.DailyScheduleHours = supervisor.OjtSetting.DailyScheduleHours;
                trainee.OjtSetting.MaxDailyHours = supervisor.OjtSetting.MaxDailyHours;
                trainee.OjtSetting.AllowWeekendPunches = supervisor.OjtSetting.AllowWeekendPunches;
                trainee.OjtSetting.DefaultLunchMinutes = supervisor.OjtSetting.DefaultLunchMinutes;
                trainee.OjtSetting.UpdatedAt = DateTimeOffset.UtcNow;
            }

            await db.SaveChangesAsync();

            return Results.Ok(new
            {
                message = $"Successfully linked to supervisor {supervisor.FullName}.",
                supervisorId = supervisor.Id,
                supervisorName = supervisor.FullName,
                companyName = supervisor.OjtSetting?.CompanyName ?? "Host Establishment"
            });
        })
        .RequireAuthorization()
        .WithName("LinkSupervisorCode")
        .WithTags("Supervisor")
        .WithDescription("Allows trainee to link to a supervisor using an invite code");

        group.MapPost("/unlink", async (ClaimsPrincipal principal, OJTHubDbContext db) =>
        {
            var userId = GetUserId(principal);
            if (userId == null) return Results.Unauthorized();

            var user = await db.Users.FindAsync(userId.Value);
            if (user == null) return Results.NotFound();

            user.SupervisorId = null;
            await db.SaveChangesAsync();

            return Results.Ok(new { message = "Successfully unlinked from supervisor." });
        })
        .RequireAuthorization()
        .WithName("UnlinkSupervisor")
        .WithTags("Supervisor");

        // ---------------------------------------------------------------------------------
        // Supervisor Operations (Supervisor Role Required)
        // ---------------------------------------------------------------------------------
        group.MapGet("/my-code", async (ClaimsPrincipal principal, OJTHubDbContext db) =>
        {
            var supervisorId = GetUserId(principal);
            if (supervisorId == null) return Results.Unauthorized();

            var supervisor = await db.Users.FindAsync(supervisorId.Value);
            if (supervisor == null || supervisor.Role != "Supervisor")
            {
                return Results.Forbid();
            }

            return Results.Ok(new SupervisorCodeResponse(supervisor.SupervisorCode ?? "", supervisor.FullName));
        })
        .RequireAuthorization(policy => policy.RequireRole("Supervisor"))
        .WithName("GetMySupervisorCode")
        .WithTags("Supervisor");

        group.MapGet("/trainees", async (ClaimsPrincipal principal, OJTHubDbContext db) =>
        {
            var supervisorId = GetUserId(principal);
            if (supervisorId == null) return Results.Unauthorized();

            // Strict Tenant Isolation: Only return trainees assigned to this specific supervisor
            var trainees = await db.Users
                .Include(u => u.OjtSetting)
                .Include(u => u.AttendanceRecords)
                .Where(u => u.Role == "Trainee" && u.SupervisorId == supervisorId.Value)
                .OrderBy(u => u.FullName)
                .ToListAsync();

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var dtos = trainees.Select(t =>
            {
                var target = t.OjtSetting?.TargetTotalHours ?? 486.0m;
                var rendered = t.AttendanceRecords.Where(a => a.NetRenderedHours != null).Sum(a => a.NetRenderedHours ?? 0m);
                var pct = target > 0 ? Math.Min(100m, Math.Round((rendered / target) * 100m, 1)) : 0m;
                var pending = t.AttendanceRecords.Count(a => a.TimeOut != null && !a.IsVerified);

                var activeShift = t.AttendanceRecords.FirstOrDefault(a => a.TimeOut == null);
                var isOnDuty = activeShift != null;
                var todayRecord = t.AttendanceRecords.FirstOrDefault(a => a.Date == today);
                var todayStatus = isOnDuty ? "OnDuty" : (todayRecord != null && todayRecord.TimeOut != null ? "Completed" : "NotStarted");

                OjtSettingDto? settingDto = null;
                if (t.OjtSetting != null)
                {
                    settingDto = new OjtSettingDto(
                        t.OjtSetting.Id,
                        t.OjtSetting.CompanyName,
                        t.OjtSetting.WorkplaceLatitude,
                        t.OjtSetting.WorkplaceLongitude,
                        t.OjtSetting.GeofenceRadiusMeters,
                        t.OjtSetting.GpsAccuracyThreshold,
                        t.OjtSetting.TargetTotalHours,
                        t.OjtSetting.DailyScheduleHours,
                        t.OjtSetting.DefaultLunchMinutes,
                        true,
                        t.FullName,
                        supervisorId.Value,
                        t.OjtSetting.MaxDailyHours,
                        t.OjtSetting.AllowWeekendPunches
                    );
                }

                return new TraineeSummaryDto(
                    t.Id,
                    t.FullName,
                    t.Email,
                    t.StudentId,
                    t.OjtSetting?.CompanyName ?? "Host Establishment",
                    target,
                    rendered,
                    pct,
                    pending,
                    settingDto,
                    isOnDuty,
                    activeShift?.TimeIn,
                    todayStatus,
                    t.SchoolName,
                    t.Department
                );
            }).ToList();

            return Results.Ok(dtos);
        })
        .RequireAuthorization(policy => policy.RequireRole("Supervisor"))
        .WithName("GetTrainees")
        .WithTags("Supervisor");

        group.MapGet("/trainees/{traineeId:guid}/attendance", async (Guid traineeId, int? month, int? year, ClaimsPrincipal principal, OJTHubDbContext db) =>
        {
            var supervisorId = GetUserId(principal);
            if (supervisorId == null) return Results.Unauthorized();

            // Strict Isolation Check
            var trainee = await db.Users.FirstOrDefaultAsync(u => u.Id == traineeId && u.SupervisorId == supervisorId.Value);
            if (trainee == null) return Results.NotFound(new { message = "Trainee not found or not assigned to your supervision." });

            var query = db.AttendanceRecords
                .Include(a => a.User)
                .Include(a => a.PerimeterLogs)
                .Where(a => a.UserId == traineeId);

            if (year.HasValue) query = query.Where(a => a.Date.Year == year.Value);
            if (month.HasValue) query = query.Where(a => a.Date.Month == month.Value);

            var rawRecords = await query
                .OrderByDescending(a => a.Date)
                .ToListAsync();

            var records = rawRecords
                .OrderByDescending(a => a.Date)
                .ThenByDescending(a => a.TimeIn)
                .ToList();

            var dtos = records.Select(r => new AttendanceRecordDto(
                r.Id, r.UserId, trainee.FullName, r.Date, r.TimeIn,
                r.TimeInLatitude, r.TimeInLongitude, r.TimeInDistance, r.TimeInGpsAccuracy, r.TimeInWithinGeofence,
                r.TimeOut, r.TimeOutLatitude, r.TimeOutLongitude, r.TimeOutDistance, r.TimeOutGpsAccuracy, r.TimeOutWithinGeofence,
                r.LunchBreakMinutes, r.NetRenderedHours, r.IsVerified, r.VerifiedAt, r.SupervisorRemark,
                r.PerimeterBreachCount,
                r.PerimeterLogs?.OrderBy(p => p.Timestamp).Select(p => new PerimeterLogDto(
                    p.Id, p.AttendanceRecordId, p.UserId, p.Timestamp, p.EventType,
                    p.Latitude, p.Longitude, p.DistanceMeters, p.GpsAccuracy, p.Note
                )).ToList(),
                r.StudentRemark
            )).ToList();

            return Results.Ok(dtos);
        })
        .RequireAuthorization(policy => policy.RequireRole("Supervisor"))
        .WithName("GetTraineeAttendance")
        .WithTags("Supervisor");

        group.MapPut("/trainees/{traineeId:guid}/settings", async (Guid traineeId, UpdateOjtSettingRequest req, ClaimsPrincipal principal, OJTHubDbContext db) =>
        {
            var supervisorId = GetUserId(principal);
            if (supervisorId == null) return Results.Unauthorized();

            var trainee = await db.Users
                .Include(u => u.OjtSetting)
                .FirstOrDefaultAsync(u => u.Id == traineeId && u.SupervisorId == supervisorId.Value);

            if (trainee == null) return Results.NotFound(new { message = "Trainee not found or not assigned to your supervision." });

            if (trainee.OjtSetting == null)
            {
                trainee.OjtSetting = new OjtSetting { UserId = trainee.Id };
                db.OjtSettings.Add(trainee.OjtSetting);
            }

            trainee.OjtSetting.CompanyName = req.CompanyName?.Trim() ?? trainee.OjtSetting.CompanyName;
            trainee.OjtSetting.WorkplaceLatitude = req.WorkplaceLatitude;
            trainee.OjtSetting.WorkplaceLongitude = req.WorkplaceLongitude;
            trainee.OjtSetting.GeofenceRadiusMeters = req.GeofenceRadiusMeters > 0 ? req.GeofenceRadiusMeters : 100;
            trainee.OjtSetting.GpsAccuracyThreshold = req.GpsAccuracyThreshold > 0 ? req.GpsAccuracyThreshold : 250;
            trainee.OjtSetting.TargetTotalHours = req.TargetTotalHours > 0 ? req.TargetTotalHours : 486.0m;
            trainee.OjtSetting.DailyScheduleHours = req.DailyScheduleHours > 0 ? req.DailyScheduleHours : 8.0m;
            trainee.OjtSetting.MaxDailyHours = req.MaxDailyHours > 0 ? req.MaxDailyHours : 10.0m;
            trainee.OjtSetting.AllowWeekendPunches = req.AllowWeekendPunches;
            trainee.OjtSetting.DefaultLunchMinutes = req.DefaultLunchMinutes >= 0 ? req.DefaultLunchMinutes : 60;
            trainee.OjtSetting.UpdatedAt = DateTimeOffset.UtcNow;

            await db.SaveChangesAsync();

            return Results.Ok(new { message = $"Settings updated successfully for {trainee.FullName}." });
        })
        .RequireAuthorization(policy => policy.RequireRole("Supervisor"))
        .WithName("UpdateTraineeSettings")
        .WithTags("Supervisor");

        group.MapPost("/broadcast-settings", async (UpdateOjtSettingRequest req, ClaimsPrincipal principal, OJTHubDbContext db) =>
        {
            var supervisorId = GetUserId(principal);
            if (supervisorId == null) return Results.Unauthorized();

            // Also update supervisor's own base setting
            var supervisorSetting = await db.OjtSettings.FirstOrDefaultAsync(s => s.UserId == supervisorId.Value);
            if (supervisorSetting == null)
            {
                supervisorSetting = new OjtSetting { UserId = supervisorId.Value };
                db.OjtSettings.Add(supervisorSetting);
            }
            supervisorSetting.CompanyName = req.CompanyName?.Trim() ?? supervisorSetting.CompanyName;
            supervisorSetting.WorkplaceLatitude = req.WorkplaceLatitude;
            supervisorSetting.WorkplaceLongitude = req.WorkplaceLongitude;
            supervisorSetting.GeofenceRadiusMeters = req.GeofenceRadiusMeters > 0 ? req.GeofenceRadiusMeters : 100;
            supervisorSetting.GpsAccuracyThreshold = req.GpsAccuracyThreshold > 0 ? req.GpsAccuracyThreshold : 250;
            supervisorSetting.TargetTotalHours = req.TargetTotalHours > 0 ? req.TargetTotalHours : 486.0m;
            supervisorSetting.DailyScheduleHours = req.DailyScheduleHours > 0 ? req.DailyScheduleHours : 8.0m;
            supervisorSetting.MaxDailyHours = req.MaxDailyHours > 0 ? req.MaxDailyHours : 10.0m;
            supervisorSetting.AllowWeekendPunches = req.AllowWeekendPunches;
            supervisorSetting.DefaultLunchMinutes = req.DefaultLunchMinutes >= 0 ? req.DefaultLunchMinutes : 60;
            supervisorSetting.UpdatedAt = DateTimeOffset.UtcNow;

            var trainees = await db.Users
                .Include(u => u.OjtSetting)
                .Where(u => u.Role == "Trainee" && u.SupervisorId == supervisorId.Value)
                .ToListAsync();

            if (trainees.Count == 0)
            {
                await db.SaveChangesAsync();
                return Results.Ok(new { message = "Updated instructor setting. No assigned trainees to update.", count = 0 });
            }

            foreach (var trainee in trainees)
            {
                if (trainee.OjtSetting == null)
                {
                    trainee.OjtSetting = new OjtSetting { UserId = trainee.Id };
                    db.OjtSettings.Add(trainee.OjtSetting);
                }

                // Only overwrite workplace location if coordinator explicitly checked OverwriteWorkplaceLocation
                if (req.OverwriteWorkplaceLocation)
                {
                    trainee.OjtSetting.CompanyName = req.CompanyName?.Trim() ?? trainee.OjtSetting.CompanyName;
                    trainee.OjtSetting.WorkplaceLatitude = req.WorkplaceLatitude;
                    trainee.OjtSetting.WorkplaceLongitude = req.WorkplaceLongitude;
                    trainee.OjtSetting.GeofenceRadiusMeters = req.GeofenceRadiusMeters > 0 ? req.GeofenceRadiusMeters : 100;
                }

                // Always apply institutional policy rules
                trainee.OjtSetting.GpsAccuracyThreshold = req.GpsAccuracyThreshold > 0 ? req.GpsAccuracyThreshold : 250;
                trainee.OjtSetting.TargetTotalHours = req.TargetTotalHours > 0 ? req.TargetTotalHours : 486.0m;
                trainee.OjtSetting.DailyScheduleHours = req.DailyScheduleHours > 0 ? req.DailyScheduleHours : 8.0m;
                trainee.OjtSetting.MaxDailyHours = req.MaxDailyHours > 0 ? req.MaxDailyHours : 10.0m;
                trainee.OjtSetting.AllowWeekendPunches = req.AllowWeekendPunches;
                trainee.OjtSetting.DefaultLunchMinutes = req.DefaultLunchMinutes >= 0 ? req.DefaultLunchMinutes : 60;
                trainee.OjtSetting.UpdatedAt = DateTimeOffset.UtcNow;
            }

            await db.SaveChangesAsync();

            return Results.Ok(new
            {
                message = $"Successfully broadcast workplace settings to all {trainees.Count} assigned trainees.",
                count = trainees.Count
            });
        })
        .RequireAuthorization(policy => policy.RequireRole("Supervisor"))
        .WithName("BroadcastSupervisorSettings")
        .WithTags("Supervisor");

        group.MapPost("/verify", async (VerifyAttendanceRequest req, ClaimsPrincipal principal, OJTHubDbContext db) =>
        {
            var supervisorId = GetUserId(principal);
            if (supervisorId == null) return Results.Unauthorized();

            var record = await db.AttendanceRecords
                .Include(a => a.User)
                .FirstOrDefaultAsync(a => a.Id == req.AttendanceRecordId);

            if (record == null) return Results.NotFound(new { message = "Attendance record not found." });

            // Strict Check: Must supervise this trainee
            if (record.User?.SupervisorId != supervisorId.Value)
            {
                return Results.Forbid();
            }

            record.IsVerified = true;
            record.VerifiedAt = DateTimeOffset.UtcNow;
            record.VerifiedBySupervisorId = supervisorId.Value;
            if (!string.IsNullOrWhiteSpace(req.Remark))
            {
                record.SupervisorRemark = req.Remark.Trim();
            }

            await db.SaveChangesAsync();

            return Results.Ok(new { message = "Attendance record successfully verified.", recordId = record.Id });
        })
        .RequireAuthorization(policy => policy.RequireRole("Supervisor"))
        .WithName("VerifyAttendance")
        .WithTags("Supervisor");

        group.MapPost("/verify-batch", async (BatchVerifyRequest req, ClaimsPrincipal principal, OJTHubDbContext db) =>
        {
            var supervisorId = GetUserId(principal);
            if (supervisorId == null) return Results.Unauthorized();

            var trainee = await db.Users
                .Include(u => u.AttendanceRecords)
                .FirstOrDefaultAsync(u => u.Id == req.TraineeId && u.SupervisorId == supervisorId.Value);

            if (trainee == null) return Results.NotFound(new { message = "Trainee not found or not assigned to your supervision." });

            var query = trainee.AttendanceRecords
                .Where(a => a.TimeOut != null && !a.IsVerified);

            if (req.OnlyWithinGeofence)
            {
                query = query.Where(a => a.TimeInWithinGeofence && a.TimeOutWithinGeofence == true);
            }

            var toVerify = query.ToList();
            var now = DateTimeOffset.UtcNow;

            foreach (var rec in toVerify)
            {
                rec.IsVerified = true;
                rec.VerifiedAt = now;
                rec.VerifiedBySupervisorId = supervisorId.Value;
                if (string.IsNullOrWhiteSpace(rec.SupervisorRemark))
                {
                    rec.SupervisorRemark = req.DefaultRemark;
                }
            }

            await db.SaveChangesAsync();

            return Results.Ok(new
            {
                message = $"Successfully verified {toVerify.Count} attendance record(s).",
                count = toVerify.Count
            });
        })
        .RequireAuthorization(policy => policy.RequireRole("Supervisor"))
        .WithName("BatchVerifyAttendance")
        .WithTags("Supervisor");

        group.MapPost("/trainees/{traineeId:guid}/attendance/manual", async (Guid traineeId, ManualAttendanceEntryRequest req, ClaimsPrincipal principal, OJTHubDbContext db) =>
        {
            var supervisorId = GetUserId(principal);
            if (supervisorId == null) return Results.Unauthorized();

            var trainee = await db.Users
                .Include(u => u.OjtSetting)
                .FirstOrDefaultAsync(u => u.Id == traineeId && u.SupervisorId == supervisorId.Value);

            if (trainee == null) return Results.NotFound(new { message = "Trainee not found or not assigned to your supervision." });

            if (req.NetHours <= 0 || req.NetHours > 16.0m)
            {
                return Results.BadRequest(new { message = "Net credited hours must be between 0.1 and 16.0 hours." });
            }

            var supervisor = await db.Users.FindAsync(supervisorId.Value);
            var record = new AttendanceRecord
            {
                UserId = traineeId,
                Date = req.Date,
                TimeIn = req.TimeIn,
                TimeOut = req.TimeOut,
                TimeInWithinGeofence = true,
                TimeOutWithinGeofence = true,
                LunchBreakMinutes = trainee.OjtSetting?.DefaultLunchMinutes ?? 60,
                NetRenderedHours = req.NetHours,
                IsVerified = true,
                VerifiedAt = DateTimeOffset.UtcNow,
                VerifiedBySupervisorId = supervisorId.Value,
                SupervisorRemark = $"[Manual Entry by {supervisor?.FullName ?? "Coordinator"}] {req.Reason.Trim()}"
            };

            db.AttendanceRecords.Add(record);
            await db.SaveChangesAsync();

            return Results.Ok(new { message = "Manual attendance entry recorded successfully.", recordId = record.Id });
        })
        .RequireAuthorization(policy => policy.RequireRole("Supervisor"))
        .WithName("ManualAttendanceEntry")
        .WithTags("Supervisor");

        group.MapPut("/attendance/{recordId:guid}", async (Guid recordId, UpdateAttendanceRecordRequest req, ClaimsPrincipal principal, OJTHubDbContext db) =>
        {
            var supervisorId = GetUserId(principal);
            if (supervisorId == null) return Results.Unauthorized();

            var record = await db.AttendanceRecords
                .Include(a => a.User)
                .FirstOrDefaultAsync(a => a.Id == recordId);

            if (record == null) return Results.NotFound(new { message = "Attendance record not found." });

            if (record.User?.SupervisorId != supervisorId.Value)
            {
                return Results.Forbid();
            }

            if (req.TimeIn.HasValue) record.TimeIn = req.TimeIn.Value;
            if (req.TimeOut.HasValue) record.TimeOut = req.TimeOut.Value;
            if (req.NetRenderedHours.HasValue) record.NetRenderedHours = req.NetRenderedHours.Value;
            if (req.IsVerified.HasValue)
            {
                record.IsVerified = req.IsVerified.Value;
                if (req.IsVerified.Value)
                {
                    record.VerifiedAt = DateTimeOffset.UtcNow;
                    record.VerifiedBySupervisorId = supervisorId.Value;
                }
            }
            if (!string.IsNullOrWhiteSpace(req.SupervisorRemark))
            {
                record.SupervisorRemark = req.SupervisorRemark.Trim();
            }

            await db.SaveChangesAsync();

            return Results.Ok(new { message = "Attendance record updated successfully.", recordId = record.Id });
        })
        .RequireAuthorization(policy => policy.RequireRole("Supervisor"))
        .WithName("UpdateAttendanceRecord")
        .WithTags("Supervisor");

        group.MapDelete("/attendance/{recordId:guid}", async (Guid recordId, ClaimsPrincipal principal, OJTHubDbContext db) =>
        {
            var supervisorId = GetUserId(principal);
            if (supervisorId == null) return Results.Unauthorized();

            var record = await db.AttendanceRecords
                .Include(a => a.User)
                .Include(a => a.PerimeterLogs)
                .FirstOrDefaultAsync(a => a.Id == recordId);

            if (record == null) return Results.NotFound(new { message = "Attendance record not found." });

            if (record.User?.SupervisorId != supervisorId.Value)
            {
                return Results.Forbid();
            }

            db.AttendanceRecords.Remove(record);
            await db.SaveChangesAsync();

            return Results.Ok(new { message = "Attendance record removed successfully." });
        })
        .RequireAuthorization(policy => policy.RequireRole("Supervisor"))
        .WithName("DeleteAttendanceRecord")
        .WithTags("Supervisor");

        return group;
    }

    private static Guid? GetUserId(ClaimsPrincipal principal)
    {
        var claim = principal.FindFirst("userId")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
