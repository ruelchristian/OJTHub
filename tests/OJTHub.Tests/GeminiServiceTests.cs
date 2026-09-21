using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using OJTHub.Server.Services;

namespace OJTHub.Tests;

[TestClass]
public class GeminiServiceTests
{
    [TestMethod]
    public async Task PolishTaskNarrativeAsync_NoApiKey_ReturnsFallbackCompetencyNarrative()
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
        StringAssert.Contains(result, "Spearheaded fixed login error", "Polished text should elevate the task title with action verbs");
        StringAssert.Contains(result, "found null reference", "Polished text should preserve the core technical context");
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
}
