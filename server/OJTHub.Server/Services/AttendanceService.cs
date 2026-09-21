namespace OJTHub.Server.Services;

public class AttendanceService : IAttendanceService
{
    private const double EarthRadiusMeters = 6371000.0;

    public decimal CalculateDistanceMeters(decimal lat1, decimal lon1, decimal lat2, decimal lon2)
    {
        double dLat = ToRadians((double)(lat2 - lat1));
        double dLon = ToRadians((double)(lon2 - lon1));

        double rLat1 = ToRadians((double)lat1);
        double rLat2 = ToRadians((double)lat2);

        double a = Math.Sin(dLat / 2.0) * Math.Sin(dLat / 2.0) +
                   Math.Cos(rLat1) * Math.Cos(rLat2) *
                   Math.Sin(dLon / 2.0) * Math.Sin(dLon / 2.0);

        double c = 2.0 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1.0 - a));
        double distance = EarthRadiusMeters * c;

        return Math.Round((decimal)distance, 1);
    }

    public decimal CalculateNetHours(DateTimeOffset timeIn, DateTimeOffset timeOut, int lunchBreakMinutes, decimal? maxDailyHours = 16.0m)
    {
        var totalMinutes = (timeOut - timeIn).TotalMinutes;
        if (totalMinutes <= 0) return 0m;

        // Deduct lunch break only if the shift is greater than 4 hours (240 mins)
        double netMinutes = totalMinutes;
        if (totalMinutes >= 240 && lunchBreakMinutes > 0)
        {
            netMinutes = Math.Max(0, totalMinutes - lunchBreakMinutes);
        }

        double netHours = netMinutes / 60.0;
        decimal rounded = Math.Round((decimal)netHours, 2);

        // Safeguard: Cap runaway shifts at max allowable daily limit (defaults to 16.0 hours)
        if (maxDailyHours.HasValue && rounded > maxDailyHours.Value)
        {
            return maxDailyHours.Value;
        }

        return rounded;
    }

    private static double ToRadians(double degrees) => degrees * Math.PI / 180.0;
}
