using Microsoft.VisualStudio.TestTools.UnitTesting;
using OJTHub.Server.Services;

namespace OJTHub.Tests;

[TestClass]
public class SupervisorCodeTests
{
    [TestMethod]
    public void GenerateCode_ReturnsExpectedFormat()
    {
        // Act
        var code = SupervisorCodeGenerator.GenerateCode();

        // Assert
        Assert.IsNotNull(code);
        Assert.StartsWith("OJT-", code, $"Code '{code}' should start with 'OJT-'");
        Assert.AreEqual(9, code.Length, $"Code '{code}' length should be exactly 9 (OJT- + 5 chars)");
        Assert.IsTrue(SupervisorCodeGenerator.IsValidFormat(code), $"Code '{code}' should be valid according to IsValidFormat");
    }

    [TestMethod]
    public void GenerateCode_MultipleGenerations_ProduceDistinctCodes()
    {
        // Arrange
        var generated = new HashSet<string>();

        // Act
        for (int i = 0; i < 50; i++)
        {
            var code = SupervisorCodeGenerator.GenerateCode();
            generated.Add(code);
        }

        // Assert: 50 randomly generated codes should be unique given the large keyspace
        Assert.HasCount(50, generated, "All 50 generated codes should be unique");
    }

    [TestMethod]
    [DataRow("OJT-ABCDE", true)]
    [DataRow("OJT-8K7MQ", true)]
    [DataRow("ojt-8k7mq", true)] // Normalization handles lowercase
    [DataRow("  OJT-9XYZ2  ", true)] // Normalization handles whitespace
    [DataRow("OJT-12345", false)] // Contains '1' which is excluded to prevent confusion with 'I'
    [DataRow("OJT-0ABCD", false)] // Contains '0' which is excluded to prevent confusion with 'O'
    [DataRow("OJT-ABC", false)] // Too short
    [DataRow("OJT-ABCDEF", false)] // Too long
    [DataRow("XYZ-8K7MQ", false)] // Wrong prefix
    [DataRow("", false)]
    [DataRow(null, false)]
    public void IsValidFormat_ValidatesCodesCorrectly(string? input, bool expectedValid)
    {
        // Act
        var isValid = SupervisorCodeGenerator.IsValidFormat(input);

        // Assert
        Assert.AreEqual(expectedValid, isValid, $"Validity of '{input}' should be {expectedValid}");
    }

    [TestMethod]
    public void NormalizeCode_TrimsAndCapitalizes()
    {
        // Arrange
        var input = "  ojt-7k9wx  ";

        // Act
        var normalized = SupervisorCodeGenerator.NormalizeCode(input);

        // Assert
        Assert.AreEqual("OJT-7K9WX", normalized);
    }
}
