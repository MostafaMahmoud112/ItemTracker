using WorkItemTracker.Api.Domain;
using WorkItemTracker.Api.Exceptions;

namespace WorkItemTracker.Tests.Domain;

public class WorkItemStatusTransitionTests
{
    [Theory]
    [InlineData(WorkItemStatus.Todo, WorkItemStatus.InProgress)]
    [InlineData(WorkItemStatus.InProgress, WorkItemStatus.Done)]
    public void ChangeStatus_AllowsValidTransitions(WorkItemStatus from, WorkItemStatus to)
    {
        var item = CreateWithStatus(from);

        item.ChangeStatus(to);

        Assert.Equal(to, item.Status);
    }

    [Theory]
    [InlineData(WorkItemStatus.Todo, WorkItemStatus.Todo)]
    [InlineData(WorkItemStatus.Todo, WorkItemStatus.Done)]
    [InlineData(WorkItemStatus.InProgress, WorkItemStatus.InProgress)]
    [InlineData(WorkItemStatus.InProgress, WorkItemStatus.Todo)]
    [InlineData(WorkItemStatus.Done, WorkItemStatus.Done)]
    [InlineData(WorkItemStatus.Done, WorkItemStatus.Todo)]
    [InlineData(WorkItemStatus.Done, WorkItemStatus.InProgress)]
    public void ChangeStatus_RejectsInvalidTransitions(WorkItemStatus from, WorkItemStatus to)
    {
        var item = CreateWithStatus(from);

        var ex = Assert.Throws<InvalidStatusTransitionException>(() => item.ChangeStatus(to));

        Assert.Equal(from, ex.From);
        Assert.Equal(to, ex.To);
        Assert.Equal(from, item.Status);
    }

    private static WorkItem CreateWithStatus(WorkItemStatus status)
    {
        var item = WorkItem.Create("Sample", null);

        if (status is WorkItemStatus.InProgress or WorkItemStatus.Done)
        {
            item.ChangeStatus(WorkItemStatus.InProgress);
        }

        if (status is WorkItemStatus.Done)
        {
            item.ChangeStatus(WorkItemStatus.Done);
        }

        return item;
    }
}
