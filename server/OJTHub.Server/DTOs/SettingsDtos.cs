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
    int DefaultLunchMinutes,
    bool IsLocked = false,
    string? ManagedBySupervisorName = null,
    Guid? SupervisorId = null
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
