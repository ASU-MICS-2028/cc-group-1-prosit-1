using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgroConnect.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "login_codes",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    phone_e164 = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    role = table.Column<int>(type: "integer", nullable: false),
                    code_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    expires_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    attempts = table.Column<int>(type: "integer", nullable: false),
                    used_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_login_codes", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "farmers",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    registered_by_id = table.Column<Guid>(type: "uuid", nullable: false),
                    consent_given = table.Column<bool>(type: "boolean", nullable: false),
                    consent_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    language = table.Column<int>(type: "integer", nullable: false),
                    full_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    phone_e164 = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    has_no_phone = table.Column<bool>(type: "boolean", nullable: false),
                    gender = table.Column<int>(type: "integer", nullable: true),
                    age_band = table.Column<int>(type: "integer", nullable: true),
                    community = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    region_district = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    crops = table.Column<int[]>(type: "integer[]", nullable: false),
                    farm_size = table.Column<decimal>(type: "numeric(9,2)", precision: 9, scale: 2, nullable: true),
                    farm_size_unit = table.Column<int>(type: "integer", nullable: false),
                    soil = table.Column<int>(type: "integer", nullable: true),
                    planting_seasons = table.Column<int[]>(type: "integer[]", nullable: false),
                    latitude = table.Column<double>(type: "double precision", nullable: true),
                    longitude = table.Column<double>(type: "double precision", nullable: true),
                    location_accuracy_metres = table.Column<double>(type: "double precision", nullable: true),
                    photo_id = table.Column<Guid>(type: "uuid", nullable: true),
                    phone_type = table.Column<int>(type: "integer", nullable: true),
                    data_purchase = table.Column<int>(type: "integer", nullable: true),
                    reach_channels = table.Column<int[]>(type: "integer[]", nullable: false),
                    income_sources = table.Column<int[]>(type: "integer[]", nullable: false),
                    has_bank_account = table.Column<bool>(type: "boolean", nullable: true),
                    mobile_money = table.Column<int>(type: "integer", nullable: true),
                    last_agent_visit = table.Column<int>(type: "integer", nullable: true),
                    help_needed = table.Column<int[]>(type: "integer[]", nullable: false),
                    client_updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    server_updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_farmers", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    role = table.Column<int>(type: "integer", nullable: false),
                    phone_e164 = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    full_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    region = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    district = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    farmer_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_users", x => x.id);
                    table.ForeignKey(
                        name: "fk_users_farmers_farmer_id",
                        column: x => x.farmer_id,
                        principalTable: "farmers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "photos",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    farmer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    uploaded_by_id = table.Column<Guid>(type: "uuid", nullable: false),
                    content_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_photos", x => x.id);
                    table.ForeignKey(
                        name: "fk_photos_farmers_farmer_id",
                        column: x => x.farmer_id,
                        principalTable: "farmers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_photos_users_uploaded_by_id",
                        column: x => x.uploaded_by_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "visits",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    farmer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    officer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    scheduled_for = table.Column<DateOnly>(type: "date", nullable: false),
                    completed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    topics = table.Column<int[]>(type: "integer[]", nullable: false),
                    observations = table.Column<int[]>(type: "integer[]", nullable: false),
                    notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    photo_ids = table.Column<List<Guid>>(type: "uuid[]", nullable: false),
                    client_updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    server_updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_visits", x => x.id);
                    table.ForeignKey(
                        name: "fk_visits_farmers_farmer_id",
                        column: x => x.farmer_id,
                        principalTable: "farmers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_visits_users_officer_id",
                        column: x => x.officer_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_farmers_phone_e164",
                table: "farmers",
                column: "phone_e164");

            migrationBuilder.CreateIndex(
                name: "ix_farmers_registered_by_id_server_updated_at",
                table: "farmers",
                columns: new[] { "registered_by_id", "server_updated_at" });

            migrationBuilder.CreateIndex(
                name: "ix_login_codes_phone_e164_role_created_at",
                table: "login_codes",
                columns: new[] { "phone_e164", "role", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_photos_farmer_id",
                table: "photos",
                column: "farmer_id");

            migrationBuilder.CreateIndex(
                name: "ix_photos_uploaded_by_id",
                table: "photos",
                column: "uploaded_by_id");

            migrationBuilder.CreateIndex(
                name: "ix_users_farmer_id",
                table: "users",
                column: "farmer_id");

            migrationBuilder.CreateIndex(
                name: "ix_users_phone_e164_role",
                table: "users",
                columns: new[] { "phone_e164", "role" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_visits_farmer_id",
                table: "visits",
                column: "farmer_id");

            migrationBuilder.CreateIndex(
                name: "ix_visits_officer_id_server_updated_at",
                table: "visits",
                columns: new[] { "officer_id", "server_updated_at" });

            migrationBuilder.AddForeignKey(
                name: "fk_farmers_users_registered_by_id",
                table: "farmers",
                column: "registered_by_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_farmers_users_registered_by_id",
                table: "farmers");

            migrationBuilder.DropTable(
                name: "login_codes");

            migrationBuilder.DropTable(
                name: "photos");

            migrationBuilder.DropTable(
                name: "visits");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.DropTable(
                name: "farmers");
        }
    }
}
