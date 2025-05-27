$headers = @{
    "Authorization" = "Bearer s3cr3t-tok3n-gh0st-2024"
}

try {
    Write-Host "Checking for Ghost test event..."
    $response = Invoke-RestMethod -Uri "https://joshweaver.com/sparkloop/events?email=ghost-test@example.com" -Headers $headers
    Write-Host "Found event:"
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error or no event found:"
    Write-Host $_.Exception.Message
} 