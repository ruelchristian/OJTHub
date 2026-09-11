using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using OJTHub.Server.Data;
using OJTHub.Server.DTOs;
using OJTHub.Server.Models;

namespace OJTHub.Server.Endpoints;

public static class SupervisorEndpoints
{
    public record VerifyAttendanceRequest(
        Guid AttendanceRecordId,
        string? Remark
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
        int PendingVerificationCount
    );

    public static RouteGroupBuilder MapSupervisorEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/trainees", async (ClaimsPrincipal principal, OJTHubDbContext db) =>
        {
            var trainees = await db.Users
                .Include(u => u.OjtSetting)
                .Include(u => u.AttendanceRecords)
                .Where(u => u.Role == "Trainee")
                .OrderBy(u => u.FullName)
                .ToListAsync();

            var dtos = trainees.Select(t =>
            {
                var target = t.OjtSetting?.TargetTotalHours ?? 486.0m;
                var rendered = t.AttendanceRecords.Where(a => a.NetRenderedHours != null).Sum(a => a.NetRenderedHours ?? 0m);
                var pct = target > 0 ? Math.Min(100m, Math.Round((rendered / target) * 100m, 1)) : 0m;
                var pending = t.AttendanceRecords.Count(a => a.TimeOut != null && !a.IsVerified);

                return new TraineeSummaryDto(
                    t.Id,
                    t.FullName,
                    t.Email,
                    t.StudentId,
                    t.OjtSetting?.CompanyName ?? "Host Establishment",
                    target,
                    rendered,
                    pct,
                    pending
                );
            }).ToList();

            return Results.Ok(dtos);
        })
        .RequireAuthorization(policy => policy.RequireRole("Supervisor"))
        .WithName("GetTrainees")
        .WithTags("Supervisor");

        group.MapGet("/trainees/{traineeId:guid}/attendance", async (Guid traineeId, int? month, int? year, ClaimsPrincipal principal, OJTHubDbContext db) =>
        {
            var trainee = await db.Users.FindAsync(traineeId);
            if (trainee == null) return Results.NotFound();

            var query = db.AttendanceRecords
                .Include(a => a.User)
                .Where(a => a.UserId == traineeId);

            if (year.HasValue) query = query.Where(a => a.Date.Year == year.Value);
            if (month.HasValue) query = query.Where(a => a.Date.Month == month.Value);

            var records = await query
                .OrderByDescending(a => a.Date)
                .ThenByDescending(a => a.TimeIn)
                .ToListAsync();

            var dtos = records.Select(r => new AttendanceRecordDto(
                r.Id, r.UserId, trainee.FullName, r.Date, r.TimeIn,
                r.TimeInLatitude, r.TimeInLongitude, r.TimeInDistance, r.TimeInGpsAccuracy, r.TimeInWithinGeofence,
                r.TimeOut, r.TimeOutLatitude, r.TimeOutLongitude, r.TimeOutDistance, r.TimeOutGpsAccuracy, r.TimeOutWithinGeofence,
                r.LunchBreakMinutes, r.NetRenderedHours, r.IsVerified, r.VerifiedAt, r.SupervisorRemark
            )).ToList();

            return Results.Ok(dtos);
        })
        .RequireAuthorization(policy => policy.RequireRole("Supervisor"))
        .WithName("GetTraineeAttendance")
        .WithTags("Supervisor");

        group.MapPost("/verify", async (VerifyAttendanceRequest req, ClaimsPrincipal principal, OJTHubDbContext db) =>
        {
            var supervisorId = GetUserId(principal);
            if (supervisorId == null) return Results.Unauthorized();

            var record = await db.AttendanceRecords.FindAsync(req.AttendanceRecordId);
            if (record == null) return Results.NotFound();

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

        return group;
    }

    private static Guid? GetUserId(ClaimsPrincipal principal)
    {
        var claim = principal.FindFirst("userId")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
