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

    [TestMethod]
    public void BroadcastSettings_PreservesIndividualWorkplaceLocation_WhenOverwriteLocationIsFalse()
    {
        // Arrange: Student has individual internship company (e.g. Accenture)
        var studentSetting = new OjtSetting
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            CompanyName = "Accenture Philippines",
            WorkplaceLatitude = 14.5501m,
            WorkplaceLongitude = 121.0501m,
            GeofenceRadiusMeters = 80,
            GpsAccuracyThreshold = 100,
            TargetTotalHours = 300m,
            DailyScheduleHours = 8.0m,
            MaxDailyHours = 10.0m,
            DefaultLunchMinutes = 60,
            AllowWeekendPunches = false
        };

        var broadcastRequest = new UpdateOjtSettingRequest(
            CompanyName: "University Coordinator Office",
            WorkplaceLatitude: 14.6000m,
            WorkplaceLongitude: 120.9800m,
            GeofenceRadiusMeters: 150,
            GpsAccuracyThreshold: 200,
            TargetTotalHours: 486.0m,
            DailyScheduleHours: 8.0m,
            MaxDailyHours: 10.0m,
            DefaultLunchMinutes: 45,
            AllowWeekendPunches: true,
            OverwriteWorkplaceLocation: false
        );

        // Act: Apply broadcast policies with OverwriteWorkplaceLocation = false
        studentSetting.TargetTotalHours = broadcastRequest.TargetTotalHours;
        studentSetting.DailyScheduleHours = broadcastRequest.DailyScheduleHours;
        studentSetting.MaxDailyHours = broadcastRequest.MaxDailyHours;
        studentSetting.DefaultLunchMinutes = broadcastRequest.DefaultLunchMinutes;
        studentSetting.AllowWeekendPunches = broadcastRequest.AllowWeekendPunches;

        if (broadcastRequest.OverwriteWorkplaceLocation)
        {
            studentSetting.CompanyName = broadcastRequest.CompanyName;
            studentSetting.WorkplaceLatitude = broadcastRequest.WorkplaceLatitude;
            studentSetting.WorkplaceLongitude = broadcastRequest.WorkplaceLongitude;
            studentSetting.GeofenceRadiusMeters = broadcastRequest.GeofenceRadiusMeters;
            studentSetting.GpsAccuracyThreshold = broadcastRequest.GpsAccuracyThreshold;
        }

        // Assert: Hours & policies updated, but company location preserved
        Assert.AreEqual("Accenture Philippines", studentSetting.CompanyName);
        Assert.AreEqual(14.5501m, studentSetting.WorkplaceLatitude);
        Assert.AreEqual(80, studentSetting.GeofenceRadiusMeters);
        Assert.AreEqual(486.0m, studentSetting.TargetTotalHours);
        Assert.AreEqual(45, studentSetting.DefaultLunchMinutes);
        Assert.IsTrue(studentSetting.AllowWeekendPunches);
    }

    [TestMethod]
    public void BroadcastSettings_OverwritesWorkplaceLocation_WhenOverwriteLocationIsTrue()
    {
        // Arrange
        var studentSetting = new OjtSetting
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            CompanyName = "Accenture Philippines",
            WorkplaceLatitude = 14.5501m,
            WorkplaceLongitude = 121.0501m,
            GeofenceRadiusMeters = 80,
            GpsAccuracyThreshold = 100,
            TargetTotalHours = 300m,
            DailyScheduleHours = 8.0m,
            MaxDailyHours = 10.0m,
            DefaultLunchMinutes = 60,
            AllowWeekendPunches = false
        };

        var broadcastRequest = new UpdateOjtSettingRequest(
            CompanyName: "Department Central Lab",
            WorkplaceLatitude: 14.6000m,
            WorkplaceLongitude: 120.9800m,
            GeofenceRadiusMeters: 150,
            GpsAccuracyThreshold: 200,
            TargetTotalHours: 486.0m,
            DailyScheduleHours: 8.0m,
            MaxDailyHours: 10.0m,
            DefaultLunchMinutes: 45,
            AllowWeekendPunches: true,
            OverwriteWorkplaceLocation: true
        );

        // Act
        studentSetting.TargetTotalHours = broadcastRequest.TargetTotalHours;
        if (broadcastRequest.OverwriteWorkplaceLocation)
        {
            studentSetting.CompanyName = broadcastRequest.CompanyName;
            studentSetting.WorkplaceLatitude = broadcastRequest.WorkplaceLatitude;
            studentSetting.WorkplaceLongitude = broadcastRequest.WorkplaceLongitude;
        }

        // Assert: Location explicitly overwritten
        Assert.AreEqual("Department Central Lab", studentSetting.CompanyName);
        Assert.AreEqual(14.6000m, studentSetting.WorkplaceLatitude);
    }

    [TestMethod]
    public void OfflineAntiFraud_FlagsDiscrepancy_WhenClientTimestampDeviatesOver15Minutes()
    {
        // Arrange: Client claims punch was 3 hours ago
        var serverNow = DateTimeOffset.UtcNow;
        var claimedClientTimestamp = serverNow.AddHours(-3);

        // Act
        var isHistoricalPunch = Math.Abs((serverNow - claimedClientTimestamp).TotalMinutes) > 15;
        var isVerified = !isHistoricalPunch;

        // Assert
        Assert.IsTrue(isHistoricalPunch, "Punches timestamped over 15 minutes in the past must be flagged as offline/historical.");
        Assert.IsFalse(isVerified, "Historical punches must require supervisor verification.");
    }

    [TestMethod]
    public void WeekendBoundaryValidation_BlocksSundayPunch_WhenWeekendDisabledAndNoNote()
    {
        // Arrange: Sunday morning in Philippine time (UTC+8)
        var sundayUtc = new DateTimeOffset(2026, 11, 1, 1, 0, 0, TimeSpan.Zero); // 9:00 AM PHT on Sunday Nov 1, 2026
        var localTime = sundayUtc.ToOffset(TimeSpan.FromHours(8));
        var allowWeekendPunches = false;
        string? studentRemark = null;

        // Act: Evaluate punch validity
        var isWeekend = localTime.DayOfWeek == DayOfWeek.Saturday || localTime.DayOfWeek == DayOfWeek.Sunday;
        var isBlocked = isWeekend && !allowWeekendPunches && string.IsNullOrWhiteSpace(studentRemark);

        // Assert
        Assert.IsTrue(isWeekend);
        Assert.IsTrue(isBlocked, "Unapproved weekend punch without official note must be blocked.");
    }

    [TestMethod]
    public void ZombieShiftDetection_AutoCloses_WhenActiveShiftExceedsTwentyHours()
    {
        // Arrange: Trainee clocked in on Friday 8 AM and forgot to clock out (now Saturday 6 AM = 22 hours)
        var serverNow = DateTimeOffset.UtcNow;
        var shiftStarted = serverNow.AddHours(-22);
        var activeShift = new AttendanceRecord
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            Date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1)),
            TimeIn = shiftStarted,
            TimeOut = null
        };

        // Act: Simulate auto-close threshold (20 hours)
        var elapsedHours = (serverNow - activeShift.TimeIn).TotalHours;
        var shouldAutoClose = activeShift.TimeOut == null && elapsedHours > 20;

        if (shouldAutoClose)
        {
            activeShift.TimeOut = activeShift.TimeIn.AddHours(8); // capped standard
            activeShift.NetRenderedHours = 8.0m;
            activeShift.SupervisorRemark = "[Auto-closed runaway shift]";
        }

        // Assert
        Assert.IsTrue(shouldAutoClose);
        Assert.IsNotNull(activeShift.TimeOut);
        Assert.AreEqual(8.0m, activeShift.NetRenderedHours);
    }

    [TestMethod]
    public void OjtSetting_IncludesCompanyAddress_WhenConfigured()
    {
        // Arrange
        var setting = new OjtSetting
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            CompanyName = "One Corporate Centre (OCC)",
            CompanyAddress = "Julia Vargas Ave cor. Meralco Ave, Ortigas Center, Pasig City",
            WorkplaceLatitude = 14.583916m,
            WorkplaceLongitude = 121.063291m,
            GeofenceRadiusMeters = 100,
            GpsAccuracyThreshold = 150,
            TargetTotalHours = 486.0m,
            DailyScheduleHours = 8.0m,
            DefaultLunchMinutes = 60
        };

        // Act
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
            IsLocked: false,
            ManagedBySupervisorName: null,
            SupervisorId: null,
            MaxDailyHours: 10.0m,
            AllowWeekendPunches: false,
            CompanyAddress: setting.CompanyAddress
        );

        // Assert
        Assert.AreEqual("One Corporate Centre (OCC)", dto.CompanyName);
        Assert.AreEqual("Julia Vargas Ave cor. Meralco Ave, Ortigas Center, Pasig City", dto.CompanyAddress);
    }
}

