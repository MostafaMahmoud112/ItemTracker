using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace WorkItemTracker.Tests.Infrastructure;

public sealed class WorkItemApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly string _dbPath;
    private readonly bool _ownsDbFile;

    public WorkItemApiFactory()
    {
        _dbPath = Path.Combine(Path.GetTempPath(), $"workitems-{Guid.NewGuid():N}.db");
        _ownsDbFile = true;
        ConnectionString = $"Data Source={_dbPath}";
    }

    private WorkItemApiFactory(string dbPath, bool ownsDbFile)
    {
        _dbPath = dbPath;
        _ownsDbFile = ownsDbFile;
        ConnectionString = $"Data Source={_dbPath}";
    }

    public static WorkItemApiFactory ForDatabase(string dbPath, bool ownsDbFile = false) =>
        new(dbPath, ownsDbFile);

    public string ConnectionString { get; }

    public string DbPath => _dbPath;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Default"] = ConnectionString
            });
        });
    }

    public Task InitializeAsync() => Task.CompletedTask;

    async Task IAsyncLifetime.DisposeAsync()
    {
        await DisposeAsync();
    }

    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();

        if (!_ownsDbFile)
        {
            return;
        }

        TryDelete(_dbPath);
        TryDelete(_dbPath + "-shm");
        TryDelete(_dbPath + "-wal");
    }

    private static void TryDelete(string path)
    {
        try
        {
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }
        catch
        {
            // Best-effort cleanup for temp SQLite files still briefly locked on Windows.
        }
    }
}
