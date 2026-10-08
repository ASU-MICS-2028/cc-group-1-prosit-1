using AgroConnect.SharedLibrary.Enums;

namespace AgroConnect.HelpService.Models;

/// <summary>A new question. Text, a voice note (base64, up to about 2 minutes), or both.</summary>
public sealed record AskRequest(
    HelpCategory Category,
    string? Text,
    Crop? Crop,
    string? Problem,
    string? VoiceNoteBase64,
    string? VoiceNoteType,
    int? VoiceSeconds);

/// <summary>One step of the request's progress (Figma P4 · 04).</summary>
public sealed record HelpStep(string Step, DateTimeOffset? At);

/// <summary>A question as the farmer sees it.</summary>
public sealed record HelpRequestInfo(
    Guid Id,
    HelpCategory Category,
    string? Text,
    Crop? Crop,
    string? Problem,
    bool HasVoiceNote,
    int? VoiceSeconds,
    HelpStatus Status,
    string? OfficerName,
    string? Answer,
    DateTimeOffset? AnsweredAt,
    DateTimeOffset CreatedAt);

public sealed record FeedbackRequest(bool Helped);

/// <summary>A question as the officer (Requests) or the admin (Help desk) sees it.</summary>
public sealed record RequestItem(
    Guid Id,
    Guid FarmerId,
    string FarmerName,
    string? Community,
    HelpCategory Category,
    string? Text,
    Crop? Crop,
    string? Problem,
    bool HasVoiceNote,
    int? VoiceSeconds,
    HelpStatus Status,
    Guid? OfficerId,
    string? OfficerName,
    string? Answer,
    bool Overdue,
    DateTimeOffset CreatedAt,
    DateTimeOffset? AnsweredAt,
    DateTimeOffset? RemindedAt);

public sealed record AnswerRequest(string Advice);

/// <summary>The officer's Requests page.</summary>
public sealed record OfficerRequests(int Open, IReadOnlyList<RequestItem> Requests);

/// <summary>An officer the admin can give a request to, with how many open requests they have.</summary>
public sealed record OfficerLoad(Guid Id, string FullName, string? District, int Open);

/// <summary>The admin's Help desk: counts, every request in the area, and the officers to reassign to.</summary>
public sealed record HelpDesk(
    int Waiting,
    int Overdue,
    int Answered,
    IReadOnlyList<RequestItem> Requests,
    IReadOnlyList<OfficerLoad> Officers);

public sealed record ReassignRequest(Guid OfficerId);
