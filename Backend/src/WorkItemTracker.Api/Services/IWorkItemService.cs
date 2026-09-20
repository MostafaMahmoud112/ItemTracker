using WorkItemTracker.Api.Domain;
using WorkItemTracker.Api.Dtos;

namespace WorkItemTracker.Api.Services;

public interface IWorkItemService
{
    Task<WorkItemResponse> CreateAsync(CreateWorkItemRequest request, CancellationToken cancellationToken);

    Task<WorkItemResponse> GetByIdAsync(int id, CancellationToken cancellationToken);

    Task<PagedResult<WorkItemResponse>> GetAsync(WorkItemQuery query, CancellationToken cancellationToken);

    Task<WorkItemResponse> ChangeStatusAsync(int id, WorkItemStatus status, CancellationToken cancellationToken);
}
