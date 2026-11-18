using System.Text.Json;
using System.Text.RegularExpressions;

namespace Api.Schemas;

/// <summary>Parses a schema file and enforces the rules in PLAN-json-schemas.md section 2.</summary>
public static partial class SchemaLoader
{
    public static readonly JsonSerializerOptions FileJson = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
        UnmappedMemberHandling = System.Text.Json.Serialization.JsonUnmappedMemberHandling.Disallow,
    };

    private static readonly HashSet<string> ReservedFields = ["id", "createdAt", "updatedAt"];

    [GeneratedRegex("^[a-z][a-z0-9]*$")] private static partial Regex NameRx();
    [GeneratedRegex("^[a-z][a-zA-Z0-9_]*$")] private static partial Regex CollectionRx();
    [GeneratedRegex("^[a-z][a-zA-Z0-9]*$")] private static partial Regex FieldRx();
    [GeneratedRegex("([a-z0-9])([A-Z])")] private static partial Regex CamelRx();

    public static Schema Parse(string fileName, string json)
    {
        SchemaFile file;
        try
        {
            file = JsonSerializer.Deserialize<SchemaFile>(json, FileJson) ?? throw new SchemaException("The file is empty.");
        }
        catch (JsonException e)
        {
            throw new SchemaException($"Invalid JSON: {e.Message}");
        }

        var errors = new List<string>();
        var expected = Path.GetFileNameWithoutExtension(fileName);
        var name = file.Name ?? "";
        if (!NameRx().IsMatch(name))
            errors.Add("\"name\" must be lower-case letters and digits, starting with a letter (e.g. \"product\").");
        else if (name != expected)
            errors.Add($"\"name\" must match the file name (\"{expected}\").");

        var collection = file.Collection ?? name + "s";
        if (!CollectionRx().IsMatch(collection))
            errors.Add($"\"collection\" \"{collection}\" must start with a lower-case letter and use letters, digits or _.");

        var fields = new List<Field>();
        if (file.Fields is null || file.Fields.Count == 0)
            errors.Add("\"fields\" must define at least one field.");
        else
            foreach (var (fieldName, f) in file.Fields)
                if (ParseField(fieldName, f, errors) is { } field) fields.Add(field);

        // "display": the field that names a record in the UI (default: first string field).
        var display = file.Display ?? fields.FirstOrDefault(f => f.Type == FieldType.String)?.Name ?? fields.FirstOrDefault()?.Name ?? "id";
        if (file.Display is not null && fields.Count > 0 && fields.All(f => f.Name != file.Display))
            errors.Add($"\"display\" \"{file.Display}\" is not one of the fields.");

        if (errors.Count > 0) throw new SchemaException(string.Join(" ", errors));
        return new Schema(name, collection, file.Title ?? Humanize(collection), display, fields, fileName);
    }

    private static Field? ParseField(string name, FieldFile f, List<string> errors)
    {
        var at = $"Field \"{name}\":";
        var before = errors.Count;

        if (!FieldRx().IsMatch(name)) errors.Add($"{at} names must be camelCase letters and digits.");
        if (ReservedFields.Contains(name)) errors.Add($"{at} \"{name}\" is added automatically and can't be defined.");

        if (f.Type is null || f.Type != f.Type.ToLowerInvariant() || !Enum.TryParse<FieldType>(f.Type, true, out var type))
        {
            errors.Add($"{at} \"type\" must be one of string, text, email, number, integer, boolean, date, enum, ref.");
            return null;
        }

        void Only(bool allowed, object? value, string option, string types)
        {
            if (value is not null && !allowed) errors.Add($"{at} \"{option}\" only applies to {types}.");
        }
        var isText = type is FieldType.String or FieldType.Text;
        var isNumeric = type is FieldType.Number or FieldType.Integer;
        Only(isText, f.MinLength, "minLength", "string and text");
        Only(isText, f.MaxLength, "maxLength", "string and text");
        Only(type == FieldType.String, f.Pattern, "pattern", "string");
        Only(isNumeric, f.Min, "min", "number and integer");
        Only(isNumeric, f.Max, "max", "number and integer");
        Only(type == FieldType.Enum, f.Values, "values", "enum");
        Only(type == FieldType.Ref, f.Ref, "ref", "ref");
        if (type == FieldType.Ref && (f.Ref is null || !NameRx().IsMatch(f.Ref)))
            errors.Add($"{at} ref fields need \"ref\": \"<schema name>\" (e.g. \"supplier\").");

        if (f.MinLength < 0 || f.MaxLength < 1) errors.Add($"{at} lengths must be positive.");
        if (f.MinLength > f.MaxLength) errors.Add($"{at} \"minLength\" is greater than \"maxLength\".");
        if (f.Min > f.Max) errors.Add($"{at} \"min\" is greater than \"max\".");
        if (f.Pattern is not null)
            try { _ = new Regex(f.Pattern); }
            catch (ArgumentException e) { errors.Add($"{at} \"pattern\" is not a valid regex: {e.Message}"); }
        if (type == FieldType.Enum)
        {
            if (f.Values is null || f.Values.Count == 0) errors.Add($"{at} enum fields need a non-empty \"values\" list.");
            else if (f.Values.Distinct().Count() != f.Values.Count) errors.Add($"{at} \"values\" contains duplicates.");
        }

        if (errors.Count > before) return null;

        JsonElement? defaultValue = f.Default is { ValueKind: not JsonValueKind.Null } d ? d : null;
        var field = new Field(
            name, type, f.Label ?? Humanize(name), f.Required ?? false, f.Unique ?? false, f.ShowInTable ?? true,
            f.MinLength, f.MaxLength, f.Pattern, f.Min, f.Max, f.Values, defaultValue, f.Ref);

        if (defaultValue is { } dv && !DocumentMapper.TryConvert(field, dv, out _, out var err))
        {
            errors.Add($"{at} \"default\" is invalid: {err}");
            return null;
        }
        return field;
    }

    /// <summary>"inStock" → "In stock", "products" → "Products".</summary>
    public static string Humanize(string s)
    {
        var spaced = CamelRx().Replace(s, "$1 $2").Replace('_', ' ').ToLowerInvariant();
        return spaced.Length == 0 ? spaced : char.ToUpperInvariant(spaced[0]) + spaced[1..];
    }
}
