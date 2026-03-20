$ErrorActionPreference = "Stop"
$BASE = "http://34.55.27.36:8080"
$out = ""

function Req {
    param([string]$Label, [string]$Method, [string]$Url, [string]$Body, [string]$Token)
    $params = @{ Uri = $Url; Method = $Method; UseBasicParsing = $true; TimeoutSec = 15 }
    if ($Body) { $params.Body = $Body; $params.ContentType = "application/json" }
    if ($Token) { $params.Headers = @{ Authorization = "Bearer $Token" } }
    try {
        $r = Invoke-WebRequest @params
        return "$Label : $($r.StatusCode) | $($r.Content.Substring(0, [Math]::Min(400, $r.Content.Length)))"
    } catch {
        $s = 0; $b = ""
        try { $s = [int]$_.Exception.Response.StatusCode } catch {}
        try { $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream()); $b = $sr.ReadToEnd() } catch { $b = $_.Exception.Message }
        return "$Label : $s | $($b.Substring(0, [Math]::Min(400, $b.Length)))"
    }
}

# 1
$out += Req "1.HEALTH" "GET" "$BASE/health" | Out-String

# 2
$out += Req "2.REGISTER" "POST" "$BASE/api/auth/register" '{"name":"ScriptUser","email":"script123@test.com","password":"pass123456","role":"CLIENTE"}' | Out-String

# 3
try {
    $lr = Invoke-WebRequest -Uri "$BASE/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"cliente@test.com","password":"admin123"}' -UseBasicParsing -TimeoutSec 15
    $ld = $lr.Content | ConvertFrom-Json
    $T = $ld.data.token
    $out += "3.LOGIN : 200 | user=$($ld.data.user.name) role=$($ld.data.user.role) token_len=$($T.Length)`n"
} catch {
    $out += "3.LOGIN : FAILED $($_.Exception.Message)`n"; $T = ""
}

if ($T) {
    # 4
    $out += Req "4.VALIDATE" "POST" "$BASE/api/auth/validate" "{`"token`":`"$T`"}" | Out-String

    # 5
    $out += Req "5.RESTAURANTS" "GET" "$BASE/api/catalog/restaurants" $null $T | Out-String

    # 6
    $out += Req "6.MENU_R1" "GET" "$BASE/api/catalog/restaurants/1/menu" $null $T | Out-String

    # 7 VALID ORDER
    $out += Req "7.ORDER_VALID" "POST" "$BASE/api/orders" '{"restaurant_id":1,"items":[{"menu_item_id":1,"quantity":2,"unit_price":45.00},{"menu_item_id":4,"quantity":1,"unit_price":20.00}],"delivery_address":"12 Calle Zona 10"}' $T | Out-String

    # 8 BAD PRICE
    $out += Req "8.ORDER_BAD_PRICE" "POST" "$BASE/api/orders" '{"restaurant_id":1,"items":[{"menu_item_id":1,"quantity":1,"unit_price":999.99}],"delivery_address":"Test"}' $T | Out-String

    # 9 BAD ITEM
    $out += Req "9.ORDER_BAD_ITEM" "POST" "$BASE/api/orders" '{"restaurant_id":1,"items":[{"menu_item_id":9999,"quantity":1,"unit_price":10.00}],"delivery_address":"Test"}' $T | Out-String

    # 10 GET ORDERS
    $out += Req "10.GET_ORDERS" "GET" "$BASE/api/orders" $null $T | Out-String
}

# 11 REPARTIDOR
try {
    $rr = Invoke-WebRequest -Uri "$BASE/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"delivery@test.com","password":"admin123"}' -UseBasicParsing -TimeoutSec 15
    $rd = $rr.Content | ConvertFrom-Json; $RT = $rd.data.token
    $out += "11a.LOGIN_REP : OK`n"
    $out += Req "11b.DELIVERIES" "GET" "$BASE/api/delivery" $null $RT | Out-String
} catch { $out += "11.REPARTIDOR : FAILED`n" }

# 12 RESTAURANTE create delivery
try {
    $sr = Invoke-WebRequest -Uri "$BASE/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"restaurant@test.com","password":"admin123"}' -UseBasicParsing -TimeoutSec 15
    $sd = $sr.Content | ConvertFrom-Json; $ST = $sd.data.token
    $out += "12a.LOGIN_REST : OK`n"
    $out += Req "12b.CREATE_DELIV" "POST" "$BASE/api/delivery" '{"order_external_id":1,"courier_id":4}' $ST | Out-String
} catch { $out += "12.RESTAURANTE : FAILED`n" }

Set-Content -Path "C:\Users\pabda\Desktop\test-results.txt" -Value $out -Encoding UTF8
