using System.Text.Json;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using WorkItemTracker.Api.Exceptions;

namespace WorkItemTracker.Api.Exceptions;

public sealed class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var (statusCode, title, detail) = Map(exception);

        if (statusCode >= StatusCodes.Status500InternalServerError)
        {
            _logger.LogError(exception, "Unhandled exception");
        }
        else
        {
            _logger.LogInformation(exception, "Handled exception: {Title}", title);
        }

        var problem = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = detail,
            Type = statusCode switch
            {
                StatusCodes.Status400BadRequest => "https://tools.ietf.org/html/rfc9110#section-15.5.1",
                StatusCodes.Status404NotFound => "https://tools.ietf.org/html/rfc9110#section-15.5.5",
                StatusCodes.Status409Conflict => "https://tools.ietf.org/html/rfc9110#section-15.5.10",
                _ => "https://tools.ietf.org/html/rfc9110#section-15.6.1"
            },
            Instance = httpContext.Request.Path
        };

        httpContext.Response.StatusCode = statusCode;
        httpContext.Response.ContentType = "application/problem+json";
        await httpContext.Response.WriteAsJsonAsync(problem, cancellationToken: cancellationToken);
        return true;
    }

    private static (int StatusCode, string Title, string Detail) Map(Exception exception) =>
        exception switch
        {
            NotFoundException ex => (
                StatusCodes.Status404NotFound,
                "Not Found",
                ex.Message),
            InvalidStatusTransitionException ex => (
                StatusCodes.Status409Conflict,
                "Conflict",
                ex.Message),
            ValidationException ex => (
                StatusCodes.Status400BadRequest,
                "Bad Request",
                ex.Message),
            BadHttpRequestException ex => (
                StatusCodes.Status400BadRequest,
                "Bad Request",
                ex.Message),
            JsonException => (
                StatusCodes.Status400BadRequest,
                "Bad Request",
                "The request body is invalid or contains an unrecognized value."),
            _ => (
                StatusCodes.Status500InternalServerError,
                "An error occurred while processing your request.",
                "An unexpected error occurred.")
        };
}
