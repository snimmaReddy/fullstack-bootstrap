using Api.Data;

namespace Api.Models;

/// <summary>Never returned from the API directly; see Auth.UserDto.</summary>
[Collection("users")]
public class User : BaseEntity
{
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public List<string> Roles { get; set; } = ["User"];
}
