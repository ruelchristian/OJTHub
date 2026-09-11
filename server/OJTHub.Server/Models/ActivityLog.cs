using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OJTHub.Server.Models;

public class ActivityLog
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }

    [Required]
    public DateOnly Date { get; set; }

    [Required]
    [MaxLength(150)]
    public string TaskTitle { get; set; } = string.Empty;

    [Required]
    public string Details { get; set; } = string.Empty;

    [Column(TypeName = "decimal(3,1)")]
    public decimal? HoursSpent { get; set; }

    [MaxLength(50)]
    public string Category { get; set; } = "General"; // Development, Testing, Documentation, Meeting, etc.

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
