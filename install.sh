#!/bin/bash

# Exit on error
set -e

# Configuration
APP_DIR="/opt/todo-kines"
REPO_URL="https://github.com/mikiligero/todo-kines.git"
NODE_VERSION="20"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Todo Kines Installation...${NC}"

# 1. System Updates & Dependencies
echo -e "${BLUE}Updating system and installing dependencies...${NC}"
apt-get update && apt-get upgrade -y
apt-get install -y curl git build-essential openssl

# 2. Install Node.js
if ! command -v node &> /dev/null; then
    echo -e "${BLUE}Installing Node.js ${NODE_VERSION}...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
else
    echo -e "${GREEN}Node.js is already installed.${NC}"
fi

# 3. Setup Application Directory
if [ -d "$APP_DIR" ]; then
    echo -e "${BLUE}Updating existing application...${NC}"
    cd "$APP_DIR"
    
    # BACKUP DATABASE & ENV
    if [ -f "prisma/dev.db" ]; then
        echo -e "${BLUE}Backing up database...${NC}"
        cp prisma/dev.db /tmp/todo-kines-db.backup
    fi
    if [ -f ".env" ]; then
        cp .env /tmp/todo-kines-env.backup
    fi

    # FORCE UPDATE
    # This solves conflicts by forcing the local state to match remote
    git fetch --all
    git reset --hard origin/main
    
    # RESTORE DATABASE
    if [ -f "/tmp/todo-kines-db.backup" ]; then
        echo -e "${BLUE}Restoring database...${NC}"
        # Ensure dir exists
        mkdir -p prisma 
        cp /tmp/todo-kines-db.backup prisma/dev.db
    fi
     # RESTORE ENV if needed (usually reset --hard doesn't touch untracked files like .env, but good to be safe)
    if [ ! -f ".env" ] && [ -f "/tmp/todo-kines-env.backup" ]; then
        cp /tmp/todo-kines-env.backup .env
    fi
else
    echo -e "${BLUE}Cloning repository...${NC}"
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# 4. Install Dependencies
echo -e "${BLUE}Installing NPM dependencies...${NC}"
npm install

# 5. Environment Configuration
if [ ! -f .env ]; then
    echo -e "${BLUE}Creating .env file...${NC}"
    # Generate a secure random string for AUTH_SECRET if needed, currently using a placeholder or openssl
    AUTH_SECRET=$(openssl rand -base64 32)
    
    cat > .env <<EOL
DATABASE_URL="file:./dev.db"
AUTH_SECRET="${AUTH_SECRET}"
# Add other env vars here if needed
EOL
    echo -e "${GREEN}.env created.${NC}"
fi

# 6. Database Setup
echo -e "${BLUE}Setting up database...${NC}"
npx prisma generate
if ! npx prisma migrate deploy; then
    echo -e "${BLUE}Migration failed. Attempting db push...${NC}"
    npx prisma db push
fi

# 7. Build Application
echo -e "${BLUE}Building application...${NC}"
npm run build

# Prepare standalone build
# https://nextjs.org/docs/pages/api-reference/next-config-js/output#automatically-copying-traced-files
echo -e "${BLUE}Preparing standalone files...${NC}"
cp -r public .next/standalone/public
mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/static

# 8. Setup Systemd Service
echo -e "${BLUE}Configuring systemd service...${NC}"
cat > /etc/systemd/system/todo-kines.service <<EOL
[Unit]
Description=Todo Kines Next.js App
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${APP_DIR}
ExecStart=/usr/bin/node .next/standalone/server.js
Restart=always
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=0.0.0.0

[Install]
WantedBy=multi-user.target
EOL

systemctl daemon-reload
systemctl enable todo-kines
systemctl restart todo-kines

echo -e "${GREEN}Installation Complete!${NC}"
echo -e "App is running on port 3000"
