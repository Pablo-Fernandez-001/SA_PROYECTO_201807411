# Test para crear una orden completa

Write-Host "`n=== Testing Order Creation ===" -ForegroundColor Cyan

# Step 1: Login como cliente
Write-Host "`n[1] Logging in as client..." -ForegroundColor Yellow
$loginData = @{
    email = "cliente@test.com"
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

# Step 2: Obtener restaurantes
Write-Host "`n[2] Getting restaurants..." -ForegroundColor Yellow
try {
    $restaurants = Invoke-RestMethod -Uri "http://34.55.27.36:8080/api/catalog/restaurants"
    $activeRestaurants = $restaurants.data | Where-Object { $_.isActive -eq $true }
    Write-Host "Found $($activeRestaurants.Count) active restaurants" -ForegroundColor Green
    
    # Try to find Sushi Master or Taco Loco which have menu items
    $restaurant = $activeRestaurants | Where-Object { $_.name -match "Sushi|Taco" } | Select-Object -First 1
    if (-not $restaurant) {
        $restaurant = $activeRestaurants[0]
    }
    
    Write-Host "Using restaurant: $($restaurant.name) (ID: $($restaurant.id))" -ForegroundColor Cyan
} catch {
    Write-Host "Failed to get restaurants: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# Step 3: Obtener menú del restaurante
Write-Host "`n[3] Getting menu items for restaurant $($restaurant.id)..." -ForegroundColor Yellow
try {
    $menu = Invoke-RestMethod -Uri "http://34.55.27.36:8080/api/catalog/restaurants/$($restaurant.id)/menu"
    $availableItems = $menu.data | Where-Object { $_.isAvailable -eq $true }
    Write-Host "Found $($availableItems.Count) available menu items" -ForegroundColor Green
    if ($availableItems.Count -eq 0) {
        Write-Host "No available items! Can't create order." -ForegroundColor Red
        exit
    }
    Write-Host "Menu items:" -ForegroundColor Cyan
    $availableItems | Select-Object -First 3 | ForEach-Object {
        Write-Host "  - $($_.name): Q$($_.price)" -ForegroundColor Gray
    }
} catch {
    Write-Host "Failed to get menu: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# Step 4: Crear orden con 2 items
Write-Host "`n[4] Creating order with 2 items..." -ForegroundColor Yellow
$orderData = @{
    userId = 2  # Cliente user ID from auth_db
    restaurantId = $restaurant.id
    items = @(
        @{
            menuItemId = $availableItems[0].id
            quantity = 2
            price = $availableItems[0].price
        }
    )
    deliveryAddress = "123 Test Street, Zone 10"
    notes = "Test order from PowerShell"
} | ConvertTo-Json -Depth 10

Write-Host "Payload:" -ForegroundColor Gray
Write-Host $orderData -ForegroundColor Gray

try {
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri "http://34.55.27.36:8080/api/orders" -Method Post -Body $orderData -Headers $headers
    Write-Host "`nSUCCESS! Order created:" -ForegroundColor Green
    Write-Host "  Order ID: $($response.data.id)" -ForegroundColor Green
    Write-Host "  Restaurant: $($response.data.restaurantId)" -ForegroundColor Green
    Write-Host "  Total: Q$($response.data.totalAmount)" -ForegroundColor Green
    Write-Host "  Status: $($response.data.status)" -ForegroundColor Green
} catch {
    Write-Host "FAILED! Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response body: $responseBody" -ForegroundColor Yellow
    }
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
