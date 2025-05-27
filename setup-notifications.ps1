# SparkLoop Worker - Notification Setup Script
Write-Host "SparkLoop Worker - Notification Setup" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "This script will help you set up Discord and Slack notifications for your SparkLoop worker."
Write-Host ""

# Discord Setup
Write-Host "DISCORD SETUP" -ForegroundColor Yellow
Write-Host "1. Go to your Discord server"
Write-Host "2. Server Settings > Integrations > Webhooks"
Write-Host "3. Click New Webhook"
Write-Host "4. Choose a channel and copy the webhook URL"
Write-Host "5. Run this command with your webhook URL:"
Write-Host "   wrangler secret put DISCORD_WEBHOOK_URL --env production" -ForegroundColor Green

# Slack Setup
Write-Host ""
Write-Host "SLACK SETUP" -ForegroundColor Yellow
Write-Host "1. Go to https://api.slack.com/apps"
Write-Host "2. Click Create New App > From scratch"
Write-Host "3. Name your app and select your workspace"
Write-Host "4. Go to Incoming Webhooks and activate it"
Write-Host "5. Click Add New Webhook to Workspace"
Write-Host "6. Choose a channel and copy the webhook URL"
Write-Host "7. Run this command with your webhook URL:"
Write-Host "   wrangler secret put SLACK_WEBHOOK_URL --env production" -ForegroundColor Green

# Test notification
Write-Host ""
Write-Host "TESTING NOTIFICATIONS" -ForegroundColor Yellow
Write-Host "After setting up webhooks, test with:"
Write-Host "   powershell -ExecutionPolicy Bypass -File test-worker.ps1" -ForegroundColor Green
Write-Host "This will create a confirmed subscriber and trigger notifications!"

# Google Sheets Integration
Write-Host ""
Write-Host "GOOGLE SHEETS INTEGRATION (Optional)" -ForegroundColor Yellow
Write-Host "To send data to Google Sheets:"
Write-Host "1. Create a Google Apps Script with a webhook"
Write-Host "2. Use the /events endpoint to fetch data:"
Write-Host "   GET https://yourdomain.com/sparkloop/events?token=your-token"
Write-Host "3. Process the JSON response in your script"

# Airtable Integration
Write-Host "`n🗃️  AIRTABLE INTEGRATION (Optional)" -ForegroundColor Yellow
Write-Host "To send data to Airtable:"
Write-Host "1. Get your Airtable API key and base ID"
Write-Host "2. Add webhook calls to the worker (modify sendNotifications function)"
Write-Host "3. Or use the /events endpoint with a scheduled script"

# Notion Integration
Write-Host "`n📝 NOTION INTEGRATION (Optional)" -ForegroundColor Yellow
Write-Host "To send data to Notion:"
Write-Host "1. Create a Notion integration and get API key"
Write-Host "2. Share your database with the integration"
Write-Host "3. Add Notion API calls to the worker or use /events endpoint"

Write-Host ""
Write-Host "CURRENT FEATURES ENABLED:" -ForegroundColor Green
Write-Host "• KV Storage for all events"
Write-Host "• GET /events endpoint for data retrieval"
Write-Host "• GET /stats endpoint for analytics"
Write-Host "• SparkLoop API v2 integration"
Write-Host "• Ghost webhook authentication"
Write-Host "• Rate limiting and security"

Write-Host ""
Write-Host "Your enhanced SparkLoop worker is ready!" -ForegroundColor Cyan
Write-Host "Check the README.md for complete documentation." -ForegroundColor Cyan 