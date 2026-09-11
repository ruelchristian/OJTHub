using System.Text;
using System.Text.Json;
using OJTHub.Server.Models;

namespace OJTHub.Server.Services;

public class GeminiService : IGeminiService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;
    private readonly ILogger<GeminiService> _logger;

    public GeminiService(HttpClient httpClient, IConfiguration config, ILogger<GeminiService> logger)
    {
        _httpClient = httpClient;
        _config = config;
        _logger = logger;
    }

    public async Task<string> GenerateReportAsync(
        string reportType,
        IEnumerable<ActivityLog> activities,
        string? customNotes,
        CancellationToken ct = default)
    {
        var apiKey = _config["Gemini:ApiKey"] ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY");
        var activityList = activities.ToList();

        // Build the prompt context from student activities
        var sb = new StringBuilder();
        sb.AppendLine($"You are an AI reporting assistant for OJTHub, an on-the-job training management system.");
        sb.AppendLine($"Your task is to synthesize the following student OJT daily activities into a polished, professional {(reportType == "Journal_Narrative" ? "Reflective Journal Narrative" : "Daily End-of-Day (EOD) Standup Report")}.");
        sb.AppendLine("\n### Trainee Activity Records:");

        if (activityList.Count == 0)
        {
            sb.AppendLine("- No specific task entries were recorded for this period.");
        }
        else
        {
            foreach (var act in activityList)
            {
                sb.AppendLine($"- Date: {act.Date:yyyy-MM-dd} | Task: {act.TaskTitle} | Category: {act.Category} | Hours: {act.HoursSpent}h");
                sb.AppendLine($"  Details: {act.Details}");
            }
        }

        if (!string.IsNullOrWhiteSpace(customNotes))
        {
            sb.AppendLine($"\nTrainee's Additional Notes/Context:\n{customNotes}");
        }

        if (reportType == "Journal_Narrative")
        {
            sb.AppendLine("\nPlease generate a formal, reflective OJT journal narrative formatted in clean Markdown. Include sections: Executive Overview, Key Accomplishments & Technical Skills Applied, Challenges Encountered & Resolutions, and Lessons Learned & Professional Development.");
        }
        else
        {
            sb.AppendLine("\nPlease generate a concise, structured Daily End-of-Day (EOD) standup report in clean Markdown. Include: Tasks Completed Today, Blockers/Issues Resolved, and Next Planned Steps.");
        }

        var prompt = sb.ToString();

        // If no API key is provided, return a high-quality structured template
        if (string.IsNullOrWhiteSpace(apiKey) || apiKey == "YOUR_GEMINI_API_KEY")
        {
            _logger.LogWarning("Gemini API key is not configured. Returning fallback synthesized draft.");
            return GenerateFallbackReport(reportType, activityList, customNotes);
        }

        try
        {
            var model = _config["Gemini:Model"] ?? "gemini-1.5-flash";
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";

            var requestPayload = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new[]
                        {
                            new { text = prompt }
                        }
                    }
                }
            };

            var jsonContent = new StringContent(
                JsonSerializer.Serialize(requestPayload),
                Encoding.UTF8,
                "application/json");

            var response = await _httpClient.PostAsync(url, jsonContent, ct);
            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync(ct);
                _logger.LogError("Gemini API error ({StatusCode}): {Error}", response.StatusCode, err);
                return GenerateFallbackReport(reportType, activityList, customNotes);
            }

            var responseJson = await response.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(responseJson);

            var root = doc.RootElement;
            if (root.TryGetProperty("candidates", out var candidates) &&
                candidates.GetArrayLength() > 0 &&
                candidates[0].TryGetProperty("content", out var content) &&
                content.TryGetProperty("parts", out var parts) &&
                parts.GetArrayLength() > 0 &&
                parts[0].TryGetProperty("text", out var textElement))
            {
                return textElement.GetString() ?? GenerateFallbackReport(reportType, activityList, customNotes);
            }

            return GenerateFallbackReport(reportType, activityList, customNotes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to call Gemini API. Falling back to local template.");
            return GenerateFallbackReport(reportType, activityList, customNotes);
        }
    }

    private static string GenerateFallbackReport(string reportType, List<ActivityLog> activities, string? customNotes)
    {
        var sb = new StringBuilder();
        if (reportType == "Journal_Narrative")
        {
            sb.AppendLine("# OJT Narrative Journal Report");
            sb.AppendLine($"**Report Date:** {DateTime.UtcNow:MMMM dd, yyyy}\n");
            sb.AppendLine("## 1. Executive Overview");
            sb.AppendLine("During this training period, on-the-job training objectives focused on practical execution of assigned technical and operational deliverables.\n");
            sb.AppendLine("## 2. Key Accomplishments & Technical Skills Applied");
            foreach (var act in activities)
            {
                sb.AppendLine($"- **{act.TaskTitle}** ({act.Category}): {act.Details}");
            }
            sb.AppendLine("\n## 3. Challenges Encountered & Resolutions");
            sb.AppendLine("- Handled unexpected workflow edge-cases by applying collaborative debugging and adhering to institutional standards.");
            sb.AppendLine("\n## 4. Key Takeaways & Reflection");
            sb.AppendLine("- Gained valuable hands-on experience in workplace workflows, accountability, and time management.");
        }
        else
        {
            sb.AppendLine("# Daily End-of-Day (EOD) Standup Summary");
            sb.AppendLine($"**Date:** {DateTime.UtcNow:MMMM dd, yyyy}\n");
            sb.AppendLine("### ✅ Completed Tasks");
            if (activities.Count == 0)
            {
                sb.AppendLine("- Completed assigned daily workplace duties and documentation.");
            }
            else
            {
                foreach (var act in activities)
                {
                    sb.AppendLine($"- **{act.TaskTitle}**: {act.Details}");
                }
            }
            sb.AppendLine("\n### 🚧 Challenges & Blockers");
            sb.AppendLine("- None reported. Work progressed smoothly.");
            sb.AppendLine("\n### 🎯 Plan for Next Working Day");
            sb.AppendLine("- Continue with scheduled milestones, review open logs, and align with supervisor recommendations.");
        }

        if (!string.IsNullOrWhiteSpace(customNotes))
        {
            sb.AppendLine($"\n### 📝 Trainee Remarks\n{customNotes}");
        }

        return sb.ToString();
    }
}
