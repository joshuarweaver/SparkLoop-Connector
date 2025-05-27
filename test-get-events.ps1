$headers = @{
    "Authorization" = "Bearer s3cr3t-tok3n-gh0st-2024"
}

Write-Host "Testing GET endpoints..."

try {
    Write-Host "`n1. Getting stats..."
    $statsResponse = Invoke-RestMethod -Uri "https://joshweaver.com/sparkloop/stats" -Method GET -Headers $headers
    Write-Host "Stats Response:"
    $statsResponse | ConvertTo-Json -Depth 10

    Write-Host "`n2. Getting recent events..."
    $eventsResponse = Invoke-RestMethod -Uri "https://joshweaver.com/sparkloop/events?limit=5" -Method GET -Headers $headers
    Write-Host "Events Response:"
    $eventsResponse | ConvertTo-Json -Depth 10

    Write-Host "`n3. Getting specific subscriber event..."
    $specificResponse = Invoke-RestMethod -Uri "https://joshweaver.com/sparkloop/events?email=worker-test@example.com" -Method GET -Headers $headers
    Write-Host "Specific Subscriber Response:"
    $specificResponse | ConvertTo-Json -Depth 10

} catch {
    Write-Host "Error occurred:"
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response body: $responseBody"
    }
} 