using AgroConnect.SharedLibrary.Enums;

namespace AgroConnect.SharedLibrary.Messages;

/// <summary>One line of text in one language. The JSON files hold "Lang" as a code (en, tw, ee, dag).</summary>
public sealed record MessageEntry(Language Language, string Key, string Text);
