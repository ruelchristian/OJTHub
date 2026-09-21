using System.Text.RegularExpressions;

namespace OJTHub.Server.Services;

public static partial class SupervisorCodeGenerator
{
    public const string AllowedCharacters = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    public const string CodePrefix = "OJT-";
    public const int SuffixLength = 5;

    [GeneratedRegex(@"^OJT-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}$")]
    private static partial Regex CodeFormatRegex();

    private static readonly Random Random = new();

    /// <summary>
    /// Generates a human-readable, unambiguous supervisor invite code (e.g., OJT-8K7MQ).
    /// </summary>
    public static string GenerateCode()
    {
        Span<char> suffix = stackalloc char[SuffixLength];
        lock (Random)
        {
            for (int i = 0; i < SuffixLength; i++)
            {
                suffix[i] = AllowedCharacters[Random.Next(AllowedCharacters.Length)];
            }
        }
        return $"{CodePrefix}{suffix.ToString()}";
    }

    /// <summary>
    /// Normalizes code input by trimming whitespace and capitalizing.
    /// </summary>
    public static string NormalizeCode(string? code)
    {
        return code?.Trim().ToUpperInvariant() ?? string.Empty;
    }

    /// <summary>
    /// Validates whether a provided string conforms to the required supervisor code format.
    /// </summary>
    public static bool IsValidFormat(string? code)
    {
        var normalized = NormalizeCode(code);
        return CodeFormatRegex().IsMatch(normalized);
    }
}
