using Microsoft.EntityFrameworkCore;
using WorkItemTracker.Api.Data;
using WorkItemTracker.Api.Domain;
using WorkItemTracker.Api.Dtos;
using WorkItemTracker.Api.Exceptions;

namespace WorkItemTracker.Api.Services;

public sealed class WorkItemService : IWorkItemService
{
    private readonly AppDbContext _db;

    public WorkItemService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<WorkItemResponse> CreateAsync(CreateWorkItemRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            throw new ValidationException("Title is required and cannot be empty or whitespace.");
        }

        var trimmed = request.Title.Trim();
        if (trimmed.Length > 120)
        {
            throw new ValidationException("Title must be at most 120 characters.");
        }

        var entity = WorkItem.Create(trimmed, request.Description);
        _db.WorkItems.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);

        return Map(entity);
    }

    public async Task<WorkItemResponse> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        var entity = await _db.WorkItems.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Work item with id '{id}' was not found.");

        return Map(entity);
    }

    public async Task<PagedResult<WorkItemResponse>> GetAsync(WorkItemQuery query, CancellationToken cancellationToken)
    {
        if (query.Page < 1)
        {
            throw new ValidationException("Page must be greater than or equal to 1.");
        }

        if (query.PageSize < 1 || query.PageSize > 100)
        {
            throw new ValidationException("PageSize must be between 1 and 100.");
        }

        var itemsQuery = _db.WorkItems.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim().ToLowerInvariant();
            itemsQuery = itemsQuery.Where(x => x.Title.ToLower().Contains(term));
        }

        if (query.Status is not null)
        {
            itemsQuery = itemsQuery.Where(x => x.Status == query.Status);
        }

        var totalCount = await itemsQuery.CountAsync(cancellationToken);
        var totalPages = totalCount == 0 ? 0 : (int)Math.Ceiling(totalCount / (double)query.PageSize);

        var items = await itemsQuery
            .OrderByDescending(x => x.CreatedAt)
            .ThenByDescending(x => x.Id)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(x => new WorkItemResponse
            {
                Id = x.Id,
                Title = x.Title,
                Description = x.Description,
                Status = x.Status,
                CreatedAt = x.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return new PagedResult<WorkItemResponse>
        {
            Items = items,
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = totalCount,
            TotalPages = totalPages
        };
    }

    public async Task<WorkItemResponse> ChangeStatusAsync(int id, WorkItemStatus status, CancellationToken cancellationToken)
    {
        if (!Enum.IsDefined(status))
        {
            throw new ValidationException($"Status '{status}' is not a recognized value.");
        }

        // Read without tracking — ChangeStatus validates the rule; the write is a conditional UPDATE.
        var entity = await _db.WorkItems.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new NotFoundException($"Work item with id '{id}' was not found.");

        var expectedCurrentStatus = entity.Status;
        entity.ChangeStatus(status);

        // Value-converter enums are unreliable in ExecuteUpdate WHERE clauses on SQLite;
        // use a parameterized conditional UPDATE so the Status predicate is always applied.
        var expected = expectedCurrentStatus.ToString();
        var next = status.ToString();
        var affected = await _db.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE WorkItems SET Status = {next} WHERE Id = {id} AND Status = {expected}",
            cancellationToken);

        if (affected == 0)
        {
            var stillExists = await _db.WorkItems.AsNoTracking()
                .AnyAsync(x => x.Id == id, cancellationToken);

            if (!stillExists)
            {
                throw new NotFoundException($"Work item with id '{id}' was not found.");
            }

            throw new ConcurrencyConflictException(
                $"Work item '{id}' was modified by another request. Reload the item and try again.");
        }

        return Map(entity);
    }

    private static WorkItemResponse Map(WorkItem entity) => new()
    {
        Id = entity.Id,
        Title = entity.Title,
        Description = entity.Description,
        Status = entity.Status,
        CreatedAt = entity.CreatedAt
    };
}
