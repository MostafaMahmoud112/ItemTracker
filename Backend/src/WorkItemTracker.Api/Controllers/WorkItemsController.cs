using Microsoft.AspNetCore.Mvc;
using WorkItemTracker.Api.Domain;
using WorkItemTracker.Api.Dtos;
using WorkItemTracker.Api.Services;

namespace WorkItemTracker.Api.Controllers;

[ApiController]
[Route("api/work-items")]
public sealed class WorkItemsController : ControllerBase
{
    private readonly IWorkItemService _workItemService;

    public WorkItemsController(IWorkItemService workItemService)
    {
        _workItemService = workItemService;
    }

    [HttpPost]
    [ProducesResponseType(typeof(WorkItemResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<WorkItemResponse>> Create(
        [FromBody] CreateWorkItemRequest request,
        CancellationToken cancellationToken)
    {
        var created = await _workItemService.CreateAsync(request, cancellationToken);
        return Created($"/api/work-items/{created.Id}", created);
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<WorkItemResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedResult<WorkItemResponse>>> Get(
        [FromQuery] string? search,
        [FromQuery] WorkItemStatus? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        var result = await _workItemService.GetAsync(
            new WorkItemQuery
            {
                Search = search,
                Status = status,
                Page = page,
                PageSize = pageSize
            },
            cancellationToken);

        return Ok(result);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(WorkItemResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<WorkItemResponse>> GetById(int id, CancellationToken cancellationToken)
    {
        var item = await _workItemService.GetByIdAsync(id, cancellationToken);
        return Ok(item);
    }

    [HttpPatch("{id:int}/status")]
    [ProducesResponseType(typeof(WorkItemResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<WorkItemResponse>> ChangeStatus(
        int id,
        [FromBody] UpdateWorkItemStatusRequest request,
        CancellationToken cancellationToken)
    {
        var updated = await _workItemService.ChangeStatusAsync(id, request.Status!.Value, cancellationToken);
        return Ok(updated);
    }
}
