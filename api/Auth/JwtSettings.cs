namespace Api.Auth;

public class JwtSettings
{
    public string Key { get; set; } = "";
    public string Issuer { get; set; } = "upstart-api";
    public string Audience { get; set; } = "upstart-web";
    public int ExpiryMinutes { get; set; } = 480;
}

public static class AuthCookie
{
    public const string Name = "auth";
}
