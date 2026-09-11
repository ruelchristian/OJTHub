using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OJTHub.Server.Models;

public class User
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(150)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    public string PasswordHash { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? StudentId { get; set; }

    [Required]
    [MaxLength(20)]
    public string Role { get; set; } = "Trainee"; // "Trainee" or "Supervisor"

    public Guid? SupervisorId { get; set; }

    [ForeignKey(nameof(SupervisorId))]
    public User? Supervisor { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    // Navigation properties
    public OjtSetting? OjtSetting { get; set; }
    public ICollection<AttendanceRecord> AttendanceRecords { get; set; } = new List<AttendanceRecord>();
    public ICollection<ActivityLog> ActivityLogs { get; set; } = new List<ActivityLog>();
    public ICollection<GeneratedReport> GeneratedReports { get; set; } = new List<GeneratedReport>();
}
