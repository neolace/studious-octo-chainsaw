namespace RunbookApi.Web.Configuration;

public sealed class CognitoOptions
{
    public const string SectionName = "Cognito";

    public string Region { get; set; } = string.Empty;
    public string UserPoolId { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;

    public bool IsConfigured =>
        IsAssigned(Region) && IsAssigned(UserPoolId) && IsAssigned(ClientId);

    private static bool IsAssigned(string value) =>
        !string.IsNullOrWhiteSpace(value)
        && !(value.StartsWith('<') && value.EndsWith('>'));

    public string Authority => $"https://cognito-idp.{Region}.amazonaws.com/{UserPoolId}";
}
