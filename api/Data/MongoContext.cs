using System.Reflection;
using Api.Models;
using Microsoft.Extensions.Options;
using MongoDB.Bson.Serialization.Conventions;
using MongoDB.Driver;

namespace Api.Data;

public class MongoContext
{
    private readonly IMongoDatabase _db;
    public IMongoDatabase Database => _db;

    /// <summary>Collections owned by typed C# entities (e.g. users); JSON schemas can't use them.</summary>
    public static readonly IReadOnlySet<string> TypedCollections = typeof(BaseEntity).Assembly.GetTypes()
        .Where(t => t is { IsClass: true, IsAbstract: false } && t.IsSubclassOf(typeof(BaseEntity)))
        .Select(CollectionName)
        .ToHashSet();

    static MongoContext()
    {
        // camelCase field names in Mongo; tolerate fields removed from a model.
        ConventionRegistry.Register("app", new ConventionPack
        {
            new CamelCaseElementNameConvention(),
            new IgnoreExtraElementsConvention(true),
        }, _ => true);
    }

    public MongoContext(IOptions<MongoSettings> options)
    {
        var settings = MongoClientSettings.FromConnectionString(options.Value.ConnectionString);
        settings.ServerSelectionTimeout = TimeSpan.FromSeconds(5); // fail fast when Mongo is down
        _db = new MongoClient(settings).GetDatabase(options.Value.Database);
    }

    public IMongoCollection<T> Collection<T>() where T : BaseEntity => _db.GetCollection<T>(CollectionName(typeof(T)));

    public static string CollectionName(Type t) =>
        t.GetCustomAttribute<CollectionAttribute>()?.Name ?? t.Name.ToLowerInvariant() + "s";
}
