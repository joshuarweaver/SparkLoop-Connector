$headers = @{
    "Authorization" = "Bearer 7078a8d6d7ffd5b145312f73"
    "Content-Type" = "application/json"
}

$body = @{
    email = "test@example.com"
    status = "confirmed"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://api.sparkloop.app/v1/subscribers/update" -Method POST -Headers $headers -Body $body
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