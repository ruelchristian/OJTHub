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

            if (user != null && user.Role == "Trainee" && user.SupervisorId != null)
            {
                var supervisorName = user.Supervisor?.FullName ?? "your supervisor";
                return Results.BadRequest(new
                {
                    message = $"Configuration is managed and locked by {supervisorName}. Please contact your supervisor to update your assigned workplace location or hours."
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
