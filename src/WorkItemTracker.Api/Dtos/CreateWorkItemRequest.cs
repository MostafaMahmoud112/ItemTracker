using System.ComponentModel.DataAnnotations;

namespace WorkItemTracker.Api.Dtos;

public sealed class CreateWorkItemRequest
{
    [Required]
    [MaxLength(120)]
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }
}
