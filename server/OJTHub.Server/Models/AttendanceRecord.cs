using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OJTHub.Server.Models;

public class AttendanceRecord
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }

    [Required]
    public DateOnly Date { get; set; }

    public DateTimeOffset TimeIn { get; set; }

    [Column(TypeName = "decimal(9,6)")]
    public decimal TimeInLatitude { get; set; }

    [Column(TypeName = "decimal(9,6)")]
    public decimal TimeInLongitude { get; set; }

    [Column(TypeName = "decimal(6,1)")]
    public decimal TimeInDistance { get; set; }

    [Column(TypeName = "decimal(5,1)")]
    public decimal TimeInGpsAccuracy { get; set; }

    public bool TimeInWithinGeofence { get; set; }

    public DateTimeOffset? TimeOut { get; set; }

    [Column(TypeName = "decimal(9,6)")]
    public decimal? TimeOutLatitude { get; set; }

    [Column(TypeName = "decimal(9,6)")]
    public decimal? TimeOutLongitude { get; set; }

    [Column(TypeName = "decimal(6,1)")]
    public decimal? TimeOutDistance { get; set; }

    [Column(TypeName = "decimal(5,1)")]
    public decimal? TimeOutGpsAccuracy { get; set; }

    public bool? TimeOutWithinGeofence { get; set; }

    public int LunchBreakMinutes { get; set; } = 60;

    [Column(TypeName = "decimal(4,2)")]
    public decimal? NetRenderedHours { get; set; }

    public bool IsVerified { get; set; } = false;

    public DateTimeOffset? VerifiedAt { get; set; }

    public Guid? VerifiedBySupervisorId { get; set; }

    [ForeignKey(nameof(VerifiedBySupervisorId))]
    public User? VerifiedBySupervisor { get; set; }

    [MaxLength(255)]
    public string? SupervisorRemark { get; set; }

    public int PerimeterBreachCount { get; set; } = 0;

    public List<PerimeterLog> PerimeterLogs { get; set; } = new();
}
