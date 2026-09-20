using Microsoft.EntityFrameworkCore;
using WorkItemTracker.Api.Domain;

namespace WorkItemTracker.Api.Data;

public static class DbSeeder
{
    public static async Task ResetWithSampleDataAsync(AppDbContext db, CancellationToken cancellationToken = default)
    {
        await db.WorkItems.ExecuteDeleteAsync(cancellationToken);

        var samples = new (string Title, string? Description, WorkItemStatus Status, DateTime CreatedAt)[]
        {
            ("Draft Q3 roadmap presentation", "Slides for the product sync on Monday morning.", WorkItemStatus.Todo, DateTime.UtcNow.AddDays(-5)),
            ("Review API contract with frontend", "Confirm pagination and status enum strings match the Angular models.", WorkItemStatus.InProgress, DateTime.UtcNow.AddDays(-3)),
            ("Fix SQLite migration on clean clone", "Ensure MigrateAsync runs in Development without manual steps.", WorkItemStatus.Done, DateTime.UtcNow.AddDays(-10)),
            ("Write onboarding notes for new hires", "Short checklist: run API, run Angular, seed data, open Swagger.", WorkItemStatus.Todo, DateTime.UtcNow.AddDays(-1)),
            ("Polish empty and error states", "Skeleton loaders and clear copy for no-results vs no-items.", WorkItemStatus.InProgress, DateTime.UtcNow.AddHours(-20)),
            ("Verify CORS for localhost:4200", "Create, list, and patch status from the UI through the proxy.", WorkItemStatus.Done, DateTime.UtcNow.AddDays(-7)),
            ("Add bilingual labels smoke check", "Toggle EN/AR and confirm RTL layout does not break cards.", WorkItemStatus.Todo, DateTime.UtcNow.AddHours(-6)),
            ("Prepare demo script for stakeholders", "Happy path: create item, start it, complete it, show 409 on invalid transition.", WorkItemStatus.Todo, DateTime.UtcNow.AddHours(-2)),
        };

        foreach (var sample in samples)
        {
            var item = WorkItem.Create(sample.Title, sample.Description);

            if (sample.Status is WorkItemStatus.InProgress or WorkItemStatus.Done)
            {
                item.ChangeStatus(WorkItemStatus.InProgress);
            }

            if (sample.Status is WorkItemStatus.Done)
            {
                item.ChangeStatus(WorkItemStatus.Done);
            }

            db.WorkItems.Add(item);
            await db.SaveChangesAsync(cancellationToken);

            db.Entry(item).Property(x => x.CreatedAt).CurrentValue = sample.CreatedAt;
            await db.SaveChangesAsync(cancellationToken);
        }
    }
}
