using System.Security.Claims;
using System.Text;
using Api.Models;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Api.Auth;

public class TokenService(JwtSettings settings)
{
    private readonly SigningCredentials _creds = new(
        new SymmetricSecurityKey(Encoding.UTF8.GetBytes(settings.Key)), SecurityAlgorithms.HmacSha256);

    public (string Token, DateTime ExpiresAt) Issue(User user)
    {
        var expires = DateTime.UtcNow.AddMinutes(settings.ExpiryMinutes);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id!),
            new(JwtRegisteredClaimNames.Email, user.Email),
        };
        claims.AddRange(user.Roles.Select(r => new Claim("role", r)));

        var token = new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Issuer = settings.Issuer,
            Audience = settings.Audience,
            Subject = new ClaimsIdentity(claims),
            Expires = expires,
            SigningCredentials = _creds,
        });
        return (token, expires);
    }
}
