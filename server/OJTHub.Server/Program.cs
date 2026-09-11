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

// Configure Database (PostgreSQL + EF Core per proposal specification)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
                       ?? "Host=localhost;Port=5434;Database=ojthub;Username=postgres;Password=postgres";

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

// Ensure Database Schema Created automatically
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<OJTHubDbContext>();
    db.Database.EnsureCreated();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AllowClient");
app.UseAuthentication();
app.UseAuthorization();

// Map Minimal API Route Groups
app.MapGroup("/api/auth").MapAuthEndpoints();
app.MapGroup("/api/settings").MapSettingsEndpoints();
app.MapGroup("/api/attendance").MapAttendanceEndpoints();
app.MapGroup("/api/activities").MapActivityEndpoints();
app.MapGroup("/api/reports").MapReportEndpoints();
app.MapGroup("/api/supervisor").MapSupervisorEndpoints();

app.MapGet("/", () => Results.Ok(new
{
    system = "OJTHub API Server",
    status = "Online",
    version = "1.0.0",
    docs = "/openapi/v1.json"
}));

app.Run();
