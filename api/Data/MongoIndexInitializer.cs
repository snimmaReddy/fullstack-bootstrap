using Api.Models;
using MongoDB.Driver;

namespace Api.Data;

/// <summary>Creates indexes on startup. Add new indexes here.</summary>
public class MongoIndexInitializer(MongoContext ctx, ILogger<MongoIndexInitializer> log) : IHostedService
{
    public async Task StartAsync(CancellationToken ct)
    {
        try
        {
            await ctx.Collection<User>().Indexes.CreateOneAsync(
                new CreateIndexModel<User>(
                    Builders<User>.IndexKeys.Ascending(u => u.Email),
                    new CreateIndexOptions { Unique = true, Name = "email_unique" }),
                cancellationToken: ct);
        }
        catch (Exception ex)
        {
            // Don't block startup if Mongo is down; /api/health will report it.
            log.LogWarning(ex, "Could not ensure MongoDB indexes");
        }
    }

    public Task StopAsync(CancellationToken ct) => Task.CompletedTask;
}
