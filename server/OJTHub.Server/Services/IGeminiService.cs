using OJTHub.Server.Models;

namespace OJTHub.Server.Services;

public interface IGeminiService
{
    Task<string> GenerateReportAsync(string reportType, IEnumerable<ActivityLog> activities, string? customNotes, CancellationToken ct = default);
    Task<string> PolishTaskNarrativeAsync(string taskTitle, string? details, string? category, string? purpose = "journal", CancellationToken ct = default);
    Task<string> PolishReportContentAsync(string reportType, string content, CancellationToken ct = default);
}

