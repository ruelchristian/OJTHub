namespace OJTHub.Server.DTOs;

public record CreateActivityRequest(
    DateOnly Date,
    string TaskTitle,
    string Details,
    decimal? HoursSpent,
    string? Category
);

public record UpdateActivityRequest(
    string TaskTitle,
    string Details,
    decimal? HoursSpent,
    string? Category
);

public record ActivityLogDto(
    Guid Id,
    Guid UserId,
    DateOnly Date,
    string TaskTitle,
    string Details,
    decimal? HoursSpent,
    string Category,
    DateTimeOffset CreatedAt
);

public record PolishTaskRequest(
    string TaskTitle,
    string? Details,
    string? Category,
    string? Purpose = "journal"
);

public record PolishTaskResponse(
    string PolishedDetails
);

public record MilestoneSummaryRequest(
    int MilestoneHours,
    Guid? UserId = null
);

public record MilestoneSummaryResponse(
    int MilestoneHours,
    decimal TotalHoursLogged,
    int ActivityCount,
    string SummaryContent
);

public record SubmitMilestoneRequest(
    int MilestoneHours,
    string SummaryContent,
    string? Notes = null
);

public record SubmittedMilestoneDto(
    Guid Id,
    Guid UserId,
    int MilestoneHours,
    string SummaryContent,
    DateTimeOffset SubmittedAt
);

