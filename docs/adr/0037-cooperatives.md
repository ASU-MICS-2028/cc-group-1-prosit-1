# ADR 0037: Cooperatives with real savings, group orders, sales and meetings

- **Status:** Accepted
- **Date:** 2026-10-08

## Context
The farmer's cooperative screens (Figma P4 · 01, 01b to 01g and 02) and the admin's Cooperatives page (P4 · D5) ran on sample data. `GET /api/farmer/cooperative` invented a cooperative named after the farmer's community (`SampleCooperativeDirectory`).

## Decision
**A CooperativeService and nine tables:**
- `cooperatives` and `cooperative_members` (a farmer is in one cooperative at most, enforced by a unique index);
- `savings_contributions`;
- `group_orders` and `group_order_lines`;
- `group_sales` and `sale_pledges`;
- `meetings` and `meeting_rsvps`.

**Who runs it:**
- An **officer** starts a cooperative with one of their own farmers as leader, in the officer's own region and district. They add their own farmers, and open group orders, sales and meetings.
- **Farmers** take part.
- **Admins** see every cooperative run by officers in their area.

**Savings use mobile money.** `POST /api/cooperative/savings` starts a payment through MoneyService's payment flow (purpose `savings`; the farmer approves on the phone, ADR 0034). The contribution **counts only once that payment is paid**. Waiting contributions take their payment's status each time the cooperative is read.

**Group order:**
- A farmer sets their bags (0 leaves the order).
- Refused after the closing date, or above 500 bags.
- Paying happens when the order closes. Collecting that payment is a later step.

**Selling together:** a farmer pledges bags (100 kg each). The admin can remind members who have not pledged. That SMS is logged until the SMS provider is connected.

**The farmer Home tile** (`GET /api/farmer/cooperative`) now reads these tables. It answers 404 `NOT_IN_A_COOPERATIVE` when the farmer is in none.

**Seed:** on laptops and staging, a cooperative is created for the sample farmer, with an open order, a sale and a meeting.

## Endpoints
| Who | Endpoint |
|---|---|
| Farmer | `GET /api/cooperative`, `POST /api/cooperative/savings`, `PUT /api/cooperative/orders/{id}`, `PUT /api/cooperative/sales/{id}`, `PUT /api/cooperative/meetings/{id}/rsvp` |
| Officer | `GET`/`POST /api/officer/cooperatives`, `POST /api/officer/cooperatives/{id}/members`, `/orders`, `/sales`, `/meetings` |
| Admin | `GET /api/admin/cooperatives`, `POST /api/admin/cooperatives/{id}/remind-pledges` |

## Alternatives considered
- **Savings recorded without a payment:** faster to build, but the group total would not be money that actually moved.
- **Cooperative leaders managing it in the app:** wanted later. For now the officer runs it, because leaders often share a basic phone.

## Consequences
- Migration `AddCooperatives`. On the servers it is applied automatically at start-up.
- The officer's Cooperatives page has no Figma frame yet; it is built from the flow components and needs one.
- Next steps: collect group order payments when an order closes, and pay farmers after a group sale (Paystack Transfers).
