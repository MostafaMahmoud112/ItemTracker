using WorkItemTracker.Api.Domain;

namespace WorkItemTracker.Api.Dtos;

public sealed class WorkItemResponse
{
    public int Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public WorkItemStatus Status { get; init; }
    public DateTime CreatedAt { get; init; }
}
