using Microsoft.Extensions.Configuration;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using OJTHub.Server.Models;
using OJTHub.Server.Services;

namespace OJTHub.Tests;

[TestClass]
public class TokenServiceTests
{
    private TokenService _tokenService = null!;

    [TestInitialize]
    public void Setup()
    {
        var inMemorySettings = new Dictionary<string, string?>
        {
            { "Jwt:SecretKey", "TestSecretKeyThatIsAtLeast32BytesLongForHmacSha256!" },
            { "Jwt:Issuer", "TestIssuer" },
            { "Jwt:Audience", "TestAudience" }
        };

        IConfiguration config = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        _tokenService = new TokenService(config);
    }

    [TestMethod]
    public void GenerateToken_ValidUser_ReturnsNonEmptyJwtString()
    {
        // Arrange
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "trainee@ojthub.local",
            FullName = "Maria Santos",
            Role = "Trainee"
        };

        // Act
        var token = _tokenService.GenerateToken(user);

        // Assert
        Assert.IsFalse(string.IsNullOrWhiteSpace(token), "Generated JWT token must not be null or whitespace.");
        Assert.HasCount(3, token.Split('.'), "JWT token must contain 3 dot-separated segments (header, payload, signature).");
    }
}
