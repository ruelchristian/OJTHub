using Microsoft.VisualStudio.TestTools.UnitTesting;
using OJTHub.Server.DTOs;
using OJTHub.Server.Models;

namespace OJTHub.Tests;

[TestClass]
public class PerimeterAuditTests
{
    [TestMethod]
    public void PerimeterLog_DepartedEvent_IncrementsBreachCount()
    {
        // Arrange
        var recordId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var record = new AttendanceRecord
        {
            Id = recordId,
            UserId = userId,
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            TimeIn = DateTimeOffset.UtcNow.AddHours(-3),
            TimeInWithinGeofence = true,
            PerimeterBreachCount = 0
        };

        // Act: Log a departure event
        var departureLog = new PerimeterLog
        {
            Id = Guid.NewGuid(),
            AttendanceRecordId = record.Id,
            UserId = userId,
            Timestamp = DateTimeOffset.UtcNow.AddHours(-1),
            EventType = "Departed",
            Latitude = 14.605000m,
            Longitude = 120.990000m,
            DistanceMeters = 350.5m,
            GpsAccuracy = 15.0m,
            Note = "Stepped outside geofence perimeter"
        };
        record.PerimeterLogs.Add(departureLog);
        record.PerimeterBreachCount++;

        // Assert
        Assert.AreEqual(1, record.PerimeterBreachCount);
        Assert.HasCount(1, record.PerimeterLogs);
        Assert.AreEqual("Departed", record.PerimeterLogs[0].EventType);
        Assert.AreEqual(350.5m, record.PerimeterLogs[0].DistanceMeters);
    }

    [TestMethod]
    public void PerimeterLog_ReturnedEvent_DoesNotIncrementBreachCount()
    {
        // Arrange
        var recordId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var record = new AttendanceRecord
        {
            Id = recordId,
            UserId = userId,
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            TimeIn = DateTimeOffset.UtcNow.AddHours(-4),
            PerimeterBreachCount = 1
        };

        // Act: Log a return event
        var returnLog = new PerimeterLog
        {
            Id = Guid.NewGuid(),
            AttendanceRecordId = record.Id,
            UserId = userId,
            Timestamp = DateTimeOffset.UtcNow.AddMinutes(-30),
            EventType = "Returned",
            Latitude = 14.599512m,
            Longitude = 120.984222m,
            DistanceMeters = 32.0m,
            GpsAccuracy = 10.0m,
            Note = "Re-entered geofence perimeter"
        };
        record.PerimeterLogs.Add(returnLog);

        // Assert: Breach count remains 1, but logs count is 1
        Assert.AreEqual(1, record.PerimeterBreachCount);
        Assert.AreEqual("Returned", record.PerimeterLogs[0].EventType);
        Assert.AreEqual(32.0m, record.PerimeterLogs[0].DistanceMeters);
    }

    [TestMethod]
    public void AttendanceRecordDto_ProjectsPerimeterAuditTrail()
    {
        // Arrange
        var recordId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var departedTime = DateTimeOffset.UtcNow.AddHours(-2);
        var returnedTime = DateTimeOffset.UtcNow.AddHours(-1);

        var record = new AttendanceRecord
        {
            Id = recordId,
            UserId = userId,
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            TimeIn = DateTimeOffset.UtcNow.AddHours(-4),
            TimeInWithinGeofence = true,
            PerimeterBreachCount = 1,
            PerimeterLogs = new List<PerimeterLog>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    AttendanceRecordId = recordId,
                    UserId = userId,
                    Timestamp = departedTime,
                    EventType = "Departed",
                    DistanceMeters = 220.0m,
                    GpsAccuracy = 12.0m
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    AttendanceRecordId = recordId,
                    UserId = userId,
                    Timestamp = returnedTime,
                    EventType = "Returned",
                    DistanceMeters = 40.0m,
                    GpsAccuracy = 8.0m
                }
            }
        };

        // Act: Map to DTO
        var dto = new AttendanceRecordDto(
            record.Id,
            record.UserId,
            "John Doe",
            record.Date,
            record.TimeIn,
            record.TimeInLatitude,
            record.TimeInLongitude,
            record.TimeInDistance,
            record.TimeInGpsAccuracy,
            record.TimeInWithinGeofence,
            record.TimeOut,
            record.TimeOutLatitude,
            record.TimeOutLongitude,
            record.TimeOutDistance,
            record.TimeOutGpsAccuracy,
            record.TimeOutWithinGeofence,
            record.LunchBreakMinutes,
            record.NetRenderedHours,
            record.IsVerified,
            record.VerifiedAt,
            record.SupervisorRemark,
            record.PerimeterBreachCount,
            record.PerimeterLogs.Select(p => new PerimeterLogDto(
                p.Id, p.AttendanceRecordId, p.UserId, p.Timestamp, p.EventType,
                p.Latitude, p.Longitude, p.DistanceMeters, p.GpsAccuracy, p.Note
            )).ToList()
        );

        // Assert
        Assert.AreEqual(1, dto.PerimeterBreachCount);
        Assert.IsNotNull(dto.PerimeterLogs);
        Assert.HasCount(2, dto.PerimeterLogs);
        Assert.AreEqual("Departed", dto.PerimeterLogs[0].EventType);
        Assert.AreEqual("Returned", dto.PerimeterLogs[1].EventType);
    }
}
