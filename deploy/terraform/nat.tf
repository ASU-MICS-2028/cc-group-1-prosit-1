# Outbound internet for the private app servers (ADR 0026): pulling images from GHCR,
# OS updates, the SMS provider and AWS APIs. Incoming traffic never comes this way.
#
# fck-nat is a small EC2 instance (t4g.nano) running an open-source NAT image, instead
# of an AWS NAT Gateway: a few dollars a month instead of ~$35 plus per-GB charges.
# ha_mode keeps it in an Auto Scaling group of one: if it dies, a new one takes over the
# same network interface in about 1-2 minutes. During that gap the servers cannot reach
# the internet; users can still use the app (incoming traffic goes through the load
# balancer). One instance serves both zones to keep the cost down.
#
# Images: https://github.com/AndrewGuenther/fck-nat (published for af-south-1).

module "fck_nat" {
  source  = "RaJiska/fck-nat/aws"
  version = "~> 1.3"

  name          = "agroconnect-nat"
  vpc_id        = aws_vpc.main.id
  subnet_id     = aws_subnet.public[0].id
  instance_type = var.nat_instance_type
  ha_mode       = true

  update_route_tables = true
  route_tables_ids = {
    app = aws_route_table.app.id
  }

  tags = { Name = "agroconnect-nat" }
}
