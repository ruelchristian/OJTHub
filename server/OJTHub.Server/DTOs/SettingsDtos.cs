namespace OJTHub.Server.DTOs;

public record OjtSettingDto(
    Guid Id,
    string CompanyName,
    decimal WorkplaceLatitude,
    decimal WorkplaceLongitude,
    int GeofenceRadiusMeters,
    int GpsAccuracyThreshold,
    decimal TargetTotalHours,
    decimal DailyScheduleHours,
    int DefaultLunchMinutes
);

public record UpdateOjtSettingRequest(
    string CompanyName,
    decimal WorkplaceLatitude,
    decimal WorkplaceLongitude,
    int GeofenceRadiusMeters,
    int GpsAccuracyThreshold,
    decimal TargetTotalHours,
    decimal DailyScheduleHours,
    int DefaultLunchMinutes
);
