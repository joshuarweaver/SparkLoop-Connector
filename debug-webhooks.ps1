$headers = @{
    "Authorization" = "Bearer s3cr3t-tok3n-gh0st-2024"
}

Write-Host "=== DEBUGGING GHOST WEBHOOKS ===" -ForegroundColor Cyan
Write-Host ""

# Get recent events
Write-Host "1. Recent events (last 10):" -ForegroundColor Yellow
try {
    $events = Invoke-RestMethod -Uri "https://joshweaver.com/sparkloop/events?limit=10" -Headers $headers
    Write-Host "Total events found: $($events.total)"
    
    foreach ($event in $events.events) {
        $source = $event.additional_data.source
        $ghostEvent = $event.additional_data.ghost_event
        Write-Host "  - $($event.email) | $($event.timestamp) | Source: $source | Ghost Event: $ghostEvent"
    }
} catch {
    Write-Host "Error getting events: $($_.Exception.Message)"
}

Write-Host ""

# Get stats
Write-Host "2. Overall stats:" -ForegroundColor Yellow
try {
    $stats = Invoke-RestMethod -Uri "https://joshweaver.com/sparkloop/stats" -Headers $headers
    Write-Host "  - Total events: $($stats.total_events)"
    Write-Host "  - Unique subscribers: $($stats.unique_subscribers)"
    Write-Host "  - Last updated: $($stats.last_updated)"
} catch {
    Write-Host "Error getting stats: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "=== NEXT STEPS ===" -ForegroundColor Green
Write-Host "If you only see test events above, then Ghost webhooks aren't reaching the worker."
Write-Host "Check your Ghost webhook configuration:"
Write-Host "1. Go to Ghost Admin > Settings > Integrations > Webhooks"
Write-Host "2. Verify webhook URL: https://joshweaver.com/sparkloop/confirm"
Write-Host "3. Verify secret matches: s3cr3t-tok3n-gh0st-2024"
Write-Host "4. Check webhook events are enabled for: member.added, member.updated, member.deleted" 