namespace AgroConnect.SharedLibrary.Messages;

/// <summary>Somewhere messages come from. Each service adds its own through AddMessages.</summary>
public interface IMessageSource
{
    IEnumerable<MessageEntry> Load();
}
