using WorkItemTracker.Api.Exceptions;

namespace WorkItemTracker.Api.Domain;

public class WorkItem
{
    // Surrogate PK; assigned by the database on insert.
    public int Id { get; private set; }

    public string Title { get; private set; } = string.Empty;

    public string? Description { get; private set; }

    public WorkItemStatus Status { get; private set; }

    public DateTime CreatedAt { get; private set; }

    // EF Core materialization
    private WorkItem()
    {
    }

    public static WorkItem Create(string title, string? description)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title);

        var trimmed = title.Trim();
        if (trimmed.Length > 120)
        {
            throw new ValidationException("Title must be at most 120 characters.");
        }

        return new WorkItem
        {
            Title = trimmed,
            Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim(),
            Status = WorkItemStatus.Todo,
            CreatedAt = DateTime.UtcNow
        };
    }

    // Only Todo → InProgress → Done; anything else is a conflict.
    public void ChangeStatus(WorkItemStatus newStatus)
    {
        var isAllowed = Status switch
        {
            WorkItemStatus.Todo => newStatus == WorkItemStatus.InProgress,
            WorkItemStatus.InProgress => newStatus == WorkItemStatus.Done,
            _ => false
        };

        if (!isAllowed)
        {
            throw new InvalidStatusTransitionException(Status, newStatus);
        }

        Status = newStatus;
    }
}
