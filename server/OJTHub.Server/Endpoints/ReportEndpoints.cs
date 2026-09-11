using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using OJTHub.Server.Data;
using OJTHub.Server.DTOs;
using OJTHub.Server.Models;
using OJTHub.Server.Services;

namespace OJTHub.Server.Endpoints;

public static class ReportEndpoints
{
    public static RouteGroupBuilder MapReportEndpoints(this RouteGroupBuilder group)
    {
        group.MapPost("/ai-generate", async (GenerateReportRequest req, ClaimsPrincipal principal, OJTHubDbContext db, IGeminiService geminiService, CancellationToken ct) =>
        {
            var userId = GetUserId(principal);
            List<ActivityLog> activities;

            if (userId.HasValue)
            {
                activities = await db.ActivityLogs
                    .Where(a => a.UserId == userId.Value && a.Date >= req.StartDate && a.Date <= req.EndDate)
                    .OrderBy(a => a.Date)
                    .ToListAsync(ct);
            }
            else if (req.GuestActivities != null && req.GuestActivities.Count > 0)
            {
                activities = req.GuestActivities.Select(g => new ActivityLog
                {
                    Id = Guid.NewGuid(),
                    UserId = Guid.Empty,
                    Date = g.Date,
                    TaskTitle = g.TaskTitle,
                    Details = g.Details,
                    HoursSpent = g.HoursSpent,
                    Category = g.Category,
                    CreatedAt = DateTimeOffset.UtcNow
                }).ToList();
            }
            else
            {
                activities = new List<ActivityLog>();
            }

            var draft = await geminiService.GenerateReportAsync(req.ReportType, activities, req.CustomNotes, ct);

            return Results.Ok(new
            {
                reportType = req.ReportType,
                startDate = req.StartDate,
                endDate = req.EndDate,
                draftContent = draft,
                referencedActivitiesCount = activities.Count
            });
        })
        .AllowAnonymous()
        .WithName("GenerateAiReport")
        .WithTags("Reports");

        group.MapPost("/", async (SaveReportRequest req, ClaimsPrincipal principal, OJTHubDbContext db) =>
        {
            var userId = GetUserId(principal);
            if (userId == null) return Results.Unauthorized();

            var report = new GeneratedReport
            {
                UserId = userId.Value,
                ReportType = req.ReportType,
                StartDate = req.StartDate,
                EndDate = req.EndDate,
                AiGeneratedContent = req.FinalContent,
                EditedContent = req.FinalContent,
                CreatedAt = DateTimeOffset.UtcNow
            };

            db.GeneratedReports.Add(report);
            await db.SaveChangesAsync();

            return Results.Ok(new GeneratedReportDto(
                report.Id, report.UserId, report.ReportType, report.StartDate,
                report.EndDate, report.AiGeneratedContent, report.EditedContent, report.CreatedAt
            ));
        })
        .RequireAuthorization()
        .WithName("SaveReport")
        .WithTags("Reports");

        group.MapGet("/", async (string? reportType, ClaimsPrincipal principal, OJTHubDbContext db) =>
        {
            var userId = GetUserId(principal);
            if (userId == null) return Results.Unauthorized();

            var query = db.GeneratedReports.Where(r => r.UserId == userId.Value);
            if (!string.IsNullOrWhiteSpace(reportType))
            {
                query = query.Where(r => r.ReportType == reportType);
            }

            var items = await query
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            var dtos = items.Select(r => new GeneratedReportDto(
                r.Id, r.UserId, r.ReportType, r.StartDate, r.EndDate,
                r.AiGeneratedContent, r.EditedContent, r.CreatedAt
            ));

            return Results.Ok(dtos);
        })
        .RequireAuthorization()
        .WithName("GetReports")
        .WithTags("Reports");

        return group;
    }

    private static Guid? GetUserId(ClaimsPrincipal principal)
    {
        var claim = principal.FindFirst("userId")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
