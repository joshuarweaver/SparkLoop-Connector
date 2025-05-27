# Test Ghost webhook simulation
$secret = "s3cr3t-tok3n-gh0st-2024"
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()

$body = @{
    member = @{
        email = "ghost-test@example.com"
        name = "Ghost Test User"
        status = "free"
        subscribed = $true
    }
} | ConvertTo-Json -Compress

# Create HMAC signature like Ghost does: body + timestamp
$payload = $body + $timestamp
$hmac = [System.Security.Cryptography.HMACSHA256]::new([System.Text.Encoding]::UTF8.GetBytes($secret))
$hash = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($payload))
$signature = "sha256=" + [System.BitConverter]::ToString($hash).Replace("-", "").ToLower() + ", t=" + $timestamp

$headers = @{
    "Content-Type" = "application/json"
    "x-ghost-signature" = $signature
    "x-ghost-event" = "member.added"
}

try {
    Write-Host "Testing Ghost webhook simulation..."
    Write-Host "Signature: $signature"
    Write-Host "Body: $body"
    
    $response = Invoke-RestMethod -Uri "https://joshweaver.com/sparkloop/confirm" -Method POST -Headers $headers -Body $body
    Write-Host "Success! Response:"
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error occurred:"
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response body: $responseBody"
    }
} 