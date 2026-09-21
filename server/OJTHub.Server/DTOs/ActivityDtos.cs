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
    string? Category
);

public record PolishTaskResponse(
    string PolishedDetails
);

