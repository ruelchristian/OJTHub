using Microsoft.VisualStudio.TestTools.UnitTesting;
using OJTHub.Server.DTOs;
using OJTHub.Server.Models;
using OJTHub.Server.Services;

namespace OJTHub.Tests;

[TestClass]
public class OfflineAttendanceSyncTests
{
    private readonly AttendanceService _service = new();

    [TestMethod]
    public void TimeInRequest_AllowsOptionalClientTimestamp()
    {
        var offlinePunchTime = DateTimeOffset.UtcNow.AddHours(-2);
        var req = new TimeInRequest(14.599512m, 120.984222m, 15.0m, offlinePunchTime);

        Assert.IsNotNull(req.ClientTimestamp);
        Assert.AreEqual(offlinePunchTime, req.ClientTimestamp.Value);
    }

    [TestMethod]
    public void TimeOutRequest_AllowsOptionalClientTimestamp()
    {
        var offlinePunchTime = DateTimeOffset.UtcNow.AddMinutes(-30);
        var req = new TimeOutRequest(14.599512m, 120.984222m, 15.0m, 60, offlinePunchTime);

        Assert.IsNotNull(req.ClientTimestamp);
        Assert.AreEqual(offlinePunchTime, req.ClientTimestamp.Value);
        Assert.AreEqual(60, req.CustomLunchMinutes);
    }

    [TestMethod]
    public void NetHoursCalculation_PreservesAccurateRenderedDuration_AcrossOfflineSync()
    {
        // Trainee punched in at 8:00 AM offline, punched out at 5:00 PM offline (9 hrs gross, 1 hr lunch -> 8 hrs net)
        var today = DateTimeOffset.UtcNow.Date;
        var offlineTimeIn = new DateTimeOffset(today.Year, today.Month, today.Day, 8, 0, 0, TimeSpan.Zero);
        var offlineTimeOut = new DateTimeOffset(today.Year, today.Month, today.Day, 17, 0, 0, TimeSpan.Zero);

        var netHours = _service.CalculateNetHours(offlineTimeIn, offlineTimeOut, 60);

        Assert.AreEqual(8.0m, netHours, "Calculated net hours for genuine 8 AM to 5 PM shift minus 60m lunch must be 8.0 hours.");
    }
}
