$ErrorActionPreference = "Continue"
$BASE = "http://34.55.27.36:8080"
$results = @()

function Test-Endpoint {
    param([string]$Label, [string]$Method, [string]$Url, [string]$Body, [hashtable]$Headers)
    try {
        $params = @{ Uri = $Url; Method = $Method; UseBasicParsing = $true }
        if ($Body) { $params.Body = $Body; $params.ContentType = "application/json" }
        if ($Headers) { $params.Headers = $Headers }
        $r = Invoke-WebRequest @params
        return @{ Label=$Label; Status=$r.StatusCode; Body=$r.Content }
    } catch {
        $status = [int]$_.Exception.Response.StatusCode
        try { $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream()); $body = $sr.ReadToEnd() } catch { $body = $_.Exception.Message }
        return @{ Label=$Label; Status=$status; Body=$body }
    }
}

$out = ""

# 1. Health
$r = Test-Endpoint "HEALTH" "GET" "$BASE/health"
$out += "1. HEALTH: $($r.Status) - $($r.Body)`n"

# 2. Register new user
$r = Test-Endpoint "REGISTER" "POST" "$BASE/api/auth/register" '{"name":"TestUser","email":"testuser123@test.com","password":"password123","role":"CLIENTE"}'
$out += "2. REGISTER: $($r.Status) - $($r.Body.Substring(0, [Math]::Min(200, $r.Body.Length)))`n"

# 3. Login
$r = Test-Endpoint "LOGIN" "POST" "$BASE/api/auth/login" '{"email":"cliente@test.com","password":"admin123"}'
$loginData = $r.Body | ConvertFrom-Json
$token = $loginData.data.token
$out += "3. LOGIN: $($r.Status) - token=$($token.Substring(0, [Math]::Min(40, $token.Length)))...`n"

$auth = @{ Authorization = "Bearer $token" }

# 4. Validate token
$r = Test-Endpoint "VALIDATE" "POST" "$BASE/api/auth/validate" "{`"token`":`"$token`"}"
$out += "4. VALIDATE: $($r.Status) - $($r.Body.Substring(0, [Math]::Min(150, $r.Body.Length)))`n"

# 5. Get restaurants
$r = Test-Endpoint "GET_RESTAURANTS" "GET" "$BASE/api/catalog/restaurants" $null $auth
$out += "5. GET_RESTAURANTS: $($r.Status) - $($r.Body.Substring(0, [Math]::Min(200, $r.Body.Length)))`n"

# 6. Get restaurant 1 menu
$r = Test-Endpoint "GET_MENU" "GET" "$BASE/api/catalog/restaurants/1/menu" $null $auth
$out += "6. GET_MENU_REST1: $($r.Status) - $($r.Body.Substring(0, [Math]::Min(200, $r.Body.Length)))`n"

# 7. Create order - VALID (gRPC validation)
$orderBody = '{"restaurant_id":1,"items":[{"menu_item_id":1,"quantity":2,"unit_price":45.00},{"menu_item_id":4,"quantity":1,"unit_price":20.00}],"delivery_address":"12 Calle 5-30 Zona 10"}'
$r = Test-Endpoint "CREATE_ORDER_VALID" "POST" "$BASE/api/orders" $orderBody $auth
$out += "7. CREATE_ORDER_VALID: $($r.Status) - $($r.Body.Substring(0, [Math]::Min(300, $r.Body.Length)))`n"

# 8. Create order - INVALID PRICE (gRPC should reject)
$badOrder = '{"restaurant_id":1,"items":[{"menu_item_id":1,"quantity":1,"unit_price":999.99}],"delivery_address":"Test"}'
$r = Test-Endpoint "CREATE_ORDER_BAD_PRICE" "POST" "$BASE/api/orders" $badOrder $auth
$out += "8. CREATE_ORDER_BAD_PRICE: $($r.Status) - $($r.Body.Substring(0, [Math]::Min(300, $r.Body.Length)))`n"

# 9. Create order - NON-EXISTENT ITEM (gRPC should reject)
$badOrder2 = '{"restaurant_id":1,"items":[{"menu_item_id":9999,"quantity":1,"unit_price":10.00}],"delivery_address":"Test"}'
$r = Test-Endpoint "CREATE_ORDER_BAD_ITEM" "POST" "$BASE/api/orders" $badOrder2 $auth
$out += "9. CREATE_ORDER_BAD_ITEM: $($r.Status) - $($r.Body.Substring(0, [Math]::Min(300, $r.Body.Length)))`n"

# 10. Get all orders
$r = Test-Endpoint "GET_ORDERS" "GET" "$BASE/api/orders" $null $auth
$out += "10. GET_ORDERS: $($r.Status) - $($r.Body.Substring(0, [Math]::Min(200, $r.Body.Length)))`n"

# 11. Get deliveries (need REPARTIDOR role)
$rLogin = Test-Endpoint "LOGIN_REPARTIDOR" "POST" "$BASE/api/auth/login" '{"email":"delivery@test.com","password":"admin123"}'
$repData = $rLogin.Body | ConvertFrom-Json
$repToken = $repData.data.token
$repAuth = @{ Authorization = "Bearer $repToken" }
$r = Test-Endpoint "GET_DELIVERIES" "GET" "$BASE/api/delivery" $null $repAuth
$out += "11. GET_DELIVERIES: $($r.Status) - $($r.Body.Substring(0, [Math]::Min(200, $r.Body.Length)))`n"

# 12. Create delivery (need RESTAURANTE role)
$rLogin2 = Test-Endpoint "LOGIN_REST" "POST" "$BASE/api/auth/login" '{"email":"restaurant@test.com","password":"admin123"}'
$restData = $rLogin2.Body | ConvertFrom-Json
$restToken = $restData.data.token
$restAuth = @{ Authorization = "Bearer $restToken" }
$delBody = '{"order_external_id":1,"courier_id":4}'
$r = Test-Endpoint "CREATE_DELIVERY" "POST" "$BASE/api/delivery" $delBody $restAuth
$out += "12. CREATE_DELIVERY: $($r.Status) - $($r.Body.Substring(0, [Math]::Min(200, $r.Body.Length)))`n"

$out | Out-File -FilePath "C:\Users\pabda\Desktop\lab SA\Practica3\test-results.txt" -Encoding UTF8
Write-Host $out
