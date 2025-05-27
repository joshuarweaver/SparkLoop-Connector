# Test what might be happening with real Ghost webhooks
Write-Host "=== TESTING REAL GHOST WEBHOOK SCENARIOS ===" -ForegroundColor Cyan

# Test 1: Wrong secret
Write-Host "`n1. Testing with wrong secret (common issue):" -ForegroundColor Yellow
$wrongSecret = "wrong-secret"
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()

$body = @{
    member = @{
        email = "real-signup@example.com"
        name = "Real Signup"
        status = "free"
        subscribed = $true
    }
} | ConvertTo-Json -Compress

$payload = $body + $timestamp
$hmac = [System.Security.Cryptography.HMACSHA256]::new([System.Text.Encoding]::UTF8.GetBytes($wrongSecret))
$hash = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($payload))
$signature = "sha256=" + [System.BitConverter]::ToString($hash).Replace("-", "").ToLower() + ", t=" + $timestamp

$headers = @{
    "Content-Type" = "application/json"
    "x-ghost-signature" = $signature
    "x-ghost-event" = "member.added"
}

try {
    $response = Invoke-RestMethod -Uri "https://joshweaver.com/sparkloop/confirm" -Method POST -Headers $headers -Body $body
    Write-Host "Unexpected success with wrong secret!"
} catch {
    Write-Host "Expected failure: $($_.Exception.Message)"
}

# Test 2: No signature (Ghost might not be sending signatures)
Write-Host "`n2. Testing without signature:" -ForegroundColor Yellow
$headersNoSig = @{
    "Content-Type" = "application/json"
    "x-ghost-event" = "member.added"
}

try {
    $response = Invoke-RestMethod -Uri "https://joshweaver.com/sparkloop/confirm" -Method POST -Headers $headersNoSig -Body $body
    Write-Host "Unexpected success without signature!"
} catch {
    Write-Host "Expected failure: $($_.Exception.Message)"
}

# Test 3: Check if Ghost webhook secret is configured in your Ghost admin
Write-Host "`n3. IMPORTANT CHECK:" -ForegroundColor Red
Write-Host "In your Ghost admin webhook configuration, did you set the SECRET field?"
Write-Host "If the secret field is empty in Ghost, it won't send x-ghost-signature headers!"
Write-Host ""
Write-Host "Go to Ghost Admin > Settings > Integrations > Webhooks"
Write-Host "Edit your SparkLoop webhook and ensure the SECRET field contains:"
Write-Host "s3cr3t-tok3n-gh0st-2024" -ForegroundColor Green 