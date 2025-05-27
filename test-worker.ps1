$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer s3cr3t-tok3n-gh0st-2024"
}

$body = @{
    email = "worker-test@example.com"
    status = "confirmed"
    name = "Worker Test User"
    source = "direct-test"
} | ConvertTo-Json

try {
    Write-Host "Testing our Cloudflare Worker..."
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