using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OJTHub.Server.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    PasswordHash = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    FullName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    StudentId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Role = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    SupervisorId = table.Column<Guid>(type: "uuid", nullable: true),
                    SupervisorCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Users_Users_SupervisorId",
                        column: x => x.SupervisorId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "ActivityLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    TaskTitle = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Details = table.Column<string>(type: "text", nullable: false),
                    HoursSpent = table.Column<decimal>(type: "numeric(3,1)", nullable: true),
                    Category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ActivityLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ActivityLogs_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AttendanceRecords",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    TimeIn = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    TimeInLatitude = table.Column<decimal>(type: "numeric(9,6)", nullable: false),
                    TimeInLongitude = table.Column<decimal>(type: "numeric(9,6)", nullable: false),
                    TimeInDistance = table.Column<decimal>(type: "numeric(6,1)", nullable: false),
                    TimeInGpsAccuracy = table.Column<decimal>(type: "numeric(5,1)", nullable: false),
                    TimeInWithinGeofence = table.Column<bool>(type: "boolean", nullable: false),
                    TimeOut = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    TimeOutLatitude = table.Column<decimal>(type: "numeric(9,6)", nullable: true),
                    TimeOutLongitude = table.Column<decimal>(type: "numeric(9,6)", nullable: true),
                    TimeOutDistance = table.Column<decimal>(type: "numeric(6,1)", nullable: true),
                    TimeOutGpsAccuracy = table.Column<decimal>(type: "numeric(5,1)", nullable: true),
                    TimeOutWithinGeofence = table.Column<bool>(type: "boolean", nullable: true),
                    LunchBreakMinutes = table.Column<int>(type: "integer", nullable: false),
                    NetRenderedHours = table.Column<decimal>(type: "numeric(4,2)", nullable: true),
                    IsVerified = table.Column<bool>(type: "boolean", nullable: false),
                    VerifiedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    VerifiedBySupervisorId = table.Column<Guid>(type: "uuid", nullable: true),
                    SupervisorRemark = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AttendanceRecords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AttendanceRecords_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AttendanceRecords_Users_VerifiedBySupervisorId",
                        column: x => x.VerifiedBySupervisorId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "GeneratedReports",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ReportType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: false),
                    RawPromptData = table.Column<string>(type: "text", nullable: true),
                    AiGeneratedContent = table.Column<string>(type: "text", nullable: false),
                    EditedContent = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GeneratedReports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GeneratedReports_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OjtSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CompanyName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    WorkplaceLatitude = table.Column<decimal>(type: "numeric(9,6)", nullable: false),
                    WorkplaceLongitude = table.Column<decimal>(type: "numeric(9,6)", nullable: false),
                    GeofenceRadiusMeters = table.Column<int>(type: "integer", nullable: false),
                    GpsAccuracyThreshold = table.Column<int>(type: "integer", nullable: false),
                    TargetTotalHours = table.Column<decimal>(type: "numeric(5,1)", nullable: false),
                    DailyScheduleHours = table.Column<decimal>(type: "numeric(4,1)", nullable: false),
                    DefaultLunchMinutes = table.Column<int>(type: "integer", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OjtSettings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OjtSettings_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ActivityLogs_UserId_Date",
                table: "ActivityLogs",
                columns: new[] { "UserId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceRecords_UserId_Date",
                table: "AttendanceRecords",
                columns: new[] { "UserId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceRecords_VerifiedBySupervisorId",
                table: "AttendanceRecords",
                column: "VerifiedBySupervisorId");

            migrationBuilder.CreateIndex(
                name: "IX_GeneratedReports_UserId",
                table: "GeneratedReports",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_OjtSettings_UserId",
                table: "OjtSettings",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_SupervisorCode",
                table: "Users",
                column: "SupervisorCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_SupervisorId",
                table: "Users",
                column: "SupervisorId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ActivityLogs");

            migrationBuilder.DropTable(
                name: "AttendanceRecords");

            migrationBuilder.DropTable(
                name: "GeneratedReports");

            migrationBuilder.DropTable(
                name: "OjtSettings");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
