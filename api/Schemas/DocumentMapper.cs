using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using MongoDB.Bson;

namespace Api.Schemas;

/// <summary>Converts between JSON request/response bodies and BSON documents, validating against a schema.</summary>
public static class DocumentMapper
{
    public const string EmailPattern = @"^[^@\s]+@[^@\s]+\.[^@\s]+$";
    private static readonly Regex EmailRx = new(EmailPattern, RegexOptions.Compiled);
    private static readonly HashSet<string> SystemKeys = ["id", "createdAt", "updatedAt"];

    /// <summary>
    /// Validates a full document body. Returns BSON values for every field that has a value
    /// (defaults applied), plus errors keyed by field name.
    /// </summary>
    public static (Dictionary<string, BsonValue> Values, Dictionary<string, string> Errors) FromJson(Schema s, JsonElement body)
    {
        var values = new Dictionary<string, BsonValue>();
        var errors = new Dictionary<string, string>();

        if (body.ValueKind != JsonValueKind.Object)
        {
            errors[""] = "The request body must be a JSON object.";
            return (values, errors);
        }

        foreach (var p in body.EnumerateObject())
            if (!SystemKeys.Contains(p.Name) && s.Find(p.Name) is null)
                errors[p.Name] = $"Unknown field \"{p.Name}\".";

        foreach (var f in s.Fields)
        {
            JsonElement? value = body.TryGetProperty(f.Name, out var v) && !IsEmpty(v) ? v : f.Default;
            if (value is null)
            {
                if (f.Required) errors[f.Name] = $"The {f.Label} field is required.";
                continue;
            }
            if (TryConvert(f, value.Value, out var bson, out var error)) values[f.Name] = bson;
            else errors[f.Name] = error!;
        }
        return (values, errors);
    }

    private static bool IsEmpty(JsonElement v) =>
        v.ValueKind == JsonValueKind.Null || (v.ValueKind == JsonValueKind.String && v.GetString() == "");

    public static bool TryConvert(Field f, JsonElement v, out BsonValue bson, out string? error)
    {
        bson = BsonNull.Value;
        error = null;
        var label = f.Label;

        switch (f.Type)
        {
            case FieldType.String or FieldType.Text or FieldType.Email or FieldType.Enum:
                if (v.ValueKind != JsonValueKind.String) { error = $"{label} must be text."; return false; }
                var s = v.GetString()!;
                if (f.MinLength is { } min && s.Length < min) { error = $"{label} must be at least {min} characters."; return false; }
                if (f.MaxLength is { } max && s.Length > max) { error = $"{label} must be at most {max} characters."; return false; }
                if (f.Pattern is { } pattern && !Regex.IsMatch(s, pattern)) { error = $"{label} has an invalid format."; return false; }
                if (f.Type == FieldType.Email && !EmailRx.IsMatch(s)) { error = $"{label} must be a valid email address."; return false; }
                if (f.Type == FieldType.Enum && !f.Values!.Contains(s)) { error = $"{label} must be one of: {string.Join(", ", f.Values!)}."; return false; }
                bson = new BsonString(s);
                return true;

            case FieldType.Number:
                if (v.ValueKind != JsonValueKind.Number || !double.IsFinite(v.GetDouble())) { error = $"{label} must be a number."; return false; }
                var d = v.GetDouble();
                if (!InRange(f, d, out error)) return false;
                bson = new BsonDouble(d);
                return true;

            case FieldType.Integer:
                if (v.ValueKind != JsonValueKind.Number || !v.TryGetInt64(out var l)) { error = $"{label} must be a whole number."; return false; }
                if (!InRange(f, l, out error)) return false;
                bson = new BsonInt64(l);
                return true;

            case FieldType.Boolean:
                if (v.ValueKind is not (JsonValueKind.True or JsonValueKind.False)) { error = $"{label} must be true or false."; return false; }
                bson = BsonBoolean.Create(v.GetBoolean());
                return true;

            case FieldType.Date:
                if (v.ValueKind != JsonValueKind.String || !DateTimeOffset.TryParse(v.GetString(), CultureInfo.InvariantCulture,
                        DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var dto))
                { error = $"{label} must be a date (e.g. 2026-11-15)."; return false; }
                bson = new BsonDateTime(dto.UtcDateTime);
                return true;
        }
        error = $"{label} has an unsupported type.";
        return false;
    }

    private static bool InRange(Field f, double n, out string? error)
    {
        error = n < f.Min ? $"{f.Label} must be at least {f.Min}." : n > f.Max ? $"{f.Label} must be at most {f.Max}." : null;
        return error is null;
    }

    /// <summary>BSON → JSON-friendly dictionary: id first, schema fields in order, then timestamps.</summary>
    public static Dictionary<string, object?> ToJson(Schema s, BsonDocument doc)
    {
        var o = new Dictionary<string, object?> { ["id"] = doc.GetValue("_id", BsonNull.Value).ToString() };
        foreach (var f in s.Fields)
            if (doc.TryGetValue(f.Name, out var v)) o[f.Name] = ToDotNet(v);
        o["createdAt"] = doc.TryGetValue("createdAt", out var c) ? ToDotNet(c) : null;
        o["updatedAt"] = doc.TryGetValue("updatedAt", out var u) ? ToDotNet(u) : null;
        return o;
    }

    private static object? ToDotNet(BsonValue v) => v.BsonType switch
    {
        BsonType.Null => null,
        BsonType.DateTime => v.ToUniversalTime(),
        BsonType.String => v.AsString,
        BsonType.Boolean => v.AsBoolean,
        BsonType.Int32 => v.AsInt32,
        BsonType.Int64 => v.AsInt64,
        BsonType.Double => v.AsDouble,
        BsonType.Decimal128 => (decimal)v.AsDecimal128,
        _ => v.ToString(), // e.g. values written by hand in Compass with another type
    };
}
