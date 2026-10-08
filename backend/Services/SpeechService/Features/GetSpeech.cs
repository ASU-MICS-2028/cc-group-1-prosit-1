using System.Security.Cryptography;
using System.Text;
using AgroConnect.Data.Entities;
using AgroConnect.Data.Persistence;
using AgroConnect.SharedLibrary.Errors;
using AgroConnect.SharedLibrary.Features;
using AgroConnect.SharedLibrary.Providers.Interfaces;
using AgroConnect.SpeechService.Providers;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace AgroConnect.SpeechService.Features;

/// <summary>
/// GET /api/speech?lang=tw&amp;text=...: the English sentence read aloud in Twi, Ewe or Dagbani. Open without
/// sign-in (the language picker speaks before anyone signs in), rate-limited, and each sentence is made once
/// and kept (speech_clips). English and "no key" answer 404, and the app uses the phone's voice.
/// </summary>
public sealed class GetSpeech : IFeature
{
    public const int MaxText = 500;
    private static readonly string[] Spoken = ["tw", "ee", "dag"];

    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapGet("/api/speech", Handle)
            .WithName("GetSpeech")
            .WithTags("Speech")
            .AllowAnonymous()
            .RequireRateLimiting(SpeechServiceExtension.RateLimitPolicy)
            .Produces(StatusCodes.Status200OK, contentType: "audio/wav")
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound);

    public static async Task<IResult> Handle(
        string lang,
        string text,
        HttpContext http,
        AppDbContext db,
        ISpeechProvider speech,
        IClock clock,
        CancellationToken cancellationToken)
    {
        var english = (text ?? "").Trim();
        if (english.Length is 0 or > MaxText)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "SPEECH_TEXT_INVALID");
        }

        var language = (lang ?? "").Trim().ToLowerInvariant();
        if (!Spoken.Contains(language))
        {
            throw new ApiException(StatusCodes.Status404NotFound, "SPEECH_NOT_AVAILABLE");
        }

        var hash = Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(english)));
        var clip = await db.SpeechClips.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Language == language && c.TextHash == hash, cancellationToken);
        if (clip is null)
        {
            var spoken = speech.IsLive ? await speech.SpeakAsync(english, language, cancellationToken) : null;
            if (spoken is null)
            {
                throw new ApiException(StatusCodes.Status404NotFound, "SPEECH_NOT_AVAILABLE");
            }

            clip = new SpeechClip
            {
                Id = Guid.CreateVersion7(clock.UtcNow),
                Language = language,
                TextHash = hash,
                Text = english,
                Translated = spoken.Translated.Length > 1500 ? spoken.Translated[..1500] : spoken.Translated,
                ContentType = spoken.ContentType,
                Audio = spoken.Audio,
                CreatedAt = clock.UtcNow,
            };
            db.SpeechClips.Add(clip);
            try
            {
                await db.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException)
            {
                // Two people asked for the same sentence at once: the other copy is already saved.
            }
        }

        // The same sentence never changes: phones and CloudFront can keep it.
        http.Response.Headers.CacheControl = "public, max-age=2592000";
        return TypedResults.File(clip.Audio, clip.ContentType);
    }
}
