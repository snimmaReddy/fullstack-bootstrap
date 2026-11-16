using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Api.Data;

/// <summary>
/// Errors thrown by <see cref="Db"/>. Endpoints don't catch them: <see cref="DataErrorHandler"/>
/// turns them into 400 / 404 / 409 problem responses.
/// </summary>
public abstract class DataError(string message) : Exception(message);

/// <summary>400 — one message per field (field "" = the whole request).</summary>
public sealed class ValidationError : DataError
{
    public IReadOnlyDictionary<string, string> Errors { get; }

    public ValidationError(IReadOnlyDictionary<string, string> errors) : base("One or more validation errors occurred.") =>
        Errors = errors;

    public ValidationError(string field, string message) : this(new Dictionary<string, string> { [field] = message }) { }
}

/// <summary>404 — unknown schema or record.</summary>
public sealed class NotFoundError(string message) : DataError(message)
{
    public static NotFoundError Record(string schema, string id) => new($"No {schema} with id \"{id}\".");
}

/// <summary>409 — duplicate unique value (Field set), or a delete blocked by references.</summary>
public sealed class ConflictError(string message, string? field = null) : DataError(message)
{
    public string? Field { get; } = field;
}

public sealed class DataErrorHandler(IProblemDetailsService problems) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext http, Exception exception, CancellationToken ct)
    {
        ProblemDetails? details = exception switch
        {
            ValidationError v => new ValidationProblemDetails(v.Errors.ToDictionary(e => e.Key, e => new[] { e.Value })) { Status = 400 },
            NotFoundError => new ProblemDetails { Status = 404, Title = exception.Message },
            ConflictError { Field: { } field } => new ValidationProblemDetails(
                new Dictionary<string, string[]> { [field] = [exception.Message] }) { Status = 409, Title = exception.Message },
            ConflictError => new ProblemDetails { Status = 409, Title = exception.Message },
            _ => null,
        };
        if (details is null) return false;

        http.Response.StatusCode = details.Status!.Value;
        return await problems.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = http,
            ProblemDetails = details,
            Exception = exception,
        });
    }
}
