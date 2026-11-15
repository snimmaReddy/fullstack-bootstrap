using Api.Auth;
using Api.Data;
using Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.JsonWebTokens;
using MongoDB.Driver;

namespace Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(MongoContext ctx, IPasswordHasher<User> hasher, TokenService tokens) : ControllerBase
{
    private IMongoCollection<User> Users => ctx.Collection<User>();

    // Used so a login for an unknown email costs the same time as a wrong password.
    private static readonly Lazy<string> DummyHash = new(() => new PasswordHasher<User>().HashPassword(new User(), "dummy-password"));

    [HttpPost("register")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<UserDto>> Register(RegisterRequest req)
    {
        var email = Normalize(req.Email);
        if (await Users.Find(u => u.Email == email).AnyAsync())
            return Problem(statusCode: StatusCodes.Status409Conflict, title: "Email is already registered.");

        var now = DateTime.UtcNow;
        var user = new User { Email = email, CreatedAt = now, UpdatedAt = now };
        user.PasswordHash = hasher.HashPassword(user, req.Password);

        try
        {
            await Users.InsertOneAsync(user);
        }
        catch (MongoWriteException e) when (e.WriteError.Category == ServerErrorCategory.DuplicateKey)
        {
            return Problem(statusCode: StatusCodes.Status409Conflict, title: "Email is already registered.");
        }

        SetAuthCookie(user);
        return CreatedAtAction(nameof(Me), null, UserDto.From(user));
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<UserDto>> Login(LoginRequest req)
    {
        var email = Normalize(req.Email);
        var user = await Users.Find(u => u.Email == email).FirstOrDefaultAsync();

        if (user is null)
        {
            hasher.VerifyHashedPassword(new User(), DummyHash.Value, req.Password);
            return InvalidCredentials();
        }

        var result = hasher.VerifyHashedPassword(user, user.PasswordHash, req.Password);
        if (result == PasswordVerificationResult.Failed) return InvalidCredentials();

        if (result == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = hasher.HashPassword(user, req.Password);
            await Users.UpdateOneAsync(u => u.Id == user.Id, Builders<User>.Update.Set(u => u.PasswordHash, user.PasswordHash));
        }

        SetAuthCookie(user);
        return Ok(UserDto.From(user));
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    public IActionResult Logout()
    {
        Response.Cookies.Delete(AuthCookie.Name, CookieOptions(DateTimeOffset.UnixEpoch));
        return NoContent();
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> Me()
    {
        var id = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        var user = id is null ? null : await Users.Find(u => u.Id == id).FirstOrDefaultAsync();
        return user is null ? Unauthorized() : Ok(UserDto.From(user));
    }

    private void SetAuthCookie(User user)
    {
        var (token, expires) = tokens.Issue(user);
        Response.Cookies.Append(AuthCookie.Name, token, CookieOptions(expires));
    }

    private CookieOptions CookieOptions(DateTimeOffset expires) => new()
    {
        HttpOnly = true,
        Secure = Request.IsHttps,
        SameSite = SameSiteMode.Strict,
        Path = "/",
        Expires = expires,
    };

    private ObjectResult InvalidCredentials() =>
        Problem(statusCode: StatusCodes.Status401Unauthorized, title: "Invalid email or password.");

    private static string Normalize(string email) => email.Trim().ToLowerInvariant();
}
