using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgroConnect.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUssdSessions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ussd_sessions",
                columns: table => new
                {
                    session_id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    phone_e164 = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    farmer_id = table.Column<Guid>(type: "uuid", nullable: true),
                    screen = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    data = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_ussd_sessions", x => x.session_id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_ussd_sessions_updated_at",
                table: "ussd_sessions",
                column: "updated_at");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ussd_sessions");
        }
    }
}
