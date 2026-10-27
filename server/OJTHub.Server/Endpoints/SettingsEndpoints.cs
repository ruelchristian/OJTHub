using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using OJTHub.Server.Data;
using OJTHub.Server.DTOs;
using OJTHub.Server.Models;

namespace OJTHub.Server.Endpoints;

public static class SettingsEndpoints
{
    public static RouteGroupBuilder MapSettingsEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (ClaimsPrincipal principal, OJTHubDbContext db) =>
        {
            var userId = GetUserId(principal);
            if (userId == null) return Results.Unauthorized();

            var user = await db.Users
                .Include(u => u.Supervisor)
                .FirstOrDefaultAsync(u => u.Id == userId.Value);

            // If trainee is linked to a supervisor, use trainee's specific workplace establishment & supervisor's governance policies
            if (user != null && user.Role == "Trainee" && user.SupervisorId != null)
            {
                var traineeSetting = await db.OjtSettings.FirstOrDefaultAsync(s => s.UserId == userId.Value);
                var supervisorSetting = await db.OjtSettings.FirstOrDefaultAsync(s => s.UserId == user.SupervisorId.Value);

                var companyName = traineeSetting?.CompanyName ?? supervisorSetting?.CompanyName ?? "Partner Host Establishment";
                var companyAddress = traineeSetting?.CompanyAddress ?? supervisorSetting?.CompanyAddress ?? "Julia Vargas Ave, Ortigas Center, Pasig, Metro Manila";
                var lat = traineeSetting?.WorkplaceLatitude ?? supervisorSetting?.WorkplaceLatitude ?? 14.583916m;
                var lng = traineeSetting?.WorkplaceLongitude ?? supervisorSetting?.WorkplaceLongitude ?? 121.063291m;
                var radius = traineeSetting?.GeofenceRadiusMeters ?? supervisorSetting?.GeofenceRadiusMeters ?? 100;
                var accuracy = supervisorSetting?.GpsAccuracyThreshold ?? traineeSetting?.GpsAccuracyThreshold ?? 250;
                var target = supervisorSetting?.TargetTotalHours ?? traineeSetting?.TargetTotalHours ?? 486.0m;
                var dailyHours = supervisorSetting?.DailyScheduleHours ?? traineeSetting?.DailyScheduleHours ?? 8.0m;
                var maxDaily = supervisorSetting?.MaxDailyHours ?? traineeSetting?.MaxDailyHours ?? 10.0m;
                var lunch = supervisorSetting?.DefaultLunchMinutes ?? traineeSetting?.DefaultLunchMinutes ?? 60;
                var allowWeekend = supervisorSetting?.AllowWeekendPunches ?? traineeSetting?.AllowWeekendPunches ?? false;

                return Results.Ok(new OjtSettingDto(
                    traineeSetting?.Id ?? supervisorSetting?.Id ?? Guid.NewGuid(),
                    companyName,
                    lat,
                    lng,
                    radius,
                    accuracy,
                    target,
                    dailyHours,
                    lunch,
                    true,
                    user.Supervisor?.FullName,
                    user.SupervisorId,
                    maxDaily,
                    allowWeekend,
                    companyAddress
                ));
            }

            var setting = await db.OjtSettings.FirstOrDefaultAsync(s => s.UserId == userId.Value);
            if (setting == null)
            {
                // Create default if missing
                setting = new OjtSetting { UserId = userId.Value, UpdatedAt = DateTimeOffset.UtcNow };
                db.OjtSettings.Add(setting);
                await db.SaveChangesAsync();
            }

            var isLocked = user != null && user.Role == "Trainee" && user.SupervisorId != null;
            var supervisorName = user?.Supervisor?.FullName;

            return Results.Ok(new OjtSettingDto(
                setting.Id,
                setting.CompanyName,
                setting.WorkplaceLatitude,
                setting.WorkplaceLongitude,
                setting.GeofenceRadiusMeters,
                setting.GpsAccuracyThreshold,
                setting.TargetTotalHours,
                setting.DailyScheduleHours,
                setting.DefaultLunchMinutes,
                isLocked,
                supervisorName,
                user?.SupervisorId,
                setting.MaxDailyHours,
                setting.AllowWeekendPunches,
                setting.CompanyAddress
            ));
        })
        .RequireAuthorization()
        .WithName("GetOjtSettings")
        .WithTags("Settings");

        group.MapPut("/", async (UpdateOjtSettingRequest req, ClaimsPrincipal principal, OJTHubDbContext db) =>
        {
            var userId = GetUserId(principal);
            if (userId == null) return Results.Unauthorized();

            var user = await db.Users
                .Include(u => u.Supervisor)
                .FirstOrDefaultAsync(u => u.Id == userId.Value);

            if (user != null && user.Role == "Trainee")
            {
                var supervisorName = user.Supervisor?.FullName ?? "your instructor / coordinator";
                return Results.BadRequest(new
                {
                    message = $"Workplace coordinates and OJT hours are officially governed by {supervisorName}. Trainees cannot edit workplace settings."
                });
            }

            var setting = await db.OjtSettings.FirstOrDefaultAsync(s => s.UserId == userId.Value);
            if (setting == null)
            {
                setting = new OjtSetting { UserId = userId.Value };
                db.OjtSettings.Add(setting);
            }

            setting.CompanyName = req.CompanyName?.Trim() ?? setting.CompanyName;
            if (!string.IsNullOrWhiteSpace(req.CompanyAddress))
            {
                setting.CompanyAddress = req.CompanyAddress.Trim();
            }
            setting.WorkplaceLatitude = req.WorkplaceLatitude;
            setting.WorkplaceLongitude = req.WorkplaceLongitude;
            setting.GeofenceRadiusMeters = req.GeofenceRadiusMeters > 0 ? req.GeofenceRadiusMeters : 100;
            setting.GpsAccuracyThreshold = req.GpsAccuracyThreshold > 0 ? req.GpsAccuracyThreshold : 250;
            setting.TargetTotalHours = req.TargetTotalHours > 0 ? req.TargetTotalHours : 486.0m;
            setting.DailyScheduleHours = req.DailyScheduleHours > 0 ? req.DailyScheduleHours : 8.0m;
            setting.MaxDailyHours = req.MaxDailyHours > 0 ? req.MaxDailyHours : 10.0m;
            setting.AllowWeekendPunches = req.AllowWeekendPunches;
            setting.DefaultLunchMinutes = req.DefaultLunchMinutes >= 0 ? req.DefaultLunchMinutes : 60;
            setting.UpdatedAt = DateTimeOffset.UtcNow;

            // When a Supervisor updates institutional OJT settings, broadcast class policy rules to all linked trainees.
            // Only overwrite workplace coordinates if explicitly requested (preserving individual trainee internship locations).
            if (user != null && user.Role == "Supervisor")
            {
                var trainees = await db.Users
                    .Include(u => u.OjtSetting)
                    .Where(u => u.Role == "Trainee" && u.SupervisorId == user.Id)
                    .ToListAsync();

                foreach (var trainee in trainees)
                {
                    if (trainee.OjtSetting == null)
                    {
                        trainee.OjtSetting = new OjtSetting { UserId = trainee.Id };
                        db.OjtSettings.Add(trainee.OjtSetting);
                    }

                    if (req.OverwriteWorkplaceLocation)
                    {
                        trainee.OjtSetting.CompanyName = setting.CompanyName;
                        trainee.OjtSetting.CompanyAddress = setting.CompanyAddress;
                        trainee.OjtSetting.WorkplaceLatitude = setting.WorkplaceLatitude;
                        trainee.OjtSetting.WorkplaceLongitude = setting.WorkplaceLongitude;
                        trainee.OjtSetting.GeofenceRadiusMeters = setting.GeofenceRadiusMeters;
                    }

                    trainee.OjtSetting.GpsAccuracyThreshold = setting.GpsAccuracyThreshold;
                    trainee.OjtSetting.TargetTotalHours = setting.TargetTotalHours;
                    trainee.OjtSetting.DailyScheduleHours = setting.DailyScheduleHours;
                    trainee.OjtSetting.MaxDailyHours = setting.MaxDailyHours;
                    trainee.OjtSetting.AllowWeekendPunches = setting.AllowWeekendPunches;
                    trainee.OjtSetting.DefaultLunchMinutes = setting.DefaultLunchMinutes;
                    trainee.OjtSetting.UpdatedAt = DateTimeOffset.UtcNow;
                }
            }

            await db.SaveChangesAsync();

            return Results.Ok(new OjtSettingDto(
                setting.Id,
                setting.CompanyName,
                setting.WorkplaceLatitude,
                setting.WorkplaceLongitude,
                setting.GeofenceRadiusMeters,
                setting.GpsAccuracyThreshold,
                setting.TargetTotalHours,
                setting.DailyScheduleHours,
                setting.DefaultLunchMinutes,
                false,
                null,
                null,
                setting.MaxDailyHours,
                setting.AllowWeekendPunches,
                setting.CompanyAddress
            ));
        })
        .RequireAuthorization()
        .WithName("UpdateOjtSettings")
        .WithTags("Settings");

        return group;
    }

    private static Guid? GetUserId(ClaimsPrincipal principal)
    {
        var claim = principal.FindFirst("userId")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
