using Microsoft.EntityFrameworkCore;
using OJTHub.Server.Models;

namespace OJTHub.Server.Data;

public class OJTHubDbContext : DbContext
{
    public OJTHubDbContext(DbContextOptions<OJTHubDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<OjtSetting> OjtSettings => Set<OjtSetting>();
    public DbSet<AttendanceRecord> AttendanceRecords => Set<AttendanceRecord>();
    public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();
    public DbSet<GeneratedReport> GeneratedReports => Set<GeneratedReport>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.Email).IsUnique();
            entity.HasIndex(u => u.SupervisorCode).IsUnique();

            entity.HasOne(u => u.Supervisor)
                .WithMany()
                .HasForeignKey(u => u.SupervisorId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(u => u.OjtSetting)
                .WithOne(s => s.User)
                .HasForeignKey<OjtSetting>(s => s.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // AttendanceRecord
        modelBuilder.Entity<AttendanceRecord>(entity =>
        {
            entity.HasIndex(a => new { a.UserId, a.Date });

            entity.HasOne(a => a.User)
                .WithMany(u => u.AttendanceRecords)
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(a => a.VerifiedBySupervisor)
                .WithMany()
                .HasForeignKey(a => a.VerifiedBySupervisorId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // ActivityLog
        modelBuilder.Entity<ActivityLog>(entity =>
        {
            entity.HasIndex(al => new { al.UserId, al.Date });

            entity.HasOne(al => al.User)
                .WithMany(u => u.ActivityLogs)
                .HasForeignKey(al => al.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // GeneratedReport
        modelBuilder.Entity<GeneratedReport>(entity =>
        {
            entity.HasOne(r => r.User)
                .WithMany(u => u.GeneratedReports)
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
