using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using WorkItemTracker.Api.Domain;
using WorkItemTracker.Api.Dtos;
using WorkItemTracker.Tests.Infrastructure;

namespace WorkItemTracker.Tests.Integration;

public sealed class WorkItemsApiTests : IClassFixture<WorkItemApiFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
    };

    private readonly HttpClient _client;

    public WorkItemsApiTests(WorkItemApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Post_ValidRequest_Returns201WithLocation()
    {
        var response = await _client.PostAsJsonAsync("/api/work-items", new
        {
            title = "  Trim me  ",
            description = "Details"
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.NotNull(response.Headers.Location);

        var body = await response.Content.ReadFromJsonAsync<WorkItemResponse>(JsonOptions);
        Assert.NotNull(body);
        Assert.Equal("Trim me", body.Title);
        Assert.Equal(WorkItemStatus.Todo, body.Status);
        Assert.True(body.Id > 0);
    }

    [Fact]
    public async Task GetById_ExistingItem_Returns200AndMatchesCreateLocation()
    {
        var createResponse = await _client.PostAsJsonAsync("/api/work-items", new
        {
            title = "Locate me",
            description = "Via Location header"
        });

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        Assert.NotNull(createResponse.Headers.Location);

        var created = await createResponse.Content.ReadFromJsonAsync<WorkItemResponse>(JsonOptions);
        Assert.NotNull(created);

        var location = createResponse.Headers.Location!;
        var path = location.IsAbsoluteUri ? location.PathAndQuery : location.OriginalString;
        Assert.Equal($"/api/work-items/{created.Id}", path);

        var getResponse = await _client.GetAsync(path);
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);

        var fetched = await getResponse.Content.ReadFromJsonAsync<WorkItemResponse>(JsonOptions);
        Assert.NotNull(fetched);
        Assert.Equal(created.Id, fetched.Id);
        Assert.Equal("Locate me", fetched.Title);
        Assert.Equal("Via Location header", fetched.Description);
        Assert.Equal(WorkItemStatus.Todo, fetched.Status);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Post_EmptyOrWhitespaceTitle_Returns400(string title)
    {
        var response = await _client.PostAsJsonAsync("/api/work-items", new { title, description = "x" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Post_TitleLongerThan120_Returns400()
    {
        var response = await _client.PostAsJsonAsync("/api/work-items", new
        {
            title = new string('a', 121)
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task PatchStatus_ValidTransition_Returns200()
    {
        var created = await CreateAsync("Advance me");

        var response = await PatchJsonAsync($"/api/work-items/{created.Id}/status", new { status = "InProgress" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<WorkItemResponse>(JsonOptions);
        Assert.Equal(WorkItemStatus.InProgress, body!.Status);
    }

    [Fact]
    public async Task PatchStatus_InvalidTransition_Returns409()
    {
        var created = await CreateAsync("Skip ahead");

        var response = await PatchJsonAsync($"/api/work-items/{created.Id}/status", new { status = "Done" });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task PatchStatus_MissingItem_Returns404()
    {
        var response = await PatchJsonAsync("/api/work-items/999999/status", new { status = "InProgress" });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task PatchStatus_StaleConcurrentUpdate_Returns409()
    {
        var created = await CreateAsync("Concurrent race");

        var first = PatchJsonAsync($"/api/work-items/{created.Id}/status", new { status = "InProgress" });
        var second = PatchJsonAsync($"/api/work-items/{created.Id}/status", new { status = "InProgress" });
        var results = await Task.WhenAll(first, second);

        var statusCodes = results.Select(r => r.StatusCode).ToArray();
        Assert.Contains(HttpStatusCode.OK, statusCodes);
        Assert.Contains(HttpStatusCode.Conflict, statusCodes);

        var conflict = results.Single(r => r.StatusCode == HttpStatusCode.Conflict);
        var problem = await conflict.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
        Assert.Equal(StatusCodes.Status409Conflict, problem!.Status);
        Assert.False(string.IsNullOrWhiteSpace(problem.Detail));

        var getResponse = await _client.GetAsync($"/api/work-items/{created.Id}");
        getResponse.EnsureSuccessStatusCode();
        var current = await getResponse.Content.ReadFromJsonAsync<WorkItemResponse>(JsonOptions);
        Assert.Equal(WorkItemStatus.InProgress, current!.Status);
    }

    [Theory]
    [InlineData("{\"status\":\"abc\"}")]
    [InlineData("{\"status\":99}")]
    public async Task PatchStatus_InvalidStatus_Returns400(string json)
    {
        var created = await CreateAsync("Bad status payload");

        using var content = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await _client.PatchAsync($"/api/work-items/{created.Id}/status", content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Get_SupportsSearchStatusAndPagination()
    {
        await CreateAsync("Alpha Task");
        await CreateAsync("Beta Task");
        await CreateAsync("Gamma Other");
        await CreateAsync("alpha again");

        var alpha = await CreateAsync("Filter Target");
        await PatchJsonAsync($"/api/work-items/{alpha.Id}/status", new { status = "InProgress" });

        var searchResponse = await _client.GetAsync("/api/work-items?search=alpha&page=1&pageSize=10");
        searchResponse.EnsureSuccessStatusCode();
        var search = await searchResponse.Content.ReadFromJsonAsync<PagedResult<WorkItemResponse>>(JsonOptions);
        Assert.NotNull(search);
        Assert.All(search.Items, i => Assert.Contains("alpha", i.Title, StringComparison.OrdinalIgnoreCase));
        Assert.True(search.TotalCount >= 2);

        var statusResponse = await _client.GetAsync("/api/work-items?status=InProgress&page=1&pageSize=10");
        statusResponse.EnsureSuccessStatusCode();
        var statusPage = await statusResponse.Content.ReadFromJsonAsync<PagedResult<WorkItemResponse>>(JsonOptions);
        Assert.NotNull(statusPage);
        Assert.All(statusPage.Items, i => Assert.Equal(WorkItemStatus.InProgress, i.Status));
        Assert.True(statusPage.TotalCount >= 1);

        var page1 = await _client.GetFromJsonAsync<PagedResult<WorkItemResponse>>(
            "/api/work-items?page=1&pageSize=2", JsonOptions);
        var page2 = await _client.GetFromJsonAsync<PagedResult<WorkItemResponse>>(
            "/api/work-items?page=2&pageSize=2", JsonOptions);

        Assert.NotNull(page1);
        Assert.NotNull(page2);
        Assert.Equal(2, page1.PageSize);
        Assert.Equal(1, page1.Page);
        Assert.Equal(2, page2.Page);
        Assert.True(page1.TotalCount >= 5);
        Assert.Equal(page1.TotalCount, page2.TotalCount);
        Assert.Equal((int)Math.Ceiling(page1.TotalCount / 2.0), page1.TotalPages);
        Assert.Equal(2, page1.Items.Count);
        Assert.DoesNotContain(page2.Items, i => page1.Items.Any(p => p.Id == i.Id));
    }

    private async Task<WorkItemResponse> CreateAsync(string title)
    {
        var response = await _client.PostAsJsonAsync("/api/work-items", new { title });
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<WorkItemResponse>(JsonOptions);
        return body!;
    }

    private Task<HttpResponseMessage> PatchJsonAsync(string url, object body)
    {
        var request = new HttpRequestMessage(HttpMethod.Patch, url)
        {
            Content = JsonContent.Create(body)
        };
        return _client.SendAsync(request);
    }
}
