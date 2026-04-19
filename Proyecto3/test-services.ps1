# Test script para verificar que todos los servicios estén funcionando

Write-Host "`n=== Testing DeliverEats Services ===" -ForegroundColor Cyan

# Test API Gateway
Write-Host "`n[1/6] API Gateway Health..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://34.55.27.36:8080/api/health" -UseBasicParsing
    Write-Host "OK API Gateway: OK" -ForegroundColor Green
} catch {
    Write-Host "X API Gateway: FAILED" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# Test Catalog Service (Direct)
Write-Host "`n[2/6] Catalog Service Health (Direct)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://34.55.27.36:3002/health" -UseBasicParsing
    Write-Host "OK Catalog Service: OK" -ForegroundColor Green
} catch {
    Write-Host "X Catalog Service: FAILED" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# Test Catalog Service (via Gateway)
Write-Host "`n[3/6] Catalog Restaurants (via Gateway)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://34.55.27.36:8080/api/catalog/restaurants" -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
    Write-Host "OK Catalog Restaurants: $($data.data.Count) restaurants found" -ForegroundColor Green
} catch {
    Write-Host "X Catalog Restaurants: FAILED" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# Test Orders Service
Write-Host "`n[4/6] Orders Service Health..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://34.55.27.36:3003/health" -UseBasicParsing
    Write-Host "OK Orders Service: OK" -ForegroundColor Green
} catch {
    Write-Host "X Orders Service: FAILED" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# Test Delivery Service
Write-Host "`n[5/6] Delivery Service Health..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://34.55.27.36:3004/health" -UseBasicParsing  
    Write-Host "OK Delivery Service: OK" -ForegroundColor Green
} catch {
    Write-Host "X Delivery Service: FAILED" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# Test Docker Containers
Write-Host "`n[6/6] Docker Containers Status..." -ForegroundColor Yellow
docker ps --filter "name=delivereats" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan

