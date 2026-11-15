using Api.Data;
using Api.Models;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Api.Repositories;

public class MongoRepository<T>(MongoContext ctx) : IRepository<T> where T : BaseEntity
{
    private readonly IMongoCollection<T> _col = ctx.Collection<T>();

    public Task<List<T>> GetAllAsync() =>
        _col.Find(FilterDefinition<T>.Empty).SortByDescending(x => x.CreatedAt).ToListAsync();

    public async Task<T?> GetByIdAsync(string id) =>
        ObjectId.TryParse(id, out _) ? await _col.Find(x => x.Id == id).FirstOrDefaultAsync() : null;

    public async Task<T> CreateAsync(T entity)
    {
        entity.Id = null; // let Mongo generate it
        entity.CreatedAt = entity.UpdatedAt = DateTime.UtcNow;
        await _col.InsertOneAsync(entity);
        return entity;
    }

    public async Task<T?> UpdateAsync(string id, T entity)
    {
        var existing = await GetByIdAsync(id);
        if (existing is null) return null;
        entity.Id = id;
        entity.CreatedAt = existing.CreatedAt;
        entity.UpdatedAt = DateTime.UtcNow;
        await _col.ReplaceOneAsync(x => x.Id == id, entity);
        return entity;
    }

    public async Task<bool> DeleteAsync(string id) =>
        ObjectId.TryParse(id, out _) && (await _col.DeleteOneAsync(x => x.Id == id)).DeletedCount > 0;
}
