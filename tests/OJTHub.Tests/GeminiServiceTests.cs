using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using OJTHub.Server.Services;

namespace OJTHub.Tests;

[TestClass]
public class GeminiServiceTests
{
    [TestMethod]
    public async Task PolishTaskNarrativeAsync_NoApiKey_ReturnsFallbackHumanNarrative()
    {
        // Arrange
        var inMemorySettings = new Dictionary<string, string?>
        {
            {"Gemini:ApiKey", ""} // No API key configured
        };

        IConfiguration configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var httpClient = new HttpClient();
        var logger = NullLogger<GeminiService>.Instance;
        var service = new GeminiService(httpClient, configuration, logger);

        // Act
        var result = await service.PolishTaskNarrativeAsync(
            taskTitle: "Fixed login error",
            details: "found null reference when user submits empty password",
            category: "Development"
        );

        // Assert
        Assert.IsFalse(string.IsNullOrWhiteSpace(result), "Polished narrative should not be empty");
        StringAssert.Contains(result, "Worked on fixed login error", "Polished text should use natural human phrasing");
        StringAssert.Contains(result, "found null reference", "Polished text should preserve the core technical context");
        StringAssert.DoesNotMatch(result, new System.Text.RegularExpressions.Regex("Spearheaded"), "Should not use corporate buzzwords like Spearheaded");
        StringAssert.DoesNotMatch(result, new System.Text.RegularExpressions.Regex("operational deliverables"), "Should not use robotic corporate phrases");
    }

    [TestMethod]
    public async Task PolishTaskNarrativeAsync_EmptyDetails_GeneratesFromTitleAndCategory()
    {
        // Arrange
        var inMemorySettings = new Dictionary<string, string?>
        {
            {"Gemini:ApiKey", ""}
        };

        IConfiguration configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var httpClient = new HttpClient();
        var logger = NullLogger<GeminiService>.Instance;
        var service = new GeminiService(httpClient, configuration, logger);

        // Act
        var result = await service.PolishTaskNarrativeAsync(
            taskTitle: "Database schema migration",
            details: "",
            category: "Database"
        );

        // Assert
        Assert.IsFalse(string.IsNullOrWhiteSpace(result));
        StringAssert.Contains(result, "database schema migration");
        StringAssert.Contains(result, "database");
    }

    [TestMethod]
    public async Task PolishTaskNarrativeAsync_DailyReportPurpose_ReturnsStructuredReportFormat()
    {
        // Arrange
        var inMemorySettings = new Dictionary<string, string?>
        {
            {"Gemini:ApiKey", ""}
        };

        IConfiguration configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var httpClient = new HttpClient();
        var logger = NullLogger<GeminiService>.Instance;
        var service = new GeminiService(httpClient, configuration, logger);

        // Act
        var result = await service.PolishTaskNarrativeAsync(
            taskTitle: "Updated profile photo upload API",
            details: "added mime type validation and max file size check",
            category: "Development",
            purpose: "daily_report"
        );

        // Assert
        Assert.IsFalse(string.IsNullOrWhiteSpace(result));
        StringAssert.Contains(result, "• Task: Updated profile photo upload API");
        StringAssert.Contains(result, "• Progress: added mime type validation and max file size check");
        StringAssert.Contains(result, "• Status: Completed");
        StringAssert.DoesNotMatch(result, new System.Text.RegularExpressions.Regex("Spearheaded"), "Should not use corporate jargon");
    }

    [TestMethod]
    public async Task PolishReportContentAsync_NoApiKey_ReturnsContentCleanly()
    {
        // Arrange
        var inMemorySettings = new Dictionary<string, string?>
        {
            {"Gemini:ApiKey", ""}
        };

        IConfiguration configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var httpClient = new HttpClient();
        var logger = NullLogger<GeminiService>.Instance;
        var service = new GeminiService(httpClient, configuration, logger);

        var draft = "### ✅ Completed Tasks Today\n- Fixed button error\n";

        // Act
        var result = await service.PolishReportContentAsync("EOD_Standup", draft);

        // Assert
        Assert.AreEqual(draft, result);
    }

    [TestMethod]
    public async Task GenerateMilestoneSummaryAsync_NoApiKey_ReturnsStructuredMilestoneReport()
    {
        // Arrange
        var inMemorySettings = new Dictionary<string, string?>
        {
            {"Gemini:ApiKey", ""}
        };

        IConfiguration configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var httpClient = new HttpClient();
        var logger = NullLogger<GeminiService>.Instance;
        var service = new GeminiService(httpClient, configuration, logger);

        var activities = new List<OJTHub.Server.Models.ActivityLog>
        {
            new()
            {
                TaskTitle = "Database optimization",
                Category = "Development",
                Details = "Indexed foreign keys and verified query performance.",
                HoursSpent = 8.0m,
                Date = DateOnly.FromDateTime(DateTime.UtcNow)
            }
        };

        // Act
        var result = await service.GenerateMilestoneSummaryAsync(100, activities, "Alex Intern");

        // Assert
        Assert.IsFalse(string.IsNullOrWhiteSpace(result));
        StringAssert.Contains(result, "100-Hour OJT Practicum Milestone Summary");
        StringAssert.Contains(result, "Alex Intern");
        StringAssert.Contains(result, "Database optimization");
        StringAssert.DoesNotMatch(result, new System.Text.RegularExpressions.Regex("Spearheaded"), "Should not contain buzzwords");
    }
}
