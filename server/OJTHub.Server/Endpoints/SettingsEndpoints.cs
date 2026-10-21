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

            var setting = await db.OjtSettings.FirstOrDefaultAsync(s => s.UserId == userId.Value);

            // If trainee is linked to a supervisor, keep workplace geofence synchronized with supervisor
            if (user != null && user.Role == "Trainee" && user.SupervisorId != null)
            {
                var supervisorSetting = await db.OjtSettings.FirstOrDefaultAsync(s => s.UserId == user.SupervisorId.Value);
                if (supervisorSetting != null)
                {
                    if (setting == null)
                    {
                        setting = new OjtSetting { UserId = userId.Value };
                        db.OjtSettings.Add(setting);
                    }

                    if (setting.WorkplaceLatitude != supervisorSetting.WorkplaceLatitude ||
                        setting.WorkplaceLongitude != supervisorSetting.WorkplaceLongitude ||
                        setting.GeofenceRadiusMeters != supervisorSetting.GeofenceRadiusMeters ||
                        supervisorSetting.UpdatedAt > setting.UpdatedAt)
                    {
                        setting.CompanyName = supervisorSetting.CompanyName;
                        setting.WorkplaceLatitude = supervisorSetting.WorkplaceLatitude;
                        setting.WorkplaceLongitude = supervisorSetting.WorkplaceLongitude;
                        setting.GeofenceRadiusMeters = supervisorSetting.GeofenceRadiusMeters;
                        setting.GpsAccuracyThreshold = supervisorSetting.GpsAccuracyThreshold;
                        setting.TargetTotalHours = supervisorSetting.TargetTotalHours;
                        setting.DailyScheduleHours = supervisorSetting.DailyScheduleHours;
                        setting.DefaultLunchMinutes = supervisorSetting.DefaultLunchMinutes;
                        setting.UpdatedAt = DateTimeOffset.UtcNow;
                        await db.SaveChangesAsync();
                    }
                }
            }

            if (setting == null)
            {
                // Create default if missing
                setting = new OjtSetting { UserId = userId.Value };
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
                user?.SupervisorId
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
            setting.WorkplaceLatitude = req.WorkplaceLatitude;
            setting.WorkplaceLongitude = req.WorkplaceLongitude;
            setting.GeofenceRadiusMeters = req.GeofenceRadiusMeters > 0 ? req.GeofenceRadiusMeters : 100;
            setting.GpsAccuracyThreshold = req.GpsAccuracyThreshold > 0 ? req.GpsAccuracyThreshold : 50;
            setting.TargetTotalHours = req.TargetTotalHours > 0 ? req.TargetTotalHours : 486.0m;
            setting.DailyScheduleHours = req.DailyScheduleHours > 0 ? req.DailyScheduleHours : 8.0m;
            setting.DefaultLunchMinutes = req.DefaultLunchMinutes >= 0 ? req.DefaultLunchMinutes : 60;
            setting.UpdatedAt = DateTimeOffset.UtcNow;

            // When a Supervisor updates institutional OJT settings, automatically broadcast to all linked trainees!
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

                    trainee.OjtSetting.CompanyName = setting.CompanyName;
                    trainee.OjtSetting.WorkplaceLatitude = setting.WorkplaceLatitude;
                    trainee.OjtSetting.WorkplaceLongitude = setting.WorkplaceLongitude;
                    trainee.OjtSetting.GeofenceRadiusMeters = setting.GeofenceRadiusMeters;
                    trainee.OjtSetting.GpsAccuracyThreshold = setting.GpsAccuracyThreshold;
                    trainee.OjtSetting.TargetTotalHours = setting.TargetTotalHours;
                    trainee.OjtSetting.DailyScheduleHours = setting.DailyScheduleHours;
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
                null
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
