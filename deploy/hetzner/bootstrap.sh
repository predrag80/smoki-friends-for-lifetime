#!/usr/bin/env bash
# One-time setup for a server created WITHOUT cloud-init (same result as cloud-init.yaml).
# Run from your machine:
#   ssh -i ~/.ssh/sffl_deploy root@<server-ip> 'bash -s' < deploy/hetzner/bootstrap.sh
# Installs Docker, creates the "deploy" user with the GitHub Actions key, enables the firewall.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y ca-certificates curl rsync ufw fail2ban openssl unattended-upgrades

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

if ! id deploy >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash deploy
fi
usermod -aG docker deploy
passwd -l deploy >/dev/null

# Authorize only the deploy key (comment "github-actions-deploy") for the deploy user.
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
if ! grep -h "github-actions-deploy" /root/.ssh/authorized_keys > /home/deploy/.ssh/authorized_keys; then
  echo "No key with comment 'github-actions-deploy' in /root/.ssh/authorized_keys." >&2
  exit 1
fi
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys

install -d -o deploy -g deploy /opt/sffl /opt/sffl/app

ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable
systemctl enable --now fail2ban

if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

docker --version
echo "Server ready: user 'deploy' can run Docker; ports 22, 80 and 443 are open."
