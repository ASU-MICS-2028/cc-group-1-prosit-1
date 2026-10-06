using AgroConnect.SharedLibrary.Enums;

namespace AgroConnect.SharedLibrary.Providers.Interfaces;

/// <summary>Who is calling and in which language. Features ask this instead of reading the HTTP request.</summary>
public interface ISessionProvider
{
    /// <summary>The language of the caller (X-Language header), English when missing or unknown.</summary>
    Language Language { get; }

    /// <summary>The signed-in user, or null for anonymous calls.</summary>
    Guid? UserId { get; }

    /// <summary>For a signed-in farmer: their farmer record.</summary>
    Guid? FarmerId { get; }

    /// <summary>The signed-in user; a 401 problem if nobody is signed in.</summary>
    Guid RequireUserId();
}
