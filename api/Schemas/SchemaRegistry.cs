using System.Collections.Concurrent;
using System.Text.Json;
using System.Threading.Channels;
using Api.Data;
using Microsoft.Extensions.Options;

namespace Api.Schemas;

public sealed class SchemaOptions
{
    /// <summary>Folder holding *.json schema files, relative to the API's content root.</summary>
    public string Path { get; set; } = "../schemas";

    /// <summary>Reload on file changes. Defaults to on in Development, off elsewhere.</summary>
    public bool? Watch { get; set; }
}

public sealed record SchemaError(string File, string Message);

/// <summary>
/// Loads schemas/*.json, keeps the current valid set in memory, syncs changes to MongoDB,
/// and (in Development) reloads when files change. An invalid file keeps its last good version live.
/// </summary>
public sealed class SchemaRegistry(
    IOptions<SchemaOptions> options, IHostEnvironment env, SchemaSync sync, ILogger<SchemaRegistry> log)
    : BackgroundService
{
    public const string MetaFile = "schema.schema.json";
    private static readonly TimeSpan Debounce = TimeSpan.FromMilliseconds(300);
    private static readonly TimeSpan RetryEvery = TimeSpan.FromSeconds(10);

    private readonly string _dir = Path.GetFullPath(Path.Combine(env.ContentRootPath, options.Value.Path));
    private readonly SemaphoreSlim _gate = new(1, 1);
    private readonly ConcurrentDictionary<string, SchemaError> _syncErrors = new();
    private readonly HashSet<string> _unsynced = [];

    private volatile IReadOnlyDictionary<string, Schema> _schemas = new Dictionary<string, Schema>();
    private volatile IReadOnlyList<SchemaError> _fileErrors = [];
    private (List<Schema> Changed, List<string> Removed) _initial;

    public string Folder => _dir;
    public IReadOnlyCollection<Schema> All => _schemas.Values.OrderBy(s => s.Title).ToList();
    public IReadOnlyList<SchemaError> Errors => [.. _fileErrors, .. _syncErrors.Values];
    public Schema? Get(string name) => _schemas.GetValueOrDefault(name);

    public override async Task StartAsync(CancellationToken ct)
    {
        Directory.CreateDirectory(_dir);
        _initial = LoadFiles(); // files are served immediately; MongoDB sync happens in the background
        await base.StartAsync(ct);
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        try
        {
            await _gate.WaitAsync(ct);
            try { await SyncAsync(_initial.Changed, _initial.Removed, ct); }
            finally { _gate.Release(); }

            Channel<bool>? changes = null;
            using var watcher = (options.Value.Watch ?? env.IsDevelopment()) ? new FileSystemWatcher(_dir, "*.json") : null;
            if (watcher is not null)
            {
                changes = Channel.CreateUnbounded<bool>();
                void Signal() => changes.Writer.TryWrite(true);
                watcher.Changed += (_, _) => Signal();
                watcher.Created += (_, _) => Signal();
                watcher.Deleted += (_, _) => Signal();
                watcher.Renamed += (_, _) => Signal();
                watcher.EnableRaisingEvents = true;
                log.LogInformation("Watching {Dir} for schema changes", _dir);
            }

            Task<bool>? changed = null;
            while (!ct.IsCancellationRequested)
            {
                changed ??= changes is null ? Task.Delay(Timeout.Infinite, ct).ContinueWith(_ => false) : changes.Reader.WaitToReadAsync(ct).AsTask();
                var retry = Task.Delay(_unsynced.Count > 0 ? RetryEvery : Timeout.InfiniteTimeSpan, ct);
                await Task.WhenAny(changed, retry);
                ct.ThrowIfCancellationRequested();

                if (changed.IsCompleted)
                {
                    changed = null;
                    await Task.Delay(Debounce, ct); // editors write files in several steps
                    while (changes!.Reader.TryRead(out _)) { }
                    await ReloadAsync(ct);
                }
                else
                {
                    await RetryUnsyncedAsync(ct);
                }
            }
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { }
    }

    public async Task ReloadAsync(CancellationToken ct)
    {
        await _gate.WaitAsync(ct);
        try
        {
            var (changed, removed) = LoadFiles();
            await SyncAsync(changed, removed, ct);
        }
        finally { _gate.Release(); }
    }

    private (List<Schema> Changed, List<string> Removed) LoadFiles()
    {
        var previous = _schemas;
        var next = new Dictionary<string, Schema>();
        var errors = new List<SchemaError>();
        var collections = new Dictionary<string, string>(); // collection → schema name

        foreach (var path in Directory.GetFiles(_dir, "*.json").Order(StringComparer.Ordinal))
        {
            var file = Path.GetFileName(path);
            if (file == MetaFile) continue;
            var key = Path.GetFileNameWithoutExtension(file);
            try
            {
                var s = SchemaLoader.Parse(file, File.ReadAllText(path));
                if (collections.TryGetValue(s.Collection, out var other))
                    throw new SchemaException($"Collection \"{s.Collection}\" is already used by schema \"{other}\".");
                next[s.Name] = s;
                collections[s.Collection] = s.Name;
            }
            catch (Exception e) when (e is SchemaException or IOException)
            {
                var message = e.Message;
                if (previous.TryGetValue(key, out var last) && !collections.ContainsKey(last.Collection))
                {
                    next[key] = last;
                    collections[last.Collection] = key;
                    message += " (still serving the last valid version)";
                }
                errors.Add(new SchemaError("schemas/" + file, message));
                log.LogError("Schema file {File} is invalid: {Message}", file, message);
            }
        }

        foreach (var s in next.Values)
        foreach (var f in s.Fields.Where(f => f.Type == FieldType.Ref && !next.ContainsKey(f.Ref!)))
            errors.Add(new SchemaError("schemas/" + s.FileName,
                $"Field \"{f.Name}\" refers to schema \"{f.Ref}\", which isn't loaded. Writes and includes of this field will fail until it is."));

        var changed = next.Values.Where(s => !previous.TryGetValue(s.Name, out var p) || Fingerprint(p) != Fingerprint(s)).ToList();
        var removed = previous.Keys.Except(next.Keys).ToList();

        _schemas = next;
        _fileErrors = errors;
        foreach (var s in changed) log.LogInformation("Loaded schema {Schema} from {File}", s.Name, s.FileName);
        foreach (var name in removed) log.LogInformation("Schema {Schema} removed (its data is kept)", name);
        return (changed, removed);
    }

    private async Task SyncAsync(IEnumerable<Schema> changed, IEnumerable<string> removed, CancellationToken ct)
    {
        foreach (var s in changed) await SyncOneAsync(s, ct);
        foreach (var name in removed)
        {
            _unsynced.Remove(name);
            _syncErrors.TryRemove(name, out _);
            try { await sync.RemoveAsync(name, ct); }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                log.LogWarning(e, "Could not remove {Schema} from {Mirror}", name, SchemaSync.MirrorCollection);
            }
        }
    }

    private async Task SyncOneAsync(Schema s, CancellationToken ct)
    {
        try
        {
            var problems = await sync.ApplyAsync(s, ct);
            _unsynced.Remove(s.Name);
            if (problems.Count > 0) _syncErrors[s.Name] = new SchemaError("schemas/" + s.FileName, string.Join(" ", problems));
            else _syncErrors.TryRemove(s.Name, out _);
        }
        catch (Exception e) when (e is not OperationCanceledException)
        {
            _unsynced.Add(s.Name);
            _syncErrors[s.Name] = new SchemaError("schemas/" + s.FileName, $"Not synced to MongoDB yet (retrying): {e.Message}");
            log.LogWarning("Could not sync schema {Schema} to MongoDB: {Message}", s.Name, e.Message);
        }
    }

    private async Task RetryUnsyncedAsync(CancellationToken ct)
    {
        await _gate.WaitAsync(ct);
        try
        {
            foreach (var name in _unsynced.ToList())
                if (_schemas.TryGetValue(name, out var s)) await SyncOneAsync(s, ct);
                else _unsynced.Remove(name);
        }
        finally { _gate.Release(); }
    }

    private static string Fingerprint(Schema s) => JsonSerializer.Serialize(SchemaDto.From(s));
}
