using AgroConnect.AuthService.Providers.Implementations;
using AgroConnect.AuthService.Providers.Interfaces;
using AgroConnect.Data.Entities;
using AgroConnect.Data.Persistence;
using AgroConnect.SharedLibrary.Enums;
using AgroConnect.SharedLibrary.Messages;
using AgroConnect.SharedLibrary.Providers.Interfaces;
using Microsoft.Extensions.Options;
using NSubstitute;

namespace AgroConnect.AuthService.Tests;

[CollectionDefinition(Name)]
public sealed class DatabaseCollection : ICollectionFixture<PostgresFixture>
{
    public const string Name = "database";
}

/// <summary>Everything a sign-in handler needs, with a real database and a clock the test controls.</summary>
public abstract class AuthTestBase(PostgresFixture database) : IAsyncLifetime
{
    protected const string OfficerPhone = "+233240000001";
    protected const string FarmerPhone = "+233240001234";
    protected const string Code = "123456";
    private const string RegistrarPhone = "+233249999999";

    private AppUser? _registrar;

    protected PostgresFixture Database { get; } = database;

    protected AppDbContext Db { get; private set; } = null!;

    protected TestClock Clock { get; } = new();

    protected ISmsSender Sms { get; } = Substitute.For<ISmsSender>();

    protected ISessionProvider Session { get; } = Substitute.For<ISessionProvider>();

    protected IMessageProvider Messages { get; } = new MessageProvider([new AssemblyMessageSource(typeof(AuthOptions).Assembly)]);

    protected AuthOptions Settings { get; } = new()
    {
        SigningKey = TestSettings.SigningKey,
        FixedCode = Code,
    };

    protected IOptions<AuthOptions> Options => Microsoft.Extensions.Options.Options.Create(Settings);

    protected ILoginCodeGenerator Generator => new LoginCodeGenerator(Options);

    protected ITokenIssuer Tokens => new JwtTokenIssuer(Options, Clock);

    public async Task InitializeAsync()
    {
        await Database.ResetAsync();
        Db = Database.CreateContext();
        Session.Language.Returns(Language.English);
        Sms.SendAsync(default, default!, default).ReturnsForAnyArgs(new SmsResult(SmsOutcome.Sent));
    }

    public async Task DisposeAsync() => await Db.DisposeAsync();

    protected const string AdminPhone = "+233240000009";

    protected async Task<AppUser> AddOfficerAsync(string phone = OfficerPhone, UserRole role = UserRole.Officer)
    {
        var officer = new AppUser
        {
            Id = Guid.CreateVersion7(),
            Role = role,
            PhoneE164 = phone,
            FullName = "Fuseini Alhassan",
            Region = "Northern",
            District = "Savelugu",
            CreatedAt = Clock.UtcNow,
        };
        await using var db = Database.CreateContext();
        db.Users.Add(officer);
        await db.SaveChangesAsync();
        return officer;
    }

    protected async Task<Farmer> AddFarmerAsync(string fullName = "Ama Boateng", string phone = FarmerPhone, DateTimeOffset? createdAt = null)
    {
        // The database requires a real registering officer; one with another phone keeps OfficerPhone free for tests.
        _registrar ??= await AddOfficerAsync(RegistrarPhone);
        var at = createdAt ?? Clock.UtcNow;
        var farmer = new Farmer
        {
            Id = Guid.CreateVersion7(),
            RegisteredById = _registrar.Id,
            ConsentGiven = true,
            ConsentAt = at,
            FullName = fullName,
            PhoneE164 = phone,
            RegionDistrict = "Northern · Tolon District",
            ClientUpdatedAt = at,
            ServerUpdatedAt = at,
            CreatedAt = at,
        };
        await using var db = Database.CreateContext();
        db.Farmers.Add(farmer);
        await db.SaveChangesAsync();
        return farmer;
    }
}
