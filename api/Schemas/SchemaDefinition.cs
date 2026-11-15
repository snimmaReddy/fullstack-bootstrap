using System.Text.Json;
using System.Text.Json.Serialization;

namespace Api.Schemas;

public enum FieldType { String, Text, Email, Number, Integer, Boolean, Date, Enum }

/// <summary>The raw shape of a schemas/*.json file, as people write it.</summary>
public sealed class SchemaFile
{
    [JsonPropertyName("$schema")] public string? SchemaRef { get; set; }
    public string? Name { get; set; }
    public string? Collection { get; set; }
    public string? Title { get; set; }
    public Dictionary<string, FieldFile>? Fields { get; set; }
}

public sealed class FieldFile
{
    public string? Type { get; set; }
    public bool? Required { get; set; }
    public bool? Unique { get; set; }
    public JsonElement? Default { get; set; }
    public string? Label { get; set; }
    public bool? ShowInTable { get; set; }
    public int? MinLength { get; set; }
    public int? MaxLength { get; set; }
    public string? Pattern { get; set; }
    public double? Min { get; set; }
    public double? Max { get; set; }
    public List<string>? Values { get; set; }
}

/// <summary>A validated schema, ready to serve.</summary>
public sealed record Schema(string Name, string Collection, string Title, IReadOnlyList<Field> Fields, string FileName)
{
    public Field? Find(string name) => Fields.FirstOrDefault(f => f.Name == name);
}

public sealed record Field(
    string Name, FieldType Type, string Label, bool Required, bool Unique, bool ShowInTable,
    int? MinLength, int? MaxLength, string? Pattern, double? Min, double? Max,
    IReadOnlyList<string>? Values, JsonElement? Default);

public sealed class SchemaException(string message) : Exception(message);

/// <summary>What the API returns for a schema (also mirrored to the _schemas collection).</summary>
public sealed record SchemaDto(string Name, string Collection, string Title, string File, IReadOnlyList<FieldDto> Fields)
{
    public static SchemaDto From(Schema s) => new(
        s.Name, s.Collection, s.Title, "schemas/" + s.FileName,
        s.Fields.Select(f => new FieldDto(
            f.Name, f.Type.ToString().ToLowerInvariant(), f.Label, f.Required, f.Unique, f.ShowInTable,
            f.MinLength, f.MaxLength, f.Pattern, f.Min, f.Max, f.Values, f.Default)).ToList());
}

public sealed record FieldDto(
    string Name, string Type, string Label, bool Required, bool Unique, bool ShowInTable,
    int? MinLength, int? MaxLength, string? Pattern, double? Min, double? Max,
    IReadOnlyList<string>? Values, JsonElement? Default);
