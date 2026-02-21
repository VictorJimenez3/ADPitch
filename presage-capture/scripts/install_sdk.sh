#!/bin/bash
# presage-capture/scripts/install_sdk.sh
# Install the SmartSpectra C++ SDK on Ubuntu 22.04 / Mint 21

set -e

echo "🔧 Installing Presage SmartSpectra C++ SDK..."

# Add Presage repository
curl -s "https://presage-security.github.io/PPA/KEY.gpg" \
  | gpg --dearmor \
  | sudo tee /etc/apt/trusted.gpg.d/presage-technologies.gpg >/dev/null

sudo curl -s --compressed \
  -o /etc/apt/sources.list.d/presage-technologies.list \
  "https://presage-security.github.io/PPA/presage-technologies.list"

# Install SDK and dependencies
sudo apt update
sudo apt install -y libsmartspectra-dev libopencv-dev libglog-dev libsqlite3-dev

echo "✅ SmartSpectra SDK installed!"
echo "   Next: mkdir build && cd build && cmake .. && make"
