#!/usr/bin/env bash
# One-time VPS bootstrap (Ubuntu 22.04/24.04). Run as root or with sudo.
set -euo pipefail

echo "==> Installing packages..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get update
apt-get install -y nodejs git nginx certbot python3-certbot-nginx ufw docker.io docker-compose-plugin

echo "==> Creating deploy user (skip if exists)..."
id deploy &>/dev/null || adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy

echo "==> Firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "==> Directories..."
mkdir -p /opt/mototwin/backups
chown -R deploy:deploy /opt/mototwin

echo "Done. Next steps:"
echo "  1. Copy SSH key to /home/deploy/.ssh/authorized_keys"
echo "  2. Clone repo to /opt/mototwin/app as deploy"
echo "  3. Create /opt/mototwin/.env with POSTGRES_PASSWORD, run docker compose"
echo "  4. See docs/deploy/vps.md"
