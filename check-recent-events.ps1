$headers = @{
    "Authorization" = "Bearer s3cr3t-tok3n-gh0st-2024"
}

Write-Host "=== CHECKING FOR RECENT REAL GHOST EVENTS ===" -ForegroundColor Cyan

# Get all recent events
try {
    $events = Invoke-RestMethod -Uri "https://joshweaver.com/sparkloop/events?limit=20" -Headers $headers
    Write-Host "Total events found: $($events.total)"
    
    $now = Get-Date
    foreach ($event in $events.events) {
        $eventTime = [DateTime]::Parse($event.timestamp)
        $timeAgo = $now - $eventTime
        $source = $event.additional_data.source
        $ghostEvent = $event.additional_data.ghost_event
        
        if ($timeAgo.TotalDays -ge 1) {
            $timeAgoStr = "$([math]::Floor($timeAgo.TotalDays)) days ago"
        } elseif ($timeAgo.TotalHours -ge 1) {
            $timeAgoStr = "$([math]::Floor($timeAgo.TotalHours)) hours ago"
        } else {
            $timeAgoStr = "$([math]::Floor($timeAgo.TotalMinutes)) minutes ago"
        }
        
        $color = if ($source -eq "ghost-webhook") { "Green" } else { "Yellow" }
        Write-Host "📧 $($event.email)" -ForegroundColor $color
        Write-Host "   Time: $($event.timestamp) ($timeAgoStr)"
        Write-Host "   Source: $source | Ghost Event: $ghostEvent"
        Write-Host ""
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}

Write-Host "=== ANALYSIS ===" -ForegroundColor Cyan
Write-Host "Your Ghost shows webhooks sent at 3:53 AM on May 27, 2025"
Write-Host "If no recent ghost-webhook events appear above, check:"
Write-Host "1. Ghost webhook secret matches: s3cr3t-tok3n-gh0st-2024"
Write-Host "2. Ghost webhook URL is: https://joshweaver.com/sparkloop/confirm" 