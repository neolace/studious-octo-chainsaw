namespace RunbookApi.Application;

public static class ScopeParser
{
    public static IReadOnlyList<string> Parse(IEnumerable<string> rawValues)
    {
        return rawValues
            .SelectMany(value => value.Split([' ', ','], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            .Distinct(StringComparer.Ordinal)
            .ToArray();
    }

    public static bool HasScope(IEnumerable<string> scopes, string required)
    {
        return scopes.Contains(required, StringComparer.Ordinal);
    }
}
