using RunbookApi.Web.Configuration;

namespace RunbookApi.Web.UnitTests;

public sealed class CognitoOptionsTests
{
    [Fact]
    public void PlaceholdersAreNotConfigured()
    {
        var options = new CognitoOptions
        {
            Region = "<AWS_REGION>",
            UserPoolId = "<COGNITO_USER_POOL_ID>",
            ClientId = "<COGNITO_CLIENT_ID>"
        };

        Assert.False(options.IsConfigured);
    }

    [Fact]
    public void EmptyValuesAreNotConfigured()
    {
        Assert.False(new CognitoOptions().IsConfigured);
    }

    [Fact]
    public void RealValuesAreConfigured()
    {
        var options = new CognitoOptions
        {
            Region = "us-east-1",
            UserPoolId = "us-east-1_example",
            ClientId = "abc123client"
        };

        Assert.True(options.IsConfigured);
        Assert.Equal("https://cognito-idp.us-east-1.amazonaws.com/us-east-1_example", options.Authority);
    }
}
