# ADR 0026: Private network, fck-nat, load balancer and Auto Scaling

- **Status:** Accepted, applied 2026-10-06 (staging) and 2026-10-07 (production). Live state: [`../infrastructure.md`](../infrastructure.md)
- **Date:** 2026-10-05

## Context
Until now everything ran in AWS's default VPC, which only has public subnets:

- **App servers:** one EC2 instance per environment, each with a public IP, ports 80 and 443 open to the internet. No load balancer and no Auto Scaling: if the instance dies, the app is down until someone fixes it by hand.
- **Database:** production RDS is not publicly accessible, but it sits in public subnets, so one setting is all that keeps it off the internet.
- **Photos:** the S3 buckets are private and encrypted, but browser uploads were allowed from any website (CORS `*`).

The DevOps lead asked for data to live where the internet cannot reach it, for the app to scale and survive a server failure, and for this to stay affordable on course credits. A NAT Gateway (needed by private servers to reach the internet) costs about $35 a month before data charges.

## Decision

**Our own VPC across two availability zones, with three kinds of subnet:**

| Subnet | Holds | Internet |
|---|---|---|
| Public | Load balancer, fck-nat | In and out |
| App (private) | App servers | Out only, through fck-nat; S3 through a free gateway endpoint |
| Database (private) | RDS | None |

Security groups chain the layers: internet → load balancer (80, 443) → app servers (80 from the load balancer only) → RDS (5432 from the app servers only). No SSH anywhere; shells go through Session Manager.

**fck-nat instead of a NAT Gateway.** An open-source NAT image on a t4g.nano instance, run in high-availability mode (an Auto Scaling group of one that takes over the same network interface). Published for af-south-1. One instance serves both zones.

**One Application Load Balancer for both environments.** Health check `GET /health` (nginx passes it to the backend). HTTPS as soon as there is a domain and an ACM certificate; until then production answers on port 80 and staging on port 8080. It is also the public address Africa's Talking will call for USSD and SMS.

**Alarms:** CloudWatch alarms on unhealthy servers, no healthy servers and 5xx bursts, emailed through SNS.

**Auto Scaling groups:**

| Environment | Servers | Scaling |
|---|---|---|
| Production | 2 to 4, spread over both zones | Target tracking on average CPU (60%) |
| Staging | Exactly 1 | None, but a failed server is replaced |

Unhealthy servers (load balancer health check) are replaced. A changed launch template rolls servers one at a time (instance refresh).

**Servers start themselves.** A new server installs Docker, reads its `.env` and the last deployed image tag from SSM Parameter Store, pulls that image from **Amazon ECR with its IAM role**, and starts the app. The deploy workflow builds to GHCR, copies the images to ECR, rolls out to every server of the environment through SSM, one at a time, then records the tag in `/agroconnect/<env>/image_tag`. No GitHub token is stored on any server.

**Database:** moved into the database subnets by restoring a snapshot into a new instance (`agroconnect-prod`); the old one is released from Terraform without being deleted. Multi-AZ is a switch (`rds_multi_az`), off by default for cost.

**S3:** HTTPS-only bucket policy; browser uploads only from the app's own addresses. A bucket policy limited to the VPC endpoint was rejected: phones upload with presigned URLs from the internet, which such a policy would block. Access stays limited by IAM (only the app role can sign URLs).

## Alternatives considered
- **NAT Gateway:** managed and highly available, but about $35 a month plus $0.045+ per GB, more than the whole current budget.
- **VPC interface endpoints instead of NAT** (ECR, SSM, logs): about $7 a month each per zone, and GHCR, OS updates and Africa's Talking would still need the internet.
- **App servers stay in public subnets behind the load balancer:** cheaper and simpler, but every server keeps a public IP; rejected because the brief is to keep data paths off the internet.
- **A load balancer per environment:** cleaner separation, double the cost. Host-name rules on one load balancer separate them instead.
- **Staging on its own RDS:** keeps staging data across server replacements, but costs as much as production's database. Staging data is demo data and is re-seeded on start.
- **A GitHub token on the servers to pull from GHCR:** simpler, but GitHub cannot issue a narrow token programmatically, and a broad token on an internet-facing server could write to every repository of its owner.
- **ECS on Fargate:** no servers to manage, but a bigger change to the pipeline than this phase needs.

## Consequences
- **Cost goes up** from about $47 to about **$90 a month** with staging on ($80 with it off), at af-south-1 on-demand prices (breakdown in `deploy/terraform/README.md`). The budget alert moves from $20 to $100.
- **A domain is needed for HTTPS**, which the PWA requires on real phones (ADR 0009).
- **fck-nat is a single instance:** if it fails, the servers lose outbound internet for about 1 to 2 minutes while a replacement takes over. Users are not affected.
- **The app works behind a load balancer:**
  - nginx trusts `X-Forwarded-For` only from the VPC (10.x) and passes the API one clean client address, so the sign-in rate limit (ADR 0022) still counts per user and a client cannot fake its address. Tested with a forged header and a simulated load balancer.
  - With two or more servers, the per-address limit (30 per 5 minutes) is counted per server. The per-phone limits (resend, hourly cap, wrong tries) are stored in PostgreSQL and stay shared, so the risk is small; a shared counter can come later.
- **Alarms** email the team when a server fails its health check, when an environment has no healthy server, and on bursts of server errors.
- **Staging's database is disposable:** a replaced staging server starts with an empty, re-seeded database.
- **The move is a one-time migration with downtime:** snapshot, apply, deploy, check, then delete the old database by hand (`deploy/terraform/README.md`).
