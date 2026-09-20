using WorkItemTracker.Api.Domain;

namespace WorkItemTracker.Api.Dtos;

public sealed class WorkItemQuery
{
    public string? Search { get; set; }
    public WorkItemStatus? Status { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}
