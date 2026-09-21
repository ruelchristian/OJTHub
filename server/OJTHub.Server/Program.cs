using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using OJTHub.Server.Data;
using OJTHub.Server.Endpoints;
using OJTHub.Server.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddOpenApi();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowClient", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173", "https://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Configure PORT for container deployment (Render automatically injects PORT=10000)
var renderPort = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(renderPort))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{renderPort}");
}

// Configure Database (PostgreSQL + EF Core, supporting both ADO.NET and postgresql:// URL formats)
var rawConn = Environment.GetEnvironmentVariable("DATABASE_URL")
              ?? builder.Configuration.GetConnectionString("DefaultConnection") 
              ?? "Host=localhost;Port=5434;Database=ojthub;Username=postgres;Password=postgres";

static string ParseConnectionString(string connStr)
{
    if (connStr.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) || 
        connStr.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
    {
        var uri = new Uri(connStr);
        var userInfo = uri.UserInfo.Split(':');
        var user = Uri.UnescapeDataString(userInfo[0]);
        var pass = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
        var host = uri.Host;
        var port = uri.Port > 0 ? uri.Port : 5432;
        var db = uri.AbsolutePath.TrimStart('/');
        return $"Host={host};Port={port};Database={db};Username={user};Password={pass};SSL Mode=Prefer;Trust Server Certificate=true;";
    }
    return connStr;
}

var connectionString = ParseConnectionString(rawConn);

builder.Services.AddDbContext<OJTHubDbContext>(options =>
{
    options.UseNpgsql(connectionString);
});

// Configure JWT Authentication
var jwtSecretKey = builder.Configuration["Jwt:SecretKey"] ?? "OJTHub_SuperSecret_Jwt_Security_Key_2026_Minimum_32Bytes_Long!";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "OJTHubAPI";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "OJTHubClient";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecretKey))
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("RequireTrainee", policy => policy.RequireRole("Trainee"));
    options.AddPolicy("RequireSupervisor", policy => policy.RequireRole("Supervisor"));
});

// Register Application Services
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IAttendanceService, AttendanceService>();
builder.Services.AddHttpClient<IGeminiService, GeminiService>();

var app = builder.Build();

// Apply EF Core database migrations with resilience and legacy bridge support
await app.ApplyDatabaseMigrationsAsync();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AllowClient");

// Serve frontend static files (React PWA)
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

// Map Minimal API Route Groups
app.MapGroup("/api/auth").MapAuthEndpoints();
app.MapGroup("/api/settings").MapSettingsEndpoints();
app.MapGroup("/api/attendance").MapAttendanceEndpoints();
app.MapGroup("/api/activities").MapActivityEndpoints();
app.MapGroup("/api/reports").MapReportEndpoints();
app.MapGroup("/api/supervisor").MapSupervisorEndpoints();

app.MapGet("/api/health", () => Results.Ok(new
{
    system = "OJTHub API Server",
    status = "Online",
    version = "1.0.0"
}));

// Fallback any client routes to React SPA index.html
app.MapFallbackToFile("index.html");

app.Run();
