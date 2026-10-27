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
    Guid? SupervisorId = null,
    decimal MaxDailyHours = 10.0m
);

public record UpdateOjtSettingRequest(
    string CompanyName,
    decimal WorkplaceLatitude,
    decimal WorkplaceLongitude,
    int GeofenceRadiusMeters,
    int GpsAccuracyThreshold,
    decimal TargetTotalHours,
    decimal DailyScheduleHours,
    int DefaultLunchMinutes,
    decimal MaxDailyHours = 10.0m
);
