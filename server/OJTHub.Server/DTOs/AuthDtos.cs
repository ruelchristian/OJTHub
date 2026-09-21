namespace OJTHub.Server.DTOs;

public record RegisterRequest(
    string Email,
    string Password,
    string FullName,
    string? StudentId,
    string Role
);

public record LoginRequest(
    string Email,
    string Password
);

public record UserDto(
    Guid Id,
    string Email,
    string FullName,
    string? StudentId,
    string Role,
    string? SupervisorCode = null,
    Guid? SupervisorId = null,
    string? SupervisorName = null
);

public record LinkSupervisorRequest(
    string Code
);

public record SupervisorCodeResponse(
    string Code,
    string FullName
);

public record AuthResponse(
    string Token,
    UserDto User
);
