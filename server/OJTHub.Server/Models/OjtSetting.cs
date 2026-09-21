using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OJTHub.Server.Models;

public class OjtSetting
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }

    [Required]
    [MaxLength(150)]
    public string CompanyName { get; set; } = "Partner Host Training Establishment";

    [Column(TypeName = "decimal(9,6)")]
    public decimal WorkplaceLatitude { get; set; } = 14.599512m; // Default reasonable workplace coordinates

    [Column(TypeName = "decimal(9,6)")]
    public decimal WorkplaceLongitude { get; set; } = 120.984222m;

    public int GeofenceRadiusMeters { get; set; } = 100;

    public int GpsAccuracyThreshold { get; set; } = 150;

    [Column(TypeName = "decimal(5,1)")]
    public decimal TargetTotalHours { get; set; } = 486.0m;

    [Column(TypeName = "decimal(4,1)")]
    public decimal DailyScheduleHours { get; set; } = 8.0m;

    public int DefaultLunchMinutes { get; set; } = 60;

    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
