# Test para actualizar un menu item

Write-Host "`n=== Testing Menu Item Update ===" -ForegroundColor Cyan

# Primero, obtener un menu item existente
Write-Host "`n[1] Getting menu item #4..." -ForegroundColor Yellow
try {
    $getResponse = Invoke-WebRequest -Uri "http://34.55.27.36:8080/api/catalog/menu-items" -UseBasicParsing
    $items = ($getResponse.Content | ConvertFrom-Json).data
    $item = $items | Where-Object { $_.id -eq 4 } | Select-Object -First 1
    
    if ($item) {
        Write-Host "Found item: $($item.name) - Price: Q$($item.price)" -ForegroundColor Green
        Write-Host "Restaurant ID: $($item.restaurantId)" -ForegroundColor Gray
        Write-Host "Is Available: $($item.isAvailable)" -ForegroundColor Gray
    } else {
        Write-Host "Item #4 not found" -ForegroundColor Red
        Write-Host "Available items:" -ForegroundColor Yellow
        $items | Select-Object id, name -First 5 | Format-Table
        exit
    }
} catch {
    Write-Host "Error getting menu items: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# Preparar datos para actualizar (solo los campos permitidos)
$updateData = @{
    name = "$($item.name) - UPDATED"
    description = "Test update from PowerShell"
    price = [decimal]51.99
} | ConvertTo-Json

Write-Host "`n[2] Updating menu item..." -ForegroundColor Yellow
Write-Host "Payload: $updateData" -ForegroundColor Gray

# Login como admin primero
Write-Host "`n[3] Logging in..." -ForegroundColor Yellow
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
    Write-Host "Login successful - Token: $($token.Substring(0, 20))..." -ForegroundColor Green
} catch {
    Write-Host "Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# Actualizar el item
Write-Host "`n[4] Sending PUT request..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri "http://34.55.27.36:8080/api/catalog/menu-items/4" -Method Put -Body $updateData -Headers $headers
    Write-Host "SUCCESS! Item updated:" -ForegroundColor Green
    Write-Host "  Name: $($response.data.name)" -ForegroundColor Green
    Write-Host "  Price: Q$($response.data.price)" -ForegroundColor Green
} catch {
    Write-Host "FAILED! Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    # Try to get the error response body
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response body: $responseBody" -ForegroundColor Yellow
    }
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
