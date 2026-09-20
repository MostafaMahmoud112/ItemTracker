using WorkItemTracker.Api.Domain;

namespace WorkItemTracker.Api.Exceptions;

public sealed class InvalidStatusTransitionException : Exception
{
    public WorkItemStatus From { get; }
    public WorkItemStatus To { get; }

    public InvalidStatusTransitionException(WorkItemStatus from, WorkItemStatus to)
        : base($"Cannot transition work item status from '{from}' to '{to}'.")
    {
        From = from;
        To = to;
    }
}
