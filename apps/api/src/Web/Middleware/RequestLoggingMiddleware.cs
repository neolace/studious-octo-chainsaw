using System.Diagnostics;

using RunbookApi.Web.Authentication;

namespace RunbookApi.Web.Middleware;

/// <summary>
/// Assigns (or echoes) a correlation ID and writes one structured log entry per request:
/// correlation ID, method, path, matched route, status, duration and — once the
/// authentication middleware has run — the authenticated subject. Never logs headers or tokens.
/// </summary>
public sealed partial class RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
{
    public const string CorrelationHeaderName = "X-Correlation-ID";

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = context.Request.Headers[CorrelationHeaderName].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(correlationId))
        {
            correlationId = context.TraceIdentifier;
        }

        context.Items[CorrelationHeaderName] = correlationId;
        context.Response.OnStarting(() =>
        {
            context.Response.Headers[CorrelationHeaderName] = correlationId;
            return Task.CompletedTask;
        });

        var started = Stopwatch.GetTimestamp();
        try
        {
            await next(context);
        }
        finally
        {
            if (logger.IsEnabled(LogLevel.Information))
            {
                var route = context.GetEndpoint()?.DisplayName;
                var subject = context.User.GetSubject();
                var durationMs = Stopwatch.GetElapsedTime(started).TotalMilliseconds;
                LogRequest(
                    logger,
                    correlationId,
                    context.Request.Method,
                    context.Request.Path,
                    route,
                    context.Response.StatusCode,
                    durationMs,
                    subject);
            }
        }
    }

    [LoggerMessage(
        EventId = 1000,
        Level = LogLevel.Information,
        Message = "{Method} {Path} -> {StatusCode} in {DurationMs:0.0}ms (route={Route}, subject={Subject}, correlationId={CorrelationId})")]
    private static partial void LogRequest(
        ILogger logger,
        string correlationId,
        string method,
        PathString path,
        string? route,
        int statusCode,
        double durationMs,
        string? subject);
}
