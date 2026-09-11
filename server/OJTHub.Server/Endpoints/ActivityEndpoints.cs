using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using OJTHub.Server.Data;
using OJTHub.Server.DTOs;
using OJTHub.Server.Models;

namespace OJTHub.Server.Endpoints;

public static class ActivityEndpoints
{
    public static RouteGroupBuilder MapActivityEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/", async (DateOnly? startDate, DateOnly? endDate, ClaimsPrincipal principal, OJTHubDbContext db) =>
        {
            var userId = GetUserId(principal);
            if (userId == null) return Results.Unauthorized();

            var query = db.ActivityLogs.Where(a => a.UserId == userId.Value);

            if (startDate.HasValue) query = query.Where(a => a.Date >= startDate.Value);
            if (endDate.HasValue) query = query.Where(a => a.Date <= endDate.Value);

            var items = await query
                .OrderByDescending(a => a.Date)
                .ThenByDescending(a => a.CreatedAt)
                .ToListAsync();

            var dtos = items.Select(a => new ActivityLogDto(
                a.Id, a.UserId, a.Date, a.TaskTitle, a.Details, a.HoursSpent, a.Category, a.CreatedAt
            ));

            return Results.Ok(dtos);
        })
        .RequireAuthorization()
        .WithName("GetActivities")
        .WithTags("Activities");

        group.MapPost("/", async (CreateActivityRequest req, ClaimsPrincipal principal, OJTHubDbContext db) =>
        {
            var userId = GetUserId(principal);
            if (userId == null) return Results.Unauthorized();

            if (string.IsNullOrWhiteSpace(req.TaskTitle))
            {
                return Results.BadRequest(new { message = "Task title is required." });
            }

            var activity = new ActivityLog
            {
                UserId = userId.Value,
                Date = req.Date,
                TaskTitle = req.TaskTitle.Trim(),
                Details = req.Details?.Trim() ?? string.Empty,
                HoursSpent = req.HoursSpent,
                Category = string.IsNullOrWhiteSpace(req.Category) ? "General" : req.Category.Trim(),
                CreatedAt = DateTimeOffset.UtcNow
            };

            db.ActivityLogs.Add(activity);
            await db.SaveChangesAsync();

            return Results.Ok(new ActivityLogDto(
                activity.Id, activity.UserId, activity.Date, activity.TaskTitle,
                activity.Details, activity.HoursSpent, activity.Category, activity.CreatedAt
            ));
        })
        .RequireAuthorization()
        .WithName("CreateActivity")
        .WithTags("Activities");

        group.MapPut("/{id:guid}", async (Guid id, UpdateActivityRequest req, ClaimsPrincipal principal, OJTHubDbContext db) =>
        {
            var userId = GetUserId(principal);
            if (userId == null) return Results.Unauthorized();

            var activity = await db.ActivityLogs.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId.Value);
            if (activity == null) return Results.NotFound();

            activity.TaskTitle = req.TaskTitle.Trim();
            activity.Details = req.Details.Trim();
            activity.HoursSpent = req.HoursSpent;
            activity.Category = string.IsNullOrWhiteSpace(req.Category) ? "General" : req.Category.Trim();

            await db.SaveChangesAsync();

            return Results.Ok(new ActivityLogDto(
                activity.Id, activity.UserId, activity.Date, activity.TaskTitle,
                activity.Details, activity.HoursSpent, activity.Category, activity.CreatedAt
            ));
        })
        .RequireAuthorization()
        .WithName("UpdateActivity")
        .WithTags("Activities");

        group.MapDelete("/{id:guid}", async (Guid id, ClaimsPrincipal principal, OJTHubDbContext db) =>
        {
            var userId = GetUserId(principal);
            if (userId == null) return Results.Unauthorized();

            var activity = await db.ActivityLogs.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId.Value);
            if (activity == null) return Results.NotFound();

            db.ActivityLogs.Remove(activity);
            await db.SaveChangesAsync();

            return Results.NoContent();
        })
        .RequireAuthorization()
        .WithName("DeleteActivity")
        .WithTags("Activities");

        return group;
    }

    private static Guid? GetUserId(ClaimsPrincipal principal)
    {
        var claim = principal.FindFirst("userId")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
