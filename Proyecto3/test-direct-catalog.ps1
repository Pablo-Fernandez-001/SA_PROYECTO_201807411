# Test directo al catalog service (sin API Gateway)

Write-Host "`n=== Testing Direct Catalog Service ===`n" -ForegroundColor Cyan

$restaurantData = @{
    name = "Direct Test Restaurant"
    address = "Direct Test Address 123"
} | ConvertTo-Json

Write-Host "Payload: $restaurantData`n" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri "http://34.55.27.36:3002/api/restaurants" -Method Post -Body $restaurantData -ContentType "application/json" -UseBasicParsing
    Write-Host "SUCCESS! Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Green
} catch {
    Write-Host "FAILED! Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response body: $responseBody" -ForegroundColor Yellow
    }
}

Write-Host "`n=== Test Complete ===`n" -ForegroundColor Cyan
