#!/usr/bin/env node

/**
 * Netlify Deployment Script for Mavericks Web App
 * This script automates the build and deployment process
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m',
};

const log = {
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    step: (msg) => console.log(`\n${colors.bright}${msg}${colors.reset}`),
};

function run(command, description) {
    try {
        log.info(description);
        execSync(command, { stdio: 'inherit' });
        log.success(`${description} - Done`);
        return true;
    } catch (error) {
        log.error(`${description} - Failed`);
        return false;
    }
}

function checkFile(filePath, description) {
    if (fs.existsSync(filePath)) {
        log.success(`${description} exists`);
        return true;
    } else {
        log.error(`${description} not found`);
        return false;
    }
}

async function main() {
    console.log(`
${colors.bright}╔═══════════════════════════════════════════════╗
║   Mavericks Web App - Netlify Deployment     ║
╚═══════════════════════════════════════════════╝${colors.reset}
  `);

    // Step 1: Check prerequisites
    log.step('📋 Step 1: Checking Prerequisites');

    if (!checkFile('package.json', 'package.json')) {
        process.exit(1);
    }

    if (!checkFile('netlify.toml', 'netlify.toml')) {
        log.warning('netlify.toml not found - will be created during deployment');
    }

    // Step 2: Install dependencies
    log.step('📦 Step 2: Installing Dependencies');
    if (!run('npm install', 'Installing npm packages')) {
        process.exit(1);
    }

    // Step 3: Build for web
    log.step('🔨 Step 3: Building for Web');
    if (!run('npm run build:web', 'Building web application')) {
        process.exit(1);
    }

    // Step 4: Verify build output
    log.step('✅ Step 4: Verifying Build Output');
    const distPath = path.join(__dirname, 'dist');
    const indexPath = path.join(distPath, 'index.html');

    if (!checkFile(distPath, 'dist directory')) {
        log.error('Build failed - dist directory not created');
        process.exit(1);
    }

    if (!checkFile(indexPath, 'index.html')) {
        log.error('Build failed - index.html not created');
        process.exit(1);
    }

    // Step 5: Check for Netlify CLI
    log.step('🌐 Step 5: Checking Netlify CLI');
    try {
        execSync('netlify --version', { stdio: 'pipe' });
        log.success('Netlify CLI is installed');

        // Ask user if they want to deploy
        console.log(`\n${colors.bright}Build completed successfully!${colors.reset}`);
        console.log(`\nTo deploy to Netlify, run one of these commands:`);
        console.log(`  ${colors.green}netlify deploy${colors.reset}         - Deploy to draft URL`);
        console.log(`  ${colors.green}netlify deploy --prod${colors.reset}  - Deploy to production`);
        console.log(`\nOr visit: ${colors.blue}https://app.netlify.com/drop${colors.reset}`);
        console.log(`And drag & drop the ${colors.yellow}dist${colors.reset} folder\n`);

    } catch (error) {
        log.warning('Netlify CLI not installed');
        console.log(`\nTo install Netlify CLI, run:`);
        console.log(`  ${colors.green}npm install -g netlify-cli${colors.reset}\n`);
        console.log(`Or deploy manually:`);
        console.log(`  1. Visit: ${colors.blue}https://app.netlify.com/drop${colors.reset}`);
        console.log(`  2. Drag & drop the ${colors.yellow}dist${colors.reset} folder\n`);
    }

    // Success message
    console.log(`
${colors.bright}╔═══════════════════════════════════════════════╗
║            🎉 Build Successful! 🎉            ║
╚═══════════════════════════════════════════════╝${colors.reset}

${colors.green}Your web app is ready for deployment!${colors.reset}

📁 Build output: ${colors.yellow}dist/${colors.reset}
📄 Entry point: ${colors.yellow}dist/index.html${colors.reset}

${colors.bright}Next Steps:${colors.reset}
1. Test locally: ${colors.green}npm run serve${colors.reset}
2. Deploy to Netlify: ${colors.green}netlify deploy --prod${colors.reset}
3. Or use Git-based deployment (see NETLIFY_DEPLOYMENT.md)

For detailed instructions, see: ${colors.blue}NETLIFY_DEPLOYMENT.md${colors.reset}
  `);
}

main().catch((error) => {
    log.error(`Deployment script failed: ${error.message}`);
    process.exit(1);
});
