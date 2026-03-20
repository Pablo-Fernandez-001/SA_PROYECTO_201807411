#!/bin/bash
BASE="http://34.55.27.36:8080"

echo "========================================="
echo "  DeliverEats Endpoint Tests"
echo "========================================="

echo ""
echo "--- 1. Health Check ---"
curl -s -m 10 $BASE/health
echo ""

echo ""
echo "--- 2. Register New User ---"
curl -s -m 10 -X POST $BASE/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"TestUser","email":"testuser999@test.com","password":"password123","role":"CLIENTE"}'
echo ""

echo ""
echo "--- 3. Login as CLIENTE ---"
LOGIN_RESP=$(curl -s -m 10 -X POST $BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"cliente@test.com","password":"admin123"}')
echo "$LOGIN_RESP" | head -c 200
TOKEN=$(echo "$LOGIN_RESP" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
echo ""
echo "TOKEN LENGTH: ${#TOKEN}"

echo ""
echo "--- 4. Validate Token ---"
curl -s -m 10 -X POST $BASE/api/auth/validate \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN\"}" | head -c 200
echo ""

echo ""
echo "--- 5. Get Restaurants ---"
curl -s -m 10 $BASE/api/catalog/restaurants \
  -H "Authorization: Bearer $TOKEN" | head -c 300
echo ""

echo ""
echo "--- 6. Get Restaurant 1 Menu ---"
curl -s -m 10 $BASE/api/catalog/restaurants/1/menu \
  -H "Authorization: Bearer $TOKEN" | head -c 300
echo ""

echo ""
echo "--- 7. Create Order - VALID (gRPC validates) ---"
curl -s -m 15 -X POST $BASE/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"restaurant_id":1,"items":[{"menu_item_id":1,"quantity":2,"unit_price":45.00},{"menu_item_id":4,"quantity":1,"unit_price":20.00}],"delivery_address":"12 Calle 5-30 Zona 10"}'
echo ""

echo ""
echo "--- 8. Create Order - BAD PRICE (gRPC should reject) ---"
curl -s -m 15 -X POST $BASE/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"restaurant_id":1,"items":[{"menu_item_id":1,"quantity":1,"unit_price":999.99}],"delivery_address":"Test"}'
echo ""

echo ""
echo "--- 9. Create Order - NON-EXISTENT ITEM (gRPC should reject) ---"
curl -s -m 15 -X POST $BASE/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"restaurant_id":1,"items":[{"menu_item_id":9999,"quantity":1,"unit_price":10.00}],"delivery_address":"Test"}'
echo ""

echo ""
echo "--- 10. Get All Orders ---"
curl -s -m 10 $BASE/api/orders \
  -H "Authorization: Bearer $TOKEN" | head -c 300
echo ""

echo ""
echo "--- 11. Login as REPARTIDOR & Get Deliveries ---"
REP_RESP=$(curl -s -m 10 -X POST $BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"delivery@test.com","password":"admin123"}')
REP_TOKEN=$(echo "$REP_RESP" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "REP TOKEN LENGTH: ${#REP_TOKEN}"
curl -s -m 10 $BASE/api/delivery \
  -H "Authorization: Bearer $REP_TOKEN" | head -c 200
echo ""

echo ""
echo "--- 12. Login as RESTAURANTE & Create Delivery ---"
REST_RESP=$(curl -s -m 10 -X POST $BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"restaurant@test.com","password":"admin123"}')
REST_TOKEN=$(echo "$REST_RESP" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "REST TOKEN LENGTH: ${#REST_TOKEN}"
curl -s -m 15 -X POST $BASE/api/delivery \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REST_TOKEN" \
  -d '{"order_external_id":1,"courier_id":4}'
echo ""

echo ""
echo "========================================="
echo "  Tests Complete!"
echo "========================================="
