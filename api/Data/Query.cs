using System.Collections;
using System.Globalization;
using System.Text.RegularExpressions;
using Api.Schemas;
using MongoDB.Bson;

namespace Api.Data;

public enum Op { Eq, Ne, Lt, Lte, Gt, Gte, In, Contains }

/// <summary>
/// Filters, sort, paging and includes for <see cref="Db"/> reads.
/// <code>
/// Query.Where("category", "hardware").And("price", Op.Lt, 100).Sort("-price").Take(20).Include("supplier")
/// </code>
/// Values may be typed (100, true, DateTime) or strings ("100", "true") — they're converted to the field's type.
/// </summary>
public sealed class Query
{
    public const int DefaultLimit = 100;
    public const int MaxLimit = 500;
    private static readonly List<string> DefaultSort = ["-createdAt"];

    private readonly List<(string Field, Op Op, object? Value)> _where = [];
    private readonly List<string> _sort = [];

    public List<string> Includes { get; } = [];
    public int TakeCount { get; private set; } = DefaultLimit;
    public int SkipCount { get; private set; }

    public static Query Where(string field, object? value) => new Query().And(field, Op.Eq, value);
    public static Query Where(string field, Op op, object? value) => new Query().And(field, op, value);

    public Query And(string field, object? value) => And(field, Op.Eq, value);
    public Query And(string field, Op op, object? value)
    {
        _where.Add((field, op, value));
        return this;
    }

    /// <summary>Field names; prefix with "-" for descending. Default: newest first.</summary>
    public Query Sort(params string[] fields) { _sort.AddRange(fields); return this; }
    public Query Take(int count) { TakeCount = Math.Clamp(count, 1, MaxLimit); return this; }
    public Query Skip(int count) { SkipCount = Math.Max(0, count); return this; }

    /// <summary>A ref field name (forward) or a referring collection name (reverse), e.g. "supplier", "products".</summary>
    public Query Include(params string[] names) { Includes.AddRange(names); return this; }

    /// <summary>
    /// Parses ?field=value, ?field.op=value (eq ne lt lte gt gte in contains),
    /// ?sort=-price,name, ?limit=, ?skip=, ?include=supplier,products.
    /// </summary>
    public static Query FromRequest(HttpRequest request)
    {
        var q = new Query();
        foreach (var (key, values) in request.Query)
        foreach (var raw in values)
        {
            var value = string.IsNullOrEmpty(raw) ? null : raw;
            switch (key)
            {
                case "sort": q.Sort(List(value)); break;
                case "include": q.Include(List(value)); break;
                case "limit": q.Take(ParseInt(key, value)); break;
                case "skip": q.Skip(ParseInt(key, value)); break;
                default:
                    var dot = key.LastIndexOf('.');
                    var (field, opName) = dot < 0 ? (key, "eq") : (key[..dot], key[(dot + 1)..]);
                    if (!opName.All(char.IsAsciiLetterLower) || !Enum.TryParse<Op>(opName, true, out var op))
                        throw new ValidationError(key, $"Unknown operator \"{opName}\". Use eq, ne, lt, lte, gt, gte, in or contains.");
                    q.And(field, op, value);
                    break;
            }
        }
        return q;

        static string[] List(string? v) => (v ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        static int ParseInt(string key, string? v) =>
            int.TryParse(v, NumberStyles.Integer, CultureInfo.InvariantCulture, out var n) ? n
                : throw new ValidationError(key, $"\"{key}\" must be a whole number.");
    }

    public BsonDocument BuildFilter(Schema s)
    {
        var clauses = new BsonArray();
        foreach (var (name, op, value) in _where)
        {
            var (path, field) = Resolve(s, name);
            BsonValue condition = op switch
            {
                Op.Eq => ToBson(field, name, value),
                Op.In => new BsonDocument("$in", new BsonArray(Items(value).Select(v => ToBson(field, name, v)))),
                Op.Contains => Contains(field, name, value),
                _ => new BsonDocument("$" + op.ToString().ToLowerInvariant(), ToBson(field, name, value)),
            };
            clauses.Add(new BsonDocument(path, condition));
        }
        return clauses.Count switch
        {
            0 => new BsonDocument(),
            1 => clauses[0].AsBsonDocument,
            _ => new BsonDocument("$and", clauses),
        };
    }

    public BsonDocument BuildSort(Schema s)
    {
        var sort = new BsonDocument();
        foreach (var raw in _sort.Count > 0 ? _sort : DefaultSort)
        {
            var (path, _) = Resolve(s, raw.TrimStart('-', '+', ' '));
            sort[path] = raw.StartsWith('-') ? -1 : 1;
        }
        if (!sort.Contains("_id")) sort["_id"] = sort[0].AsInt32; // tie-breaker for stable paging
        return sort;
    }

    // ---- helpers ----

    private static readonly Field IdField = Synthetic("id", FieldType.Ref);
    private static readonly Field CreatedAtField = Synthetic("createdAt", FieldType.Date);
    private static readonly Field UpdatedAtField = Synthetic("updatedAt", FieldType.Date);

    private static Field Synthetic(string name, FieldType type) =>
        new(name, type, name, false, false, true, null, null, null, null, null, null, null, null);

    private static (string Path, Field Field) Resolve(Schema s, string name) => name switch
    {
        "id" => ("_id", IdField),
        "createdAt" => (name, CreatedAtField),
        "updatedAt" => (name, UpdatedAtField),
        _ => s.Find(name) is { } f ? (name, f) : throw new ValidationError(name, $"Unknown field \"{name}\" in {s.Name}."),
    };

    private static IEnumerable<object?> Items(object? value) => value switch
    {
        null => [],
        string str => str.Split(',', StringSplitOptions.TrimEntries),
        IEnumerable e => e.Cast<object?>(),
        _ => [value],
    };

    private static BsonRegularExpression Contains(Field f, string key, object? value)
    {
        if (f.Type is not (FieldType.String or FieldType.Text or FieldType.Email or FieldType.Enum))
            throw new ValidationError(key, $"\"contains\" only works on text fields; {f.Name} is {f.Type.ToString().ToLowerInvariant()}.");
        return new BsonRegularExpression(Regex.Escape(value?.ToString() ?? ""), "i");
    }

    private static BsonValue ToBson(Field f, string key, object? value)
    {
        switch (value)
        {
            case null: return BsonNull.Value;
            case BsonValue b: return b;
            case DateTimeOffset dto: return new BsonDateTime(dto.UtcDateTime);
            case string str:
                BsonValue? parsed = f.Type switch
                {
                    FieldType.Number => double.TryParse(str, NumberStyles.Float, CultureInfo.InvariantCulture, out var d) ? d : null,
                    FieldType.Integer => long.TryParse(str, NumberStyles.Integer, CultureInfo.InvariantCulture, out var l) ? l : null,
                    FieldType.Boolean => bool.TryParse(str, out var bo) ? bo : null,
                    FieldType.Date => DateTimeOffset.TryParse(str, CultureInfo.InvariantCulture,
                        DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var dt) ? dt.UtcDateTime : null,
                    FieldType.Ref => ObjectId.TryParse(str, out var oid) ? oid : null,
                    _ => str,
                };
                return parsed ?? throw new ValidationError(key,
                    $"\"{str}\" is not a valid {f.Type.ToString().ToLowerInvariant()} for {f.Name}.");
            default: return BsonValue.Create(value);
        }
    }
}
