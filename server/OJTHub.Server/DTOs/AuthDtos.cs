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
    string Role
);

public record AuthResponse(
    string Token,
    UserDto User
);
