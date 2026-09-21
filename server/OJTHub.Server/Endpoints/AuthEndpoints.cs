using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using OJTHub.Server.Data;
using OJTHub.Server.DTOs;
using OJTHub.Server.Models;
using OJTHub.Server.Services;

namespace OJTHub.Server.Endpoints;

public static class AuthEndpoints
{
    public static RouteGroupBuilder MapAuthEndpoints(this RouteGroupBuilder group)
    {
        group.MapPost("/register", async (RegisterRequest req, OJTHubDbContext db, ITokenService tokenService) =>
        {
            if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password) || string.IsNullOrWhiteSpace(req.FullName))
            {
                return Results.BadRequest(new { message = "Email, password, and full name are required." });
            }

            var emailNormalized = req.Email.Trim().ToLowerInvariant();
            if (await db.Users.AnyAsync(u => u.Email == emailNormalized))
            {
                return Results.Conflict(new { message = "A user with this email already exists." });
            }

            var role = string.Equals(req.Role, "Supervisor", StringComparison.OrdinalIgnoreCase) ? "Supervisor" : "Trainee";
            string? supervisorCode = null;
            if (role == "Supervisor")
            {
                supervisorCode = await GenerateUniqueSupervisorCodeAsync(db);
            }

            var user = new User
            {
                Email = emailNormalized,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
                FullName = req.FullName.Trim(),
                StudentId = req.StudentId?.Trim(),
                Role = role,
                SupervisorCode = supervisorCode
            };

            db.Users.Add(user);

            // Automatically generate default OJT settings for Trainees
            if (user.Role == "Trainee")
            {
                var defaultSetting = new OjtSetting
                {
                    UserId = user.Id,
                    CompanyName = "Host Training Establishment",
                    WorkplaceLatitude = 14.599512m,
                    WorkplaceLongitude = 120.984222m,
                    GeofenceRadiusMeters = 100,
                    GpsAccuracyThreshold = 150,
                    TargetTotalHours = 486.0m,
                    DailyScheduleHours = 8.0m,
                    DefaultLunchMinutes = 60
                };
                db.OjtSettings.Add(defaultSetting);
            }

            await db.SaveChangesAsync();

            var token = tokenService.GenerateToken(user);
            var userDto = BuildUserDto(user);

            return Results.Ok(new AuthResponse(token, userDto));
        })
        .WithName("RegisterUser")
        .WithTags("Auth")
        .WithDescription("Registers a new Trainee or Supervisor user");

        group.MapPost("/login", async (LoginRequest req, OJTHubDbContext db, ITokenService tokenService) =>
        {
            if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
            {
                return Results.BadRequest(new { message = "Email and password are required." });
            }

            var emailNormalized = req.Email.Trim().ToLowerInvariant();
            var user = await db.Users
                .Include(u => u.Supervisor)
                .FirstOrDefaultAsync(u => u.Email == emailNormalized);

            if (user == null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            {
                return Results.Unauthorized();
            }

            // Ensure existing supervisors have an invite code
            if (user.Role == "Supervisor" && string.IsNullOrEmpty(user.SupervisorCode))
            {
                user.SupervisorCode = await GenerateUniqueSupervisorCodeAsync(db);
                await db.SaveChangesAsync();
            }

            var token = tokenService.GenerateToken(user);
            var userDto = BuildUserDto(user);

            return Results.Ok(new AuthResponse(token, userDto));
        })
        .WithName("LoginUser")
        .WithTags("Auth")
        .WithDescription("Authenticates user and returns JWT token");

        group.MapGet("/me", async (ClaimsPrincipal principal, OJTHubDbContext db) =>
        {
            var userIdClaim = principal.FindFirst("userId")?.Value;
            if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Results.Unauthorized();
            }

            var user = await db.Users
                .Include(u => u.Supervisor)
                .FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return Results.NotFound();

            // Ensure supervisors always have an invite code available
            if (user.Role == "Supervisor" && string.IsNullOrEmpty(user.SupervisorCode))
            {
                user.SupervisorCode = await GenerateUniqueSupervisorCodeAsync(db);
                await db.SaveChangesAsync();
            }

            return Results.Ok(BuildUserDto(user));
        })
        .RequireAuthorization()
        .WithName("GetCurrentUser")
        .WithTags("Auth")
        .WithDescription("Returns authenticated user profile");

        return group;
    }

    private static UserDto BuildUserDto(User user) =>
        new(
            user.Id,
            user.Email,
            user.FullName,
            user.StudentId,
            user.Role,
            user.SupervisorCode,
            user.SupervisorId,
            user.Supervisor?.FullName
        );

    private static async Task<string> GenerateUniqueSupervisorCodeAsync(OJTHubDbContext db)
    {
        string code;
        do
        {
            code = SupervisorCodeGenerator.GenerateCode();
        } while (await db.Users.AnyAsync(u => u.SupervisorCode == code));

        return code;
    }
}
