# Test para crear un restaurante

Write-Host "`n=== Testing Restaurant Creation ===" -ForegroundColor Cyan

# Login como admin
Write-Host "`n[1] Logging in as admin..." -ForegroundColor Yellow
$loginData = @{
    email = "admin@delivereats.com"
    password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://34.55.27.36:8080/api/auth/login" -Method Post -Body $loginData -ContentType "application/json"
    $token = $loginResponse.token
    if (-not $token) {
        $token = $loginResponse.data.token
    }
    Write-Host "Login successful" -ForegroundColor Green
} catch {
    Write-Host "Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# Crear restaurante
Write-Host "`n[2] Creating new restaurant..." -ForegroundColor Yellow
$restaurantData = @{
    name = "Test Restaurant $(Get-Date -Format 'HHmmss')"
    description = "Test restaurant created via PowerShell"
    address = "Test Address 123, Zona 10"
} | ConvertTo-Json

Write-Host "Payload: $restaurantData" -ForegroundColor Gray

try {
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri "http://34.55.27.36:8080/api/catalog/restaurants" -Method Post -Body $restaurantData -Headers $headers
    Write-Host "SUCCESS! Restaurant created:" -ForegroundColor Green
    Write-Host "  ID: $($response.data.id)" -ForegroundColor Green
    Write-Host "  Name: $($response.data.name)" -ForegroundColor Green
    Write-Host "  Address: $($response.data.address)" -ForegroundColor Green
    Write-Host "  Active: $($response.data.isActive)" -ForegroundColor Green
} catch {
    Write-Host "FAILED! Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response body: $responseBody" -ForegroundColor Yellow
    }
}

# Verificar que aparece en la lista
Write-Host "`n[3] Verifying restaurant appears in list..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://34.55.27.36:8080/api/catalog/restaurants"
    $allRestaurants = $response.data
    Write-Host "Total restaurants found: $($allRestaurants.Count)" -ForegroundColor Green
    Write-Host "`nRestaurants (showing active status):" -ForegroundColor Cyan
    $allRestaurants | Select-Object id, name, isActive | Format-Table -AutoSize
} catch {
    Write-Host "Failed to get restaurants: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
