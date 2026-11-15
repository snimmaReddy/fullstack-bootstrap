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
        var client = new MongoClient(options.Value.ConnectionString);
        _db = client.GetDatabase(options.Value.Database);
    }

    public IMongoCollection<T> Collection<T>() where T : BaseEntity =>
        _db.GetCollection<T>(NameOf<T>());

    private static string NameOf<T>() =>
        typeof(T).GetCustomAttribute<CollectionAttribute>()?.Name ?? typeof(T).Name.ToLowerInvariant() + "s";
}
