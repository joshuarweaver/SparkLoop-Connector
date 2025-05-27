$headers = @{
    "X-Api-Key" = "7078a8d6d7ffd5b145312f73"
    "Content-Type" = "application/json"
}

$body = @{
    status = "confirmed"
} | ConvertTo-Json

try {
    Write-Host "Testing SparkLoop API v2 - Update subscriber..."
    $response = Invoke-RestMethod -Uri "https://api.sparkloop.app/v2/subscribers/test@example.com" -Method PUT -Headers $headers -Body $body
    Write-Host "Update Success! Response:"
    $response | ConvertTo-Json -Depth 10
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "Subscriber not found, trying to create..."
        
        $createBody = @{
            email = "test@example.com"
            status = "confirmed"
        } | ConvertTo-Json
        
        try {
            $createResponse = Invoke-RestMethod -Uri "https://api.sparkloop.app/v2/subscribers" -Method POST -Headers $headers -Body $createBody
            Write-Host "Create Success! Response:"
            $createResponse | ConvertTo-Json -Depth 10
        } catch {
            Write-Host "Create Error occurred:"
            Write-Host $_.Exception.Message
            if ($_.Exception.Response) {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $responseBody = $reader.ReadToEnd()
                Write-Host "Response body: $responseBody"
            }
        }
    } else {
        Write-Host "Update Error occurred:"
        Write-Host $_.Exception.Message
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response body: $responseBody"
        }
    }
} 