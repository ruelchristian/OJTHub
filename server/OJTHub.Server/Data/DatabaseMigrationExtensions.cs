using Microsoft.EntityFrameworkCore;

namespace OJTHub.Server.Data;

public static class DatabaseMigrationExtensions
{
    public static async Task ApplyDatabaseMigrationsAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<OJTHubDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

        for (int attempt = 1; attempt <= 10; attempt++)
        {
            try
            {
                logger.LogInformation("Attempting database migration verification (attempt {Attempt}/10)...", attempt);

                if (db.Database.ProviderName == "Npgsql.EntityFrameworkCore.PostgreSQL")
                {
                    // Check if database was originally initialized via EnsureCreated() before migrations were adopted
                    await BridgeEnsureCreatedToMigrationsAsync(db, logger);

                    // Apply any pending migrations
                    var pendingMigrations = (await db.Database.GetPendingMigrationsAsync()).ToList();
                    if (pendingMigrations.Count > 0)
                    {
                        logger.LogInformation("Applying {Count} pending EF Core migration(s): {Migrations}",
                            pendingMigrations.Count, string.Join(", ", pendingMigrations));
                        try
                        {
                            await db.Database.MigrateAsync();
                            logger.LogInformation("EF Core migrations applied successfully.");
                        }
                        catch (Exception migEx)
                        {
                            logger.LogWarning(migEx, "Direct migration notice: {Message}. Ensuring tables via EnsureCreated...", migEx.Message);
                            await db.Database.EnsureCreatedAsync();
                        }
                    }
                    else
                    {
                        logger.LogInformation("Database schema is up to date. No pending migrations.");
                    }

                    await EnsurePerimeterLogsSchemaAsync(db, logger);
                    await EnsureSchoolSchemaAndSampleDataAsync(db, logger);
                }
                else
                {
                    // Local SQLite or in-memory provider
                    logger.LogInformation("Non-PostgreSQL provider active ({Provider}): initializing schema...", db.Database.ProviderName);
                    await db.Database.EnsureCreatedAsync();
                }

                logger.LogInformation("Database connection and schema initialization verified successfully.");
                break;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Database migration attempt {Attempt} failed. Retrying in 3 seconds...", attempt);
                if (attempt == 10)
                {
                    logger.LogError(ex, "Could not complete database migration after 10 attempts. Continuing web server startup.");
                }
                else
                {
                    await Task.Delay(3000);
                }
            }
        }
    }

    private static async Task BridgeEnsureCreatedToMigrationsAsync(OJTHubDbContext db, ILogger logger)
    {
        try
        {
            // Check if Users table already exists from legacy EnsureCreated()
            var usersTableExists = false;
            using (var command = db.Database.GetDbConnection().CreateCommand())
            {
                await db.Database.OpenConnectionAsync();
                command.CommandText = "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Users');";
                var result = await command.ExecuteScalarAsync();
                usersTableExists = result is bool b && b;
            }

            if (usersTableExists)
            {
                // Ensure __EFMigrationsHistory table exists
                await db.Database.ExecuteSqlRawAsync(@"
                    CREATE TABLE IF NOT EXISTS ""__EFMigrationsHistory"" (
                        ""MigrationId"" character varying(150) NOT NULL,
                        ""ProductVersion"" character varying(32) NOT NULL,
                        CONSTRAINT ""PK___EFMigrationsHistory"" PRIMARY KEY (""MigrationId"")
                    );
                ");

                // Record InitialCreate as applied if not already present
                await db.Database.ExecuteSqlRawAsync(@"
                    INSERT INTO ""__EFMigrationsHistory"" (""MigrationId"", ""ProductVersion"")
                    VALUES ('20260921135037_InitialCreate', '10.0.12')
                    ON CONFLICT (""MigrationId"") DO NOTHING;
                ");

                // Ensure columns added in Phase 1 exist on legacy tables
                await db.Database.ExecuteSqlRawAsync(@"
                    ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS ""SupervisorCode"" character varying(20);
                    CREATE UNIQUE INDEX IF NOT EXISTS ""IX_Users_SupervisorCode"" ON ""Users"" (""SupervisorCode"");
                    ALTER TABLE ""AttendanceRecords"" ADD COLUMN IF NOT EXISTS ""PerimeterBreachCount"" integer NOT NULL DEFAULT 0;

                    CREATE TABLE IF NOT EXISTS ""PerimeterLogs"" (
                        ""Id"" uuid NOT NULL,
                        ""AttendanceRecordId"" uuid NOT NULL,
                        ""UserId"" uuid NOT NULL,
                        ""Timestamp"" timestamp with time zone NOT NULL,
                        ""EventType"" character varying(50) NOT NULL,
                        ""Latitude"" numeric(9,6) NOT NULL,
                        ""Longitude"" numeric(9,6) NOT NULL,
                        ""DistanceMeters"" numeric(6,1) NOT NULL,
                        ""GpsAccuracy"" numeric(5,1) NOT NULL,
                        ""Note"" character varying(255) NULL,
                        CONSTRAINT ""PK_PerimeterLogs"" PRIMARY KEY (""Id""),
                        CONSTRAINT ""FK_PerimeterLogs_AttendanceRecords_AttendanceRecordId"" FOREIGN KEY (""AttendanceRecordId"") REFERENCES ""AttendanceRecords"" (""Id"") ON DELETE CASCADE
                    );
                    CREATE INDEX IF NOT EXISTS ""IX_PerimeterLogs_AttendanceRecordId"" ON ""PerimeterLogs"" (""AttendanceRecordId"");
                    CREATE INDEX IF NOT EXISTS ""IX_PerimeterLogs_UserId"" ON ""PerimeterLogs"" (""UserId"");
                ");

                logger.LogInformation("Successfully bridged legacy EnsureCreated schema to EF Core migration history.");
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Bridge check encountered non-fatal notice (database may be fresh or uninitialized): {Message}", ex.Message);
        }
    }

    private static async Task EnsurePerimeterLogsSchemaAsync(OJTHubDbContext db, ILogger logger)
    {
        try
        {
            await db.Database.ExecuteSqlRawAsync(@"
                ALTER TABLE ""AttendanceRecords"" ADD COLUMN IF NOT EXISTS ""PerimeterBreachCount"" integer NOT NULL DEFAULT 0;

                CREATE TABLE IF NOT EXISTS ""PerimeterLogs"" (
                    ""Id"" uuid NOT NULL,
                    ""AttendanceRecordId"" uuid NOT NULL,
                    ""UserId"" uuid NOT NULL,
                    ""Timestamp"" timestamp with time zone NOT NULL,
                    ""EventType"" character varying(50) NOT NULL,
                    ""Latitude"" numeric(9,6) NOT NULL,
                    ""Longitude"" numeric(9,6) NOT NULL,
                    ""DistanceMeters"" numeric(6,1) NOT NULL,
                    ""GpsAccuracy"" numeric(5,1) NOT NULL,
                    ""Note"" character varying(255) NULL,
                    CONSTRAINT ""PK_PerimeterLogs"" PRIMARY KEY (""Id""),
                    CONSTRAINT ""FK_PerimeterLogs_AttendanceRecords_AttendanceRecordId"" FOREIGN KEY (""AttendanceRecordId"") REFERENCES ""AttendanceRecords"" (""Id"") ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS ""IX_PerimeterLogs_AttendanceRecordId"" ON ""PerimeterLogs"" (""AttendanceRecordId"");
                CREATE INDEX IF NOT EXISTS ""IX_PerimeterLogs_UserId"" ON ""PerimeterLogs"" (""UserId"");
            ");
            logger.LogInformation("PerimeterLogs table and columns verified successfully.");
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "PerimeterLogs schema verification notice: {Message}", ex.Message);
        }
    }

    private static async Task EnsureSchoolSchemaAndSampleDataAsync(OJTHubDbContext db, ILogger logger)
    {
        try
        {
            if (db.Database.ProviderName == "Npgsql.EntityFrameworkCore.PostgreSQL")
            {
                await db.Database.ExecuteSqlRawAsync(@"
                    ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS ""SchoolName"" character varying(150);
                    ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS ""Department"" character varying(100);
                ");
            }

            // Seed sample teacher and student accounts if they don't already exist
            var teacherEmail = "teacher@ojthub.com";
            var teacher = await db.Users.FirstOrDefaultAsync(u => u.Email == teacherEmail);
            if (teacher == null)
            {
                teacher = new OJTHub.Server.Models.User
                {
                    Email = teacherEmail,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"),
                    FullName = "Prof. Noel Montecillo",
                    Role = "Supervisor",
                    SchoolName = "ICCT Colleges - College of Computer Studies",
                    Department = "LFCA411M179",
                    SupervisorCode = "ICCT-2026",
                    CreatedAt = DateTimeOffset.UtcNow
                };
                db.Users.Add(teacher);
                await db.SaveChangesAsync();
                logger.LogInformation("Sample Teacher account created: teacher@ojthub.com (Code: ICCT-2026)");
            }
            else
            {
                teacher.SupervisorCode = "ICCT-2026";
                teacher.SchoolName ??= "ICCT Colleges - College of Computer Studies";
                teacher.Department ??= "LFCA411M179";
                await db.SaveChangesAsync();
            }

            var studentEmail = "student@ojthub.com";
            var student = await db.Users.FirstOrDefaultAsync(u => u.Email == studentEmail);
            if (student == null)
            {
                student = new OJTHub.Server.Models.User
                {
                    Email = studentEmail,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"),
                    FullName = "Ruel Christian Umel",
                    StudentId = "2023-10492",
                    Role = "Trainee",
                    SchoolName = "ICCT Colleges - College of Computer Studies",
                    Department = "LFCA411M179",
                    SupervisorId = teacher.Id,
                    CreatedAt = DateTimeOffset.UtcNow
                };
                db.Users.Add(student);
                await db.SaveChangesAsync();
            }

            if (!await db.AttendanceRecords.AnyAsync(a => a.UserId == student.Id))
            {
                var today = DateOnly.FromDateTime(DateTime.UtcNow);
                for (int i = 5; i >= 1; i--)
                {
                    var shiftDate = today.AddDays(-i);
                    var timeIn = new DateTimeOffset(shiftDate.Year, shiftDate.Month, shiftDate.Day, 8, 0, 0, TimeSpan.FromHours(8));
                    var timeOut = timeIn.AddHours(9); // 8:00 AM - 5:00 PM with 1 hr lunch = 8.0 hrs
                    db.AttendanceRecords.Add(new OJTHub.Server.Models.AttendanceRecord
                    {
                        UserId = student.Id,
                        Date = shiftDate,
                        TimeIn = timeIn,
                        TimeInLatitude = 14.599512m,
                        TimeInLongitude = 120.984222m,
                        TimeInDistance = 12.5m,
                        TimeInGpsAccuracy = 15.0m,
                        TimeInWithinGeofence = true,
                        TimeOut = timeOut,
                        TimeOutLatitude = 14.599512m,
                        TimeOutLongitude = 120.984222m,
                        TimeOutDistance = 14.2m,
                        TimeOutGpsAccuracy = 18.0m,
                        TimeOutWithinGeofence = true,
                        LunchBreakMinutes = 60,
                        NetRenderedHours = 8.00m,
                        IsVerified = true,
                        VerifiedAt = DateTimeOffset.UtcNow,
                        VerifiedBySupervisorId = teacher.Id,
                        SupervisorRemark = "Verified on-site shift compliant with geofence perimeter"
                    });

                    db.ActivityLogs.Add(new OJTHub.Server.Models.ActivityLog
                    {
                        UserId = student.Id,
                        Date = shiftDate,
                        TaskTitle = i switch
                        {
                            1 => "Implemented REST API endpoints and data validation",
                            2 => "Configured PostgreSQL database schemas and migrations",
                            3 => "Developed responsive mobile PWA layout with Tailwind CSS",
                            4 => "Conducted GPS geofence boundary testing and accuracy calibration",
                            _ => "Attended internship orientation and workspace setup"
                        },
                        Details = "Successfully completed scheduled sprint tasks under supervisor guidance.",
                        HoursSpent = 8.0m,
                        Category = "Development",
                        CreatedAt = DateTimeOffset.UtcNow
                    });
                }
                await db.SaveChangesAsync();
                logger.LogInformation("Sample attendance shifts and activity logs seeded for student@ojthub.com.");
            }

            // Ensure all existing settings have at least 250m accuracy threshold for desktop/Wi-Fi support
            // and point to One Corporate Centre (OCC)
            var allSettings = await db.OjtSettings.ToListAsync();
            foreach (var s in allSettings)
            {
                if (s.GpsAccuracyThreshold < 250)
                {
                    s.GpsAccuracyThreshold = 250;
                }
                if (s.WorkplaceLatitude == 14.599512m || s.CompanyName.Contains("Partner Host Training"))
                {
                    s.CompanyName = "One Corporate Centre (OCC)";
                    s.WorkplaceLatitude = 14.583916m;
                    s.WorkplaceLongitude = 121.063291m;
                }
            }
            if (db.ChangeTracker.HasChanges())
            {
                await db.SaveChangesAsync();
                logger.LogInformation("Updated OjtSettings to OCC coordinates and 250m GPS accuracy threshold.");
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "School schema or sample data seeding notice: {Message}", ex.Message);
        }
    }
}
