namespace OJTHub.Server.DTOs;

public record TimeInRequest(
    decimal Latitude,
    decimal Longitude,
    decimal Accuracy,
    DateTimeOffset? ClientTimestamp = null
);

public record TimeOutRequest(
    decimal Latitude,
    decimal Longitude,
    decimal Accuracy,
    int? CustomLunchMinutes = null,
    DateTimeOffset? ClientTimestamp = null
);

public record AttendanceRecordDto(
    Guid Id,
    Guid UserId,
    string UserName,
    DateOnly Date,
    DateTimeOffset TimeIn,
    decimal TimeInLatitude,
    decimal TimeInLongitude,
    decimal TimeInDistance,
    decimal TimeInGpsAccuracy,
    bool TimeInWithinGeofence,
    DateTimeOffset? TimeOut,
    decimal? TimeOutLatitude,
    decimal? TimeOutLongitude,
    decimal? TimeOutDistance,
    decimal? TimeOutGpsAccuracy,
    bool? TimeOutWithinGeofence,
    int LunchBreakMinutes,
    decimal? NetRenderedHours,
    bool IsVerified,
    DateTimeOffset? VerifiedAt,
    string? SupervisorRemark
);

public record AttendanceStatusResponse(
    bool HasActiveShift,
    AttendanceRecordDto? TodayRecord,
    OjtSettingDto? Settings
);

public record HoursSummaryDto(
    decimal TargetHours,
    decimal RenderedHours,
    decimal RemainingHours,
    decimal CompletionPercentage,
    int TotalDaysRendered
);
