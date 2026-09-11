using OJTHub.Server.Models;

namespace OJTHub.Server.Services;

public interface ITokenService
{
    string GenerateToken(User user);
}
