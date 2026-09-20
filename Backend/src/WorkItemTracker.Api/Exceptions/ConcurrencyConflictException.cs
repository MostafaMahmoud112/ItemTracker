namespace WorkItemTracker.Api.Exceptions;

public sealed class ConcurrencyConflictException : Exception
{
    public ConcurrencyConflictException(string message) : base(message)
    {
    }
}
