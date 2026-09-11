using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OJTHub.Server.Models;

public class GeneratedReport
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }

    [Required]
    [MaxLength(30)]
    public string ReportType { get; set; } = "EOD_Standup"; // "EOD_Standup" or "Journal_Narrative"

    [Required]
    public DateOnly StartDate { get; set; }

    [Required]
    public DateOnly EndDate { get; set; }

    public string? RawPromptData { get; set; }

    [Required]
    public string AiGeneratedContent { get; set; } = string.Empty;

    public string? EditedContent { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
