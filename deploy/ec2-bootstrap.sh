#!/usr/bin/env bash
# One-time setup for a fresh Ubuntu 22.04/24.04 EC2 instance.
#
# Usage (on the instance, as the default "ubuntu" user):
#   curl -fsSL https://raw.githubusercontent.com/ASU-MICS-2028/cc-group-1-prosit-1/main/deploy/ec2-bootstrap.sh -o bootstrap.sh
#   sudo bash bootstrap.sh "<contents of the deploy public key>"
#
# What it does:
#   - installs Docker Engine + compose plugin
#   - creates a "deploy" user that can run docker (used by GitHub Actions)
#   - authorises the given public key for that user
#   - creates /opt/agroconnect with an empty .env for app secrets
set -euo pipefail

PUBKEY="${1:-}"
APP_DIR=/opt/agroconnect
DEPLOY_USER=deploy

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo." >&2
  exit 1
fi
if [ -z "$PUBKEY" ]; then
  echo "Usage: sudo bash $0 \"ssh-ed25519 AAAA... github-actions\"" >&2
  exit 1
fi

echo "==> Installing Docker"
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

echo "==> Creating $DEPLOY_USER user"
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash "$DEPLOY_USER"
fi
usermod -aG docker "$DEPLOY_USER"
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
echo "$PUBKEY" > "/home/$DEPLOY_USER/.ssh/authorized_keys"
chown "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh/authorized_keys"
chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"

echo "==> Preparing $APP_DIR"
install -d -m 750 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR"
if [ ! -f "$APP_DIR/.env" ]; then
  install -m 600 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /dev/null "$APP_DIR/.env"
fi

echo "==> Hardening SSH (key-only login)"
sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl reload ssh 2>/dev/null || systemctl reload sshd

echo "Done. Add app secrets to $APP_DIR/.env, then set the GitHub environment secrets."
