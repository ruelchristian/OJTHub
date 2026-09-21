using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OJTHub.Server.Models;

public class PerimeterLog
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid AttendanceRecordId { get; set; }

    [ForeignKey(nameof(AttendanceRecordId))]
    public AttendanceRecord? AttendanceRecord { get; set; }

    [Required]
    public Guid UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }

    public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>
    /// Event type: "Departed" (stepped outside perimeter) or "Returned" (re-entered workplace perimeter).
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string EventType { get; set; } = "Departed";

    [Column(TypeName = "decimal(9,6)")]
    public decimal Latitude { get; set; }

    [Column(TypeName = "decimal(9,6)")]
    public decimal Longitude { get; set; }

    [Column(TypeName = "decimal(6,1)")]
    public decimal DistanceMeters { get; set; }

    [Column(TypeName = "decimal(5,1)")]
    public decimal GpsAccuracy { get; set; }

    [MaxLength(255)]
    public string? Note { get; set; }
}
