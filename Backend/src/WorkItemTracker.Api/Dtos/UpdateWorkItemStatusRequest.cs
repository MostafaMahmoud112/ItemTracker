using System.ComponentModel.DataAnnotations;
using WorkItemTracker.Api.Domain;

namespace WorkItemTracker.Api.Dtos;

public sealed class UpdateWorkItemStatusRequest
{
    [Required]
    public WorkItemStatus? Status { get; set; }
}
