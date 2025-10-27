#!/bin/bash

# ===============================================
# Deploy Script for Tatarstan Tours Platform
# ===============================================

set -e  # Exit on error

echo "🚀 Starting deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/var/www/tatarstan-tours"
BACKUP_DIR="/var/backups/tatarstan-tours"
LOG_FILE="/var/log/tatarstan-tours-deploy.log"

# Function to log messages
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

# Check if script is run from project directory
if [ "$PWD" != "$PROJECT_DIR" ]; then
    log "Changing to project directory: $PROJECT_DIR"
    cd "$PROJECT_DIR" || error "Failed to change directory to $PROJECT_DIR"
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# ===============================================
# STEP 1: Create backup
# ===============================================
log "📦 Creating backup..."
BACKUP_NAME="backup-$(date +'%Y%m%d-%H%M%S').tar.gz"
tar -czf "$BACKUP_DIR/$BACKUP_NAME" \
    --exclude=node_modules \
    --exclude=.next \
    --exclude=.git \
    --exclude=public/uploads/* \
    . || warn "Backup creation failed, continuing anyway..."

# Keep only last 5 backups
log "🗑️  Cleaning old backups (keeping last 5)..."
cd "$BACKUP_DIR"
ls -t | tail -n +6 | xargs -r rm --
cd "$PROJECT_DIR"

# ===============================================
# STEP 2: Pull latest changes from Git
# ===============================================
log "📥 Pulling latest changes from Git..."

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
log "Current branch: $CURRENT_BRANCH"

# Stash any local changes (just in case)
if ! git diff-index --quiet HEAD --; then
    warn "Local changes detected, stashing..."
    git stash save "Auto-stash before deploy $(date +'%Y-%m-%d %H:%M:%S')"
fi

# Pull latest changes
git pull origin "$CURRENT_BRANCH" || error "Git pull failed"

# ===============================================
# STEP 3: Install dependencies
# ===============================================
log "📦 Installing dependencies..."
npm ci --production || error "npm ci failed"

# ===============================================
# STEP 4: Build the application
# ===============================================
log "🔨 Building the application..."
npm run build || error "Build failed"

# ===============================================
# STEP 5: Restart the application with PM2
# ===============================================
log "🔄 Restarting application..."

# Check if PM2 process exists
if pm2 list | grep -q "tatarstan-tours"; then
    log "Restarting existing PM2 process..."
    pm2 restart tatarstan-tours || error "PM2 restart failed"
else
    log "Starting new PM2 process..."
    pm2 start npm --name "tatarstan-tours" -- start || error "PM2 start failed"
    pm2 save || warn "PM2 save failed"
fi

# ===============================================
# STEP 6: Health check
# ===============================================
log "🏥 Performing health check..."
sleep 5  # Wait for the app to start

# Check if app is running
if pm2 list | grep -q "tatarstan-tours.*online"; then
    log "✅ Application is running"
else
    error "Application failed to start"
fi

# Check HTTP response (assuming app runs on port 3000)
if curl -f -s http://localhost:3000 > /dev/null; then
    log "✅ HTTP health check passed"
else
    warn "HTTP health check failed, but continuing..."
fi

# ===============================================
# STEP 7: Reload Nginx (if needed)
# ===============================================
if command -v nginx &> /dev/null; then
    log "🔄 Reloading Nginx..."
    sudo nginx -t && sudo systemctl reload nginx || warn "Nginx reload failed"
fi

# ===============================================
# STEP 8: Display status
# ===============================================
log "📊 Current status:"
pm2 list
pm2 logs tatarstan-tours --lines 10 --nostream

# ===============================================
# DONE
# ===============================================
echo ""
log "✅ Deployment completed successfully!"
log "📝 Backup saved to: $BACKUP_DIR/$BACKUP_NAME"
log "📋 Logs available at: $LOG_FILE"
log "🔍 View logs: pm2 logs tatarstan-tours"
log "📊 View status: pm2 status"
echo ""

