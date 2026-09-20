using Microsoft.EntityFrameworkCore;
using WorkItemTracker.Api.Domain;

namespace WorkItemTracker.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<WorkItem> WorkItems => Set<WorkItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfiguration(new WorkItemConfiguration());
        base.OnModelCreating(modelBuilder);
    }
}
