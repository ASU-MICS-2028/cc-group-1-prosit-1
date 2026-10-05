#!/usr/bin/env bash
# Opens SSH (port 22) to your current public IP only, replacing any previous IPs.
#   ./allow-my-ip.sh          allow my current IP
#   ./allow-my-ip.sh --close  close SSH again (Session Manager still works)
set -euo pipefail
cd "$(dirname "$0")"

TFVARS=terraform.tfvars
[ -f "$TFVARS" ] || { echo "Missing $TFVARS (copy terraform.tfvars.example)." >&2; exit 1; }

if [ "${1:-}" = "--close" ]; then
  NEW='ssh_allowed_cidrs = []'
else
  IP=$(curl -fsS https://checkip.amazonaws.com | tr -d '[:space:]')
  [[ "$IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "Could not read your public IP." >&2; exit 1; }
  echo "Your public IP is $IP"
  NEW="ssh_allowed_cidrs = [\"$IP/32\"]"
fi

if grep -q '^ssh_allowed_cidrs' "$TFVARS"; then
  sed -i.bak "s|^ssh_allowed_cidrs.*|$NEW|" "$TFVARS" && rm -f "$TFVARS.bak"
else
  echo "$NEW" >> "$TFVARS"
fi

terraform apply -target=aws_vpc_security_group_ingress_rule.ssh
