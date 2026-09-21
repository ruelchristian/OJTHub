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
                        await db.Database.MigrateAsync();
                        logger.LogInformation("EF Core migrations applied successfully.");
                    }
                    else
                    {
                        logger.LogInformation("Database schema is up to date. No pending migrations.");
                    }
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
                ");

                logger.LogInformation("Successfully bridged legacy EnsureCreated schema to EF Core migration history.");
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Bridge check encountered non-fatal notice (database may be fresh or uninitialized): {Message}", ex.Message);
        }
    }
}
