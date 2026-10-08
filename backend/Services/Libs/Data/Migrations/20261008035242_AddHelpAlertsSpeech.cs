using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgroConnect.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddHelpAlertsSpeech : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "alert_settings",
                columns: table => new
                {
                    farmer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    price_crops = table.Column<int[]>(type: "integer[]", nullable: false),
                    heavy_rain = table.Column<bool>(type: "boolean", nullable: false),
                    dry_spell = table.Column<bool>(type: "boolean", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_alert_settings", x => x.farmer_id);
                    table.ForeignKey(
                        name: "fk_alert_settings_farmers_farmer_id",
                        column: x => x.farmer_id,
                        principalTable: "farmers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "help_requests",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    farmer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    officer_id = table.Column<Guid>(type: "uuid", nullable: true),
                    category = table.Column<int>(type: "integer", nullable: false),
                    text = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    crop = table.Column<int>(type: "integer", nullable: true),
                    problem = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    has_voice_note = table.Column<bool>(type: "boolean", nullable: false),
                    voice_seconds = table.Column<int>(type: "integer", nullable: true),
                    status = table.Column<int>(type: "integer", nullable: false),
                    answer = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    answered_by_id = table.Column<Guid>(type: "uuid", nullable: true),
                    answered_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    reminded_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_help_requests", x => x.id);
                    table.ForeignKey(
                        name: "fk_help_requests_farmers_farmer_id",
                        column: x => x.farmer_id,
                        principalTable: "farmers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_help_requests_users_answered_by_id",
                        column: x => x.answered_by_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_help_requests_users_officer_id",
                        column: x => x.officer_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "speech_clips",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    language = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    text_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    text = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    translated = table.Column<string>(type: "character varying(1500)", maxLength: 1500, nullable: false),
                    content_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    audio = table.Column<byte[]>(type: "bytea", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_speech_clips", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "help_voice_notes",
                columns: table => new
                {
                    help_request_id = table.Column<Guid>(type: "uuid", nullable: false),
                    content_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    audio = table.Column<byte[]>(type: "bytea", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_help_voice_notes", x => x.help_request_id);
                    table.ForeignKey(
                        name: "fk_help_voice_notes_help_requests_help_request_id",
                        column: x => x.help_request_id,
                        principalTable: "help_requests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_help_requests_answered_by_id",
                table: "help_requests",
                column: "answered_by_id");

            migrationBuilder.CreateIndex(
                name: "ix_help_requests_farmer_id_created_at",
                table: "help_requests",
                columns: new[] { "farmer_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_help_requests_officer_id_status",
                table: "help_requests",
                columns: new[] { "officer_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_speech_clips_language_text_hash",
                table: "speech_clips",
                columns: new[] { "language", "text_hash" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "alert_settings");

            migrationBuilder.DropTable(
                name: "help_voice_notes");

            migrationBuilder.DropTable(
                name: "speech_clips");

            migrationBuilder.DropTable(
                name: "help_requests");
        }
    }
}
