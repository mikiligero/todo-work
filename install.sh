#!/bin/bash

# Exit on error
set -e

# Configuration
APP_DIR="/opt/todo-work"
REPO_URL="https://github.com/mikiligero/todo-work.git"
NODE_VERSION="20"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Todo Work Installation...${NC}"

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
        cp prisma/dev.db /tmp/todo-work-db.backup
    fi
    if [ -f ".env" ]; then
        cp .env /tmp/todo-work-env.backup
    fi

    # FORCE UPDATE
    git fetch --all
    git reset --hard origin/main
    
    # RESTORE DATABASE
    if [ -f "/tmp/todo-work-db.backup" ]; then
        echo -e "${BLUE}Restoring database...${NC}"
        mkdir -p prisma 
        cp /tmp/todo-work-db.backup prisma/dev.db
    fi
     # RESTORE ENV if needed
    if [ ! -f ".env" ] && [ -f "/tmp/todo-work-env.backup" ]; then
        cp /tmp/todo-work-env.backup .env
    fi
else
    echo -e "${BLUE}Cloning repository...${NC}"
    # LEGACY SUPPORT: Check if old project exists to migrate data
    if [ -d "/opt/todo-kines" ]; then
        echo -e "${BLUE}Found legacy todo-kines installation. Preparing migration...${NC}"
        mkdir -p "$APP_DIR/prisma"
        if [ -f "/opt/todo-kines/prisma/dev.db" ]; then
            cp "/opt/todo-kines/prisma/dev.db" "$APP_DIR/prisma/dev.db"
            echo -e "${GREEN}Legacy database migrated.${NC}"
        fi
        if [ -f "/opt/todo-kines/.env" ]; then
            cp "/opt/todo-kines/.env" "$APP_DIR/.env"
            # Update paths in legacy .env
            sed -i "s|/opt/todo-kines|${APP_DIR}|g" "$APP_DIR/.env"
        fi
    fi

    git clone "$REPO_URL" "$APP_DIR" || (mkdir -p "$APP_DIR" && cd "$APP_DIR" && git init && git remote add origin "$REPO_URL" && git fetch && git checkout -f main)
    cd "$APP_DIR"
fi

# 4. Install Dependencies
echo -e "${BLUE}Installing NPM dependencies...${NC}"
npm install

# 5. Environment Configuration
if [ ! -f .env ]; then
    echo -e "${BLUE}Creating .env file...${NC}"
    AUTH_SECRET=$(openssl rand -base64 32)
    
    cat > .env <<EOL
DATABASE_URL="file:${APP_DIR}/prisma/dev.db"
AUTH_SECRET="${AUTH_SECRET}"
TZ="Europe/Madrid"
EOL
    echo -e "${GREEN}.env created.${NC}"
else
    # Ensure DATABASE_URL is absolute and correct even in existing .env
    sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"file:${APP_DIR}/prisma/dev.db\"|g" .env
fi

# 6. Database Setup
echo -e "${BLUE}Setting up database...${NC}"
mkdir -p prisma
npx prisma generate
# Try migrate deploy first (for production stability if folder exists), otherwise db push
if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations)" ]; then
    npx prisma migrate deploy || npx prisma db push --accept-data-loss
else
    npx prisma db push --accept-data-loss
fi
npx prisma generate # Regenerate after schema sync to be safe

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
cat > /etc/systemd/system/todo-work.service <<EOL
[Unit]
Description=Todo Work Next.js App
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${APP_DIR}
ExecStart=/usr/bin/node .next/standalone/server.js
Restart=always
Environment=NODE_ENV=production
Environment=PORT=3001
Environment=HOSTNAME=0.0.0.0

[Install]
WantedBy=multi-user.target
EOL

systemctl daemon-reload
systemctl enable todo-work
systemctl restart todo-work

echo -e "${GREEN}Installation Complete!${NC}"
echo -e "App is running on port 3001"
