using Microsoft.VisualStudio.TestTools.UnitTesting;
using OJTHub.Server.Services;

namespace OJTHub.Tests;

[TestClass]
public class AttendanceServiceTests
{
    private AttendanceService _service = null!;

    [TestInitialize]
    public void Setup()
    {
        _service = new AttendanceService();
    }

    [TestMethod]
    public void CalculateDistanceMeters_IdenticalCoordinates_ReturnsZeroDistance()
    {
        // Arrange
        decimal lat = 14.599512m;
        decimal lon = 120.984222m;

        // Act
        var distance = _service.CalculateDistanceMeters(lat, lon, lat, lon);

        // Assert
        Assert.AreEqual(0m, distance, "Distance between identical points must be zero.");
    }

    [TestMethod]
    public void CalculateDistanceMeters_KnownCoordinates_ReturnsAccurateMeters()
    {
        // Arrange: Manila City Hall to Rizal Monument (approx ~850-950 meters)
        decimal cityHallLat = 14.5896m;
        decimal cityHallLon = 120.9816m;
        decimal rizalMonLat = 14.5818m;
        decimal rizalMonLon = 120.9770m;

        // Act
        var distance = _service.CalculateDistanceMeters(cityHallLat, cityHallLon, rizalMonLat, rizalMonLon);

        // Assert: Distance should be between 900m and 1100m
        Assert.IsTrue(distance > 800m && distance < 1200m, $"Expected ~900-1100m, but was {distance}m");
    }

    [TestMethod]
    public void CalculateNetHours_StandardEightHourShiftWithLunch_DeductsLunchCorrectly()
    {
        // Arrange: 8:00 AM to 5:00 PM (9 hours elapsed) with 60 min lunch
        var timeIn = new DateTimeOffset(2026, 9, 11, 8, 0, 0, TimeSpan.Zero);
        var timeOut = new DateTimeOffset(2026, 9, 11, 17, 0, 0, TimeSpan.Zero);
        int lunchMins = 60;

        // Act
        var netHours = _service.CalculateNetHours(timeIn, timeOut, lunchMins);

        // Assert: 9 hours - 1 hour lunch = 8.00 net hours
        Assert.AreEqual(8.00m, netHours);
    }

    [TestMethod]
    public void CalculateNetHours_ShortShiftUnderFourHours_DoesNotDeductLunch()
    {
        // Arrange: 8:00 AM to 11:00 AM (3 hours elapsed)
        var timeIn = new DateTimeOffset(2026, 9, 11, 8, 0, 0, TimeSpan.Zero);
        var timeOut = new DateTimeOffset(2026, 9, 11, 11, 0, 0, TimeSpan.Zero);
        int lunchMins = 60;

        // Act
        var netHours = _service.CalculateNetHours(timeIn, timeOut, lunchMins);

        // Assert: Short shift under 4 hours does not deduct lunch
        Assert.AreEqual(3.00m, netHours);
    }

    [TestMethod]
    public void CalculateNetHours_InvalidOrNegativeTime_ReturnsZero()
    {
        // Arrange: Time-out before time-in
        var timeIn = new DateTimeOffset(2026, 9, 11, 17, 0, 0, TimeSpan.Zero);
        var timeOut = new DateTimeOffset(2026, 9, 11, 8, 0, 0, TimeSpan.Zero);

        // Act
        var netHours = _service.CalculateNetHours(timeIn, timeOut, 60);

        // Assert
        Assert.AreEqual(0m, netHours);
    }

    [TestMethod]
    public void CalculateNetHours_RunawayShiftOverMaxCap_CapsAtSpecifiedMaxDailyHours()
    {
        // Arrange: Shift running for 36 hours (e.g. forgot to time out over weekend)
        var timeIn = new DateTimeOffset(2026, 9, 11, 8, 0, 0, TimeSpan.Zero);
        var timeOut = timeIn.AddHours(36);

        // Act: Apply 16-hour cap
        var netHours = _service.CalculateNetHours(timeIn, timeOut, 60, 16.0m);

        // Assert: Must be capped at 16.00 hours
        Assert.AreEqual(16.00m, netHours, "Runaway shift duration exceeding cap must be limited to maxDailyHours.");
    }

    [TestMethod]
    public void CalculateNetHours_TenHourConfigurableCap_CapsAtTenHours()
    {
        // Arrange: Student shift running 16 hours (e.g. forgot to time out) with teacher 10.0h cap (8h regular + 2h OT)
        var timeIn = new DateTimeOffset(2026, 9, 11, 8, 0, 0, TimeSpan.Zero);
        var timeOut = timeIn.AddHours(16);

        // Act: Apply 10-hour cap (8h regular + 2h overtime)
        var netHours = _service.CalculateNetHours(timeIn, timeOut, 60, 10.0m);

        // Assert: Must be capped at 10.00 hours
        Assert.AreEqual(10.00m, netHours, "Shift exceeding teacher-configured 10h cap must be capped at 10.00 hours.");
    }

    [TestMethod]
    public void CalculateNetHours_EarlyTimeOutUnderFourHours_CalculatesExactFractionalHoursWithoutLunchDeduction()
    {
        // Arrange: Student times out early after 2 hours 15 minutes (2.25 hours) e.g. feeling sick
        var timeIn = new DateTimeOffset(2026, 9, 11, 8, 0, 0, TimeSpan.Zero);
        var timeOut = timeIn.AddHours(2.25);

        // Act
        var netHours = _service.CalculateNetHours(timeIn, timeOut, 60, 10.0m);

        // Assert: Under 4 hours, no lunch deduction; exact 2.25 hours credited
        Assert.AreEqual(2.25m, netHours, "Early time-out under 4 hours must credit exact elapsed hours without lunch deduction.");
    }

    [TestMethod]
    public void CalculateNetHours_EarlyTimeOutHalfDayFiveHours_DeductsLunchAccurately()
    {
        // Arrange: Student leaves early after 5 hours (e.g. half-day permission), 60m lunch
        var timeIn = new DateTimeOffset(2026, 9, 11, 8, 0, 0, TimeSpan.Zero);
        var timeOut = timeIn.AddHours(5.0);

        // Act: 5.0h elapsed - 1.0h lunch = 4.0h net
        var netHours = _service.CalculateNetHours(timeIn, timeOut, 60, 10.0m);

        // Assert
        Assert.AreEqual(4.00m, netHours, "Early time-out over 4 hours must deduct lunch correctly.");
    }
}
