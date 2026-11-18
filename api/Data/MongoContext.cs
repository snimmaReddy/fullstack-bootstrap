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
        var settings = MongoClientSettings.FromConnectionString(options.Value.ConnectionString);
        settings.ServerSelectionTimeout = TimeSpan.FromSeconds(5); // fail fast when Mongo is down
        _db = new MongoClient(settings).GetDatabase(options.Value.Database);
    }
}
