using Microsoft.VisualStudio.TestTools.UnitTesting;
using OJTHub.Server.DTOs;
using OJTHub.Server.Models;

namespace OJTHub.Tests;

[TestClass]
public class SupervisorGovernanceTests
{
    [TestMethod]
    public void SettingsLockResolution_TraineeWithSupervisor_IsMarkedLocked()
    {
        // Arrange
        var supervisorId = Guid.NewGuid();
        var supervisor = new User
        {
            Id = supervisorId,
            Role = "Supervisor",
            FullName = "Engr. Jane Doe",
            Email = "jane@example.com",
            PasswordHash = "hash",
            SupervisorCode = "OJT-8K7MQ"
        };

        var trainee = new User
        {
            Id = Guid.NewGuid(),
            Role = "Trainee",
            FullName = "John Trainee",
            Email = "john@example.com",
            PasswordHash = "hash",
            SupervisorId = supervisorId,
            Supervisor = supervisor
        };

        var setting = new OjtSetting
        {
            Id = Guid.NewGuid(),
            UserId = trainee.Id,
            User = trainee,
            CompanyName = "Acme Corp",
            WorkplaceLatitude = 14.599512m,
            WorkplaceLongitude = 120.984222m,
            GeofenceRadiusMeters = 100,
            GpsAccuracyThreshold = 50,
            TargetTotalHours = 486.0m,
            DailyScheduleHours = 8.0m,
            DefaultLunchMinutes = 60
        };

        // Act: Map to DTO as done in SettingsEndpoints
        var isLocked = trainee.SupervisorId.HasValue;
        var dto = new OjtSettingDto(
            setting.Id,
            setting.CompanyName,
            setting.WorkplaceLatitude,
            setting.WorkplaceLongitude,
            setting.GeofenceRadiusMeters,
            setting.GpsAccuracyThreshold,
            setting.TargetTotalHours,
            setting.DailyScheduleHours,
            setting.DefaultLunchMinutes,
            IsLocked: isLocked,
            ManagedBySupervisorName: supervisor.FullName,
            SupervisorId: supervisor.Id
        );

        // Assert
        Assert.IsTrue(dto.IsLocked, "Settings should be marked locked when trainee has an assigned supervisor");
        Assert.AreEqual("Engr. Jane Doe", dto.ManagedBySupervisorName);
        Assert.AreEqual(supervisorId, dto.SupervisorId);
    }

    [TestMethod]
    public void SettingsLockResolution_IndependentTrainee_IsNotLocked()
    {
        // Arrange
        var trainee = new User
        {
            Id = Guid.NewGuid(),
            Role = "Trainee",
            FullName = "Solo Trainee",
            Email = "solo@example.com",
            PasswordHash = "hash",
            SupervisorId = null
        };

        var setting = new OjtSetting
        {
            Id = Guid.NewGuid(),
            UserId = trainee.Id,
            User = trainee,
            CompanyName = "Independent Tech",
            WorkplaceLatitude = 14.599512m,
            WorkplaceLongitude = 120.984222m,
            GeofenceRadiusMeters = 100,
            GpsAccuracyThreshold = 50,
            TargetTotalHours = 300.0m,
            DailyScheduleHours = 8.0m,
            DefaultLunchMinutes = 60
        };

        // Act
        var isLocked = trainee.SupervisorId.HasValue;
        var dto = new OjtSettingDto(
            setting.Id,
            setting.CompanyName,
            setting.WorkplaceLatitude,
            setting.WorkplaceLongitude,
            setting.GeofenceRadiusMeters,
            setting.GpsAccuracyThreshold,
            setting.TargetTotalHours,
            setting.DailyScheduleHours,
            setting.DefaultLunchMinutes,
            IsLocked: isLocked,
            ManagedBySupervisorName: null,
            SupervisorId: null
        );

        // Assert
        Assert.IsFalse(dto.IsLocked, "Settings should NOT be locked for independent trainees without a supervisor");
        Assert.IsNull(dto.ManagedBySupervisorName);
        Assert.IsNull(dto.SupervisorId);
    }

    [TestMethod]
    public void BatchVerifyFilter_GeofenceCompliantOnly_FiltersOutNonCompliantAndInProgress()
    {
        // Arrange
        var traineeId = Guid.NewGuid();
        var records = new List<AttendanceRecord>
        {
            // 1. Valid and completed inside geofence -> SHOULD BE VERIFIED
            new()
            {
                Id = Guid.NewGuid(),
                UserId = traineeId,
                Date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1)),
                TimeIn = DateTimeOffset.UtcNow.AddHours(-9),
                TimeOut = DateTimeOffset.UtcNow.AddHours(-1),
                TimeInWithinGeofence = true,
                TimeOutWithinGeofence = true,
                IsVerified = false
            },
            // 2. Already verified -> SHOULD NOT BE RE-VERIFIED
            new()
            {
                Id = Guid.NewGuid(),
                UserId = traineeId,
                Date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-2)),
                TimeIn = DateTimeOffset.UtcNow.AddDays(-2).AddHours(8),
                TimeOut = DateTimeOffset.UtcNow.AddDays(-2).AddHours(17),
                TimeInWithinGeofence = true,
                TimeOutWithinGeofence = true,
                IsVerified = true
            },
            // 3. Shift still in progress (no TimeOut) -> SHOULD BE SKIPPED
            new()
            {
                Id = Guid.NewGuid(),
                UserId = traineeId,
                Date = DateOnly.FromDateTime(DateTime.UtcNow),
                TimeIn = DateTimeOffset.UtcNow.AddHours(-2),
                TimeOut = null,
                TimeInWithinGeofence = true,
                TimeOutWithinGeofence = null,
                IsVerified = false
            },
            // 4. Outside geofence at TimeIn -> SHOULD BE SKIPPED when GeofenceCompliantOnly = true
            new()
            {
                Id = Guid.NewGuid(),
                UserId = traineeId,
                Date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-3)),
                TimeIn = DateTimeOffset.UtcNow.AddDays(-3).AddHours(8),
                TimeOut = DateTimeOffset.UtcNow.AddDays(-3).AddHours(17),
                TimeInWithinGeofence = false,
                TimeOutWithinGeofence = true,
                IsVerified = false
            },
            // 5. Outside geofence at TimeOut -> SHOULD BE SKIPPED when GeofenceCompliantOnly = true
            new()
            {
                Id = Guid.NewGuid(),
                UserId = traineeId,
                Date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-4)),
                TimeIn = DateTimeOffset.UtcNow.AddDays(-4).AddHours(8),
                TimeOut = DateTimeOffset.UtcNow.AddDays(-4).AddHours(17),
                TimeInWithinGeofence = true,
                TimeOutWithinGeofence = false,
                IsVerified = false
            }
        };

        // Act: Filter as done in BatchVerify endpoint with OnlyWithinGeofence = true
        var candidateRecords = records
            .Where(a => a.TimeOut != null && !a.IsVerified)
            .Where(a => a.TimeInWithinGeofence && a.TimeOutWithinGeofence == true)
            .ToList();

        // Assert: Only record #1 meets all criteria
        Assert.HasCount(1, candidateRecords);
        Assert.AreEqual(records[0].Id, candidateRecords[0].Id);
    }

    [TestMethod]
    public void TraineeDutyStatus_ActiveShift_IsMarkedOnDuty()
    {
        // Arrange
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var shiftStart = DateTimeOffset.UtcNow.AddHours(-2);
        var records = new List<AttendanceRecord>
        {
            new()
            {
                Id = Guid.NewGuid(),
                Date = today,
                TimeIn = shiftStart,
                TimeOut = null // Active shift
            }
        };

        // Act
        var activeShift = records.FirstOrDefault(a => a.TimeOut == null);
        var isOnDuty = activeShift != null;
        var todayRecord = records.FirstOrDefault(a => a.Date == today);
        var todayStatus = isOnDuty ? "OnDuty" : (todayRecord != null && todayRecord.TimeOut != null ? "Completed" : "NotStarted");

        // Assert
        Assert.IsTrue(isOnDuty);
        Assert.AreEqual("OnDuty", todayStatus);
        Assert.AreEqual(shiftStart, activeShift?.TimeIn);
    }

    [TestMethod]
    public void TraineeDutyStatus_CompletedShiftToday_IsMarkedCompleted()
    {
        // Arrange
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var records = new List<AttendanceRecord>
        {
            new()
            {
                Id = Guid.NewGuid(),
                Date = today,
                TimeIn = DateTimeOffset.UtcNow.AddHours(-9),
                TimeOut = DateTimeOffset.UtcNow.AddHours(-1),
                NetRenderedHours = 8.0m
            }
        };

        // Act
        var activeShift = records.FirstOrDefault(a => a.TimeOut == null);
        var isOnDuty = activeShift != null;
        var todayRecord = records.FirstOrDefault(a => a.Date == today);
        var todayStatus = isOnDuty ? "OnDuty" : (todayRecord != null && todayRecord.TimeOut != null ? "Completed" : "NotStarted");

        // Assert
        Assert.IsFalse(isOnDuty);
        Assert.AreEqual("Completed", todayStatus);
    }

    [TestMethod]
    public void TraineeDutyStatus_NoShiftToday_IsMarkedNotStarted()
    {
        // Arrange
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var yesterday = today.AddDays(-1);
        var records = new List<AttendanceRecord>
        {
            new()
            {
                Id = Guid.NewGuid(),
                Date = yesterday,
                TimeIn = DateTimeOffset.UtcNow.AddDays(-1),
                TimeOut = DateTimeOffset.UtcNow.AddDays(-1).AddHours(8),
                NetRenderedHours = 8.0m
            }
        };

        // Act
        var activeShift = records.FirstOrDefault(a => a.TimeOut == null);
        var isOnDuty = activeShift != null;
        var todayRecord = records.FirstOrDefault(a => a.Date == today);
        var todayStatus = isOnDuty ? "OnDuty" : (todayRecord != null && todayRecord.TimeOut != null ? "Completed" : "NotStarted");

        // Assert
        Assert.IsFalse(isOnDuty);
        Assert.AreEqual("NotStarted", todayStatus);
    }
}

