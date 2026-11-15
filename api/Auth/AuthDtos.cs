using System.ComponentModel.DataAnnotations;
using Api.Models;

namespace Api.Auth;

public class RegisterRequest
{
    [Required, EmailAddress, StringLength(254)]
    public string Email { get; set; } = "";

    [Required, StringLength(128, MinimumLength = 8)]
    public string Password { get; set; } = "";
}

public class LoginRequest
{
    [Required]
    public string Email { get; set; } = "";

    [Required]
    public string Password { get; set; } = "";
}

public record UserDto(string Id, string Email, List<string> Roles, DateTime CreatedAt)
{
    public static UserDto From(User u) => new(u.Id!, u.Email, u.Roles, u.CreatedAt);
}
