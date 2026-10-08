using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgroConnect.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCooperatives : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "cooperatives",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    community = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    region = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    district = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    leader_farmer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_by_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_cooperatives", x => x.id);
                    table.ForeignKey(
                        name: "fk_cooperatives_farmers_leader_farmer_id",
                        column: x => x.leader_farmer_id,
                        principalTable: "farmers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_cooperatives_users_created_by_id",
                        column: x => x.created_by_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "cooperative_members",
                columns: table => new
                {
                    cooperative_id = table.Column<Guid>(type: "uuid", nullable: false),
                    farmer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    joined_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_cooperative_members", x => new { x.cooperative_id, x.farmer_id });
                    table.ForeignKey(
                        name: "fk_cooperative_members_cooperatives_cooperative_id",
                        column: x => x.cooperative_id,
                        principalTable: "cooperatives",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_cooperative_members_farmers_farmer_id",
                        column: x => x.farmer_id,
                        principalTable: "farmers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "group_orders",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    cooperative_id = table.Column<Guid>(type: "uuid", nullable: false),
                    product = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    dealer = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    unit_price_pesewas = table.Column<long>(type: "bigint", nullable: false),
                    alone_price_pesewas = table.Column<long>(type: "bigint", nullable: false),
                    target_bags = table.Column<int>(type: "integer", nullable: false),
                    closes_on = table.Column<DateOnly>(type: "date", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_group_orders", x => x.id);
                    table.ForeignKey(
                        name: "fk_group_orders_cooperatives_cooperative_id",
                        column: x => x.cooperative_id,
                        principalTable: "cooperatives",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "group_sales",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    cooperative_id = table.Column<Guid>(type: "uuid", nullable: false),
                    crop = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    buyer = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    price_per_kg_pesewas = table.Column<long>(type: "bigint", nullable: false),
                    market_price_per_kg_pesewas = table.Column<long>(type: "bigint", nullable: false),
                    target_kg = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_group_sales", x => x.id);
                    table.ForeignKey(
                        name: "fk_group_sales_cooperatives_cooperative_id",
                        column: x => x.cooperative_id,
                        principalTable: "cooperatives",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "meetings",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    cooperative_id = table.Column<Guid>(type: "uuid", nullable: false),
                    starts_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    place = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    topic = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    bring = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_meetings", x => x.id);
                    table.ForeignKey(
                        name: "fk_meetings_cooperatives_cooperative_id",
                        column: x => x.cooperative_id,
                        principalTable: "cooperatives",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "savings_contributions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    cooperative_id = table.Column<Guid>(type: "uuid", nullable: false),
                    farmer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    amount_pesewas = table.Column<long>(type: "bigint", nullable: false),
                    payment_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_savings_contributions", x => x.id);
                    table.ForeignKey(
                        name: "fk_savings_contributions_cooperatives_cooperative_id",
                        column: x => x.cooperative_id,
                        principalTable: "cooperatives",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_savings_contributions_farmers_farmer_id",
                        column: x => x.farmer_id,
                        principalTable: "farmers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_savings_contributions_payments_payment_id",
                        column: x => x.payment_id,
                        principalTable: "payments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "group_order_lines",
                columns: table => new
                {
                    order_id = table.Column<Guid>(type: "uuid", nullable: false),
                    farmer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    bags = table.Column<int>(type: "integer", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_group_order_lines", x => new { x.order_id, x.farmer_id });
                    table.ForeignKey(
                        name: "fk_group_order_lines_farmers_farmer_id",
                        column: x => x.farmer_id,
                        principalTable: "farmers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_group_order_lines_group_orders_order_id",
                        column: x => x.order_id,
                        principalTable: "group_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "sale_pledges",
                columns: table => new
                {
                    sale_id = table.Column<Guid>(type: "uuid", nullable: false),
                    farmer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    bags = table.Column<int>(type: "integer", nullable: false),
                    kg_per_bag = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_sale_pledges", x => new { x.sale_id, x.farmer_id });
                    table.ForeignKey(
                        name: "fk_sale_pledges_farmers_farmer_id",
                        column: x => x.farmer_id,
                        principalTable: "farmers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_sale_pledges_group_sales_sale_id",
                        column: x => x.sale_id,
                        principalTable: "group_sales",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "meeting_rsvps",
                columns: table => new
                {
                    meeting_id = table.Column<Guid>(type: "uuid", nullable: false),
                    farmer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    coming = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_meeting_rsvps", x => new { x.meeting_id, x.farmer_id });
                    table.ForeignKey(
                        name: "fk_meeting_rsvps_farmers_farmer_id",
                        column: x => x.farmer_id,
                        principalTable: "farmers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_meeting_rsvps_meetings_meeting_id",
                        column: x => x.meeting_id,
                        principalTable: "meetings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_cooperative_members_farmer_id",
                table: "cooperative_members",
                column: "farmer_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_cooperatives_created_by_id",
                table: "cooperatives",
                column: "created_by_id");

            migrationBuilder.CreateIndex(
                name: "ix_cooperatives_leader_farmer_id",
                table: "cooperatives",
                column: "leader_farmer_id");

            migrationBuilder.CreateIndex(
                name: "ix_group_order_lines_farmer_id",
                table: "group_order_lines",
                column: "farmer_id");

            migrationBuilder.CreateIndex(
                name: "ix_group_orders_cooperative_id",
                table: "group_orders",
                column: "cooperative_id");

            migrationBuilder.CreateIndex(
                name: "ix_group_sales_cooperative_id",
                table: "group_sales",
                column: "cooperative_id");

            migrationBuilder.CreateIndex(
                name: "ix_meeting_rsvps_farmer_id",
                table: "meeting_rsvps",
                column: "farmer_id");

            migrationBuilder.CreateIndex(
                name: "ix_meetings_cooperative_id",
                table: "meetings",
                column: "cooperative_id");

            migrationBuilder.CreateIndex(
                name: "ix_sale_pledges_farmer_id",
                table: "sale_pledges",
                column: "farmer_id");

            migrationBuilder.CreateIndex(
                name: "ix_savings_contributions_cooperative_id_farmer_id",
                table: "savings_contributions",
                columns: new[] { "cooperative_id", "farmer_id" });

            migrationBuilder.CreateIndex(
                name: "ix_savings_contributions_farmer_id",
                table: "savings_contributions",
                column: "farmer_id");

            migrationBuilder.CreateIndex(
                name: "ix_savings_contributions_payment_id",
                table: "savings_contributions",
                column: "payment_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "cooperative_members");

            migrationBuilder.DropTable(
                name: "group_order_lines");

            migrationBuilder.DropTable(
                name: "meeting_rsvps");

            migrationBuilder.DropTable(
                name: "sale_pledges");

            migrationBuilder.DropTable(
                name: "savings_contributions");

            migrationBuilder.DropTable(
                name: "group_orders");

            migrationBuilder.DropTable(
                name: "meetings");

            migrationBuilder.DropTable(
                name: "group_sales");

            migrationBuilder.DropTable(
                name: "cooperatives");
        }
    }
}
