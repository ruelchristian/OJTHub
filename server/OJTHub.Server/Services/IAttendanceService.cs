namespace OJTHub.Server.Services;

public interface IAttendanceService
{
    decimal CalculateDistanceMeters(decimal lat1, decimal lon1, decimal lat2, decimal lon2);
    decimal CalculateNetHours(DateTimeOffset timeIn, DateTimeOffset timeOut, int lunchBreakMinutes, decimal? maxDailyHours = 16.0m);
}
