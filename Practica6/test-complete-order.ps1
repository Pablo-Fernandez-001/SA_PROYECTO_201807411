# Test completo: Crear orden y verificar que muestre restaurante, dirección e items

Write-Host "`n=== Testing Complete Order Flow with Restaurant Info ===" -ForegroundColor Cyan

# Login como cliente
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
    $userId = $loginResponse.user.id
    if (-not $userId) {
        $userId = $loginResponse.data.user.id
    }
    Write-Host "Login successful - User ID: $userId" -ForegroundColor Green
} catch {
    Write-Host "Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# Obtener restaurante activo
Write-Host "`n[2] Getting active restaurant..." -ForegroundColor Yellow
try {
    $restaurants = Invoke-RestMethod -Uri "http://34.55.27.36:8080/api/catalog/restaurants"
    $restaurant = ($restaurants.data | Where-Object { $_.name -match "Sushi|Taco" -and $_.is_active -eq $true })[0]
    Write-Host "Using: $($restaurant.name) (ID: $($restaurant.id))" -ForegroundColor Cyan
} catch {
    Write-Host "Failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# Obtener menú
Write-Host "`n[3] Getting menu..." -ForegroundColor Yellow
try {
    $menu = Invoke-RestMethod -Uri "http://34.55.27.36:8080/api/catalog/restaurants/$($restaurant.id)/menu"
    $item = ($menu.data | Where-Object { $_.is_available -eq $true })[0]
    Write-Host "Item: $($item.name) - Q$($item.price)" -ForegroundColor Cyan
} catch {
    Write-Host "Failed: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# Crear orden
Write-Host "`n[4] Creating order..." -ForegroundColor Yellow
$orderData = @{
    userId = $userId
    restaurantId = $restaurant.id
    items = @(
        @{
            menuItemId = $item.id
            quantity = 2
            price = $item.price
        }
    )
    deliveryAddress = "Avenida Reforma 10-00, Zona 10, Guatemala"
    notes = "Test order - please verify restaurant name appears"
} | ConvertTo-Json -Depth 10

try {
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri "http://34.55.27.36:8080/api/orders" -Method Post -Body $orderData -Headers $headers
    Write-Host "SUCCESS! Order created: #$($response.order.id)" -ForegroundColor Green
    Write-Host "  Restaurant: $($response.order.restaurantName)" -ForegroundColor Green
    Write-Host "  Total: Q$($response.order.total)" -ForegroundColor Green
} catch {
    Write-Host "FAILED! $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        Write-Host $reader.ReadToEnd() -ForegroundColor Yellow
    }
    exit
}

# Verificar que la orden aparece en "Mis Pedidos" con toda la info
Write-Host "`n[5] Checking user's orders..." -ForegroundColor Yellow
try {
    $myOrders = Invoke-RestMethod -Uri "http://34.55.27.36:8080/api/orders/user/$userId" -Headers $headers
    $lastOrder = $myOrders[0]
    
    Write-Host "`nOrder Details:" -ForegroundColor Cyan
    Write-Host "  Order #$($lastOrder.id)" -ForegroundColor White
    Write-Host "  Restaurant Name: $($lastOrder.restaurantName)" -ForegroundColor White
    Write-Host "  Delivery Address: $($lastOrder.delivery_address)" -ForegroundColor White
    Write-Host "  Items: $($lastOrder.items.Count)" -ForegroundColor White
    
    if ($lastOrder.items -and $lastOrder.items.Count -gt 0) {
        Write-Host "`n  Items List:" -ForegroundColor Cyan
        foreach ($orderItem in $lastOrder.items) {
            Write-Host "    - $($orderItem.quantity)x $($orderItem.name) @ Q$($orderItem.price) = Q$($orderItem.subtotal)" -ForegroundColor White
        }
    }
    
    Write-Host "`n  Total: Q$($lastOrder.total)" -ForegroundColor Green
    Write-Host "  Status: $($lastOrder.status)" -ForegroundColor Yellow
    
} catch {
    Write-Host "Failed to get orders: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
