namespace OJTHub.Server.DTOs;

public record GenerateReportRequest(
    string ReportType, // "EOD_Standup" or "Journal_Narrative"
    DateOnly StartDate,
    DateOnly EndDate,
    string? CustomNotes
);

public record SaveReportRequest(
    string ReportType,
    DateOnly StartDate,
    DateOnly EndDate,
    string FinalContent
);

public record GeneratedReportDto(
    Guid Id,
    Guid UserId,
    string ReportType,
    DateOnly StartDate,
    DateOnly EndDate,
    string AiGeneratedContent,
    string? EditedContent,
    DateTimeOffset CreatedAt
);
