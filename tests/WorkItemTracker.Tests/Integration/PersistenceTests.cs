using System.Net.Http.Json;
using System.Text.Json;
using WorkItemTracker.Api.Dtos;
using WorkItemTracker.Tests.Infrastructure;

namespace WorkItemTracker.Tests.Integration;

public sealed class PersistenceTests
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
    };

    [Fact]
    public async Task CreatedItem_SurvivesHostRestart_OnSameSqliteFile()
    {
        var dbPath = Path.Combine(Path.GetTempPath(), $"workitems-persist-{Guid.NewGuid():N}.db");

        try
        {
            WorkItemResponse created;
            await using (var factory1 = WorkItemApiFactory.ForDatabase(dbPath, ownsDbFile: false))
            {
                var client1 = factory1.CreateClient();
                var response = await client1.PostAsJsonAsync("/api/work-items", new
                {
                    title = "Persisted item",
                    description = "must survive restart"
                });
                response.EnsureSuccessStatusCode();
                created = (await response.Content.ReadFromJsonAsync<WorkItemResponse>(JsonOptions))!;
            }

            await using var factory2 = WorkItemApiFactory.ForDatabase(dbPath, ownsDbFile: true);
            var client2 = factory2.CreateClient();
            var page = await client2.GetFromJsonAsync<PagedResult<WorkItemResponse>>(
                "/api/work-items?search=Persisted&page=1&pageSize=10",
                JsonOptions);

            Assert.NotNull(page);
            Assert.Contains(page.Items, i => i.Id == created.Id && i.Title == "Persisted item");
        }
        finally
        {
            TryDelete(dbPath);
            TryDelete(dbPath + "-shm");
            TryDelete(dbPath + "-wal");
        }
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
            // ignore
        }
    }
}
