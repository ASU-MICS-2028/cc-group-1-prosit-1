using System.Text.Json.Serialization;

namespace AgroConnect.SharedLibrary.Enums;

// The answers on the registration screens. Numbers are fixed because the database stores them:
// add new values at the end, never renumber. Wire names (JSON) are fixed for the same reason.

public enum UserRole
{
    [JsonStringEnumMemberName("officer")] Officer = 0,
    [JsonStringEnumMemberName("farmer")] Farmer = 1,
}

public enum Gender
{
    [JsonStringEnumMemberName("female")] Female = 0,
    [JsonStringEnumMemberName("male")] Male = 1,
    [JsonStringEnumMemberName("other")] Other = 2,
    [JsonStringEnumMemberName("prefer_not_to_say")] PreferNotToSay = 3,
}

public enum AgeBand
{
    [JsonStringEnumMemberName("18-25")] From18To25 = 0,
    [JsonStringEnumMemberName("26-35")] From26To35 = 1,
    [JsonStringEnumMemberName("36-50")] From36To50 = 2,
    [JsonStringEnumMemberName("over_50")] Over50 = 3,
}

public enum Crop
{
    [JsonStringEnumMemberName("maize")] Maize = 0,
    [JsonStringEnumMemberName("sorghum")] Sorghum = 1,
    [JsonStringEnumMemberName("rice")] Rice = 2,
    [JsonStringEnumMemberName("groundnut")] Groundnut = 3,
    [JsonStringEnumMemberName("yam")] Yam = 4,
    [JsonStringEnumMemberName("cassava")] Cassava = 5,
}

public enum AreaUnit
{
    [JsonStringEnumMemberName("acres")] Acres = 0,
    [JsonStringEnumMemberName("hectares")] Hectares = 1,
}

public enum SoilType
{
    [JsonStringEnumMemberName("sandy")] Sandy = 0,
    [JsonStringEnumMemberName("clay")] Clay = 1,
    [JsonStringEnumMemberName("loamy")] Loamy = 2,
    [JsonStringEnumMemberName("not_sure")] NotSure = 3,
}

public enum PlantingSeason
{
    [JsonStringEnumMemberName("rainy")] Rainy = 0,
    [JsonStringEnumMemberName("dry")] Dry = 1,
}

public enum PhoneType
{
    [JsonStringEnumMemberName("smartphone")] Smartphone = 0,
    [JsonStringEnumMemberName("basic_phone")] BasicPhone = 1,
    [JsonStringEnumMemberName("no_phone")] NoPhone = 2,
}

public enum DataPurchase
{
    [JsonStringEnumMemberName("daily")] Daily = 0,
    [JsonStringEnumMemberName("weekly")] Weekly = 1,
    [JsonStringEnumMemberName("monthly")] Monthly = 2,
    [JsonStringEnumMemberName("none")] None = 3,
}

public enum ContactChannel
{
    [JsonStringEnumMemberName("sms")] Sms = 0,
    [JsonStringEnumMemberName("ussd")] Ussd = 1,
    [JsonStringEnumMemberName("call")] Call = 2,
    [JsonStringEnumMemberName("app")] App = 3,
}

public enum IncomeSource
{
    [JsonStringEnumMemberName("crops")] Crops = 0,
    [JsonStringEnumMemberName("animals")] Animals = 1,
    [JsonStringEnumMemberName("trading")] Trading = 2,
    [JsonStringEnumMemberName("other")] Other = 3,
}

public enum MobileMoneyUse
{
    [JsonStringEnumMemberName("yes")] Yes = 0,
    [JsonStringEnumMemberName("no")] No = 1,
    [JsonStringEnumMemberName("skip")] Skip = 2,
}

public enum LastAgentVisit
{
    [JsonStringEnumMemberName("never")] Never = 0,
    [JsonStringEnumMemberName("this_year")] ThisYear = 1,
    [JsonStringEnumMemberName("last_year")] LastYear = 2,
    [JsonStringEnumMemberName("longer_ago")] LongerAgo = 3,
}

public enum HelpNeed
{
    [JsonStringEnumMemberName("seeds")] Seeds = 0,
    [JsonStringEnumMemberName("fertiliser")] Fertiliser = 1,
    [JsonStringEnumMemberName("pests")] Pests = 2,
    [JsonStringEnumMemberName("market_prices")] MarketPrices = 3,
    [JsonStringEnumMemberName("weather")] Weather = 4,
    [JsonStringEnumMemberName("loans")] Loans = 5,
}

public enum VisitStatus
{
    [JsonStringEnumMemberName("planned")] Planned = 0,
    [JsonStringEnumMemberName("done")] Done = 1,
}

public enum VisitTopic
{
    [JsonStringEnumMemberName("seeds")] Seeds = 0,
    [JsonStringEnumMemberName("fertiliser")] Fertiliser = 1,
    [JsonStringEnumMemberName("pests")] Pests = 2,
    [JsonStringEnumMemberName("weather")] Weather = 3,
    [JsonStringEnumMemberName("selling")] Selling = 4,
    [JsonStringEnumMemberName("loans")] Loans = 5,
    [JsonStringEnumMemberName("storage")] Storage = 6,
}

public enum FarmObservation
{
    [JsonStringEnumMemberName("all_good")] AllGood = 0,
    [JsonStringEnumMemberName("pests")] Pests = 1,
    [JsonStringEnumMemberName("disease")] Disease = 2,
    [JsonStringEnumMemberName("dry_soil")] DrySoil = 3,
    [JsonStringEnumMemberName("flooding")] Flooding = 4,
}
