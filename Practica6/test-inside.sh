#!/bin/sh
BASE="http://34.55.27.36:8080"

echo "========================================="
echo "  DeliverEats - Full Endpoint Tests"
echo "========================================="

echo ""
echo "--- 1. Health Check ---"
curl -s $BASE/health
echo ""

echo ""
echo "--- 2. Register New User ---"
curl -s -X POST $BASE/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"DockerTestUser","email":"dockertest@test.com","password":"pass123456","role":"CLIENTE"}'
echo ""

echo ""
echo "--- 3. Login CLIENTE ---"
LOGIN=$(curl -s -X POST $BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"cliente@test.com","password":"admin123"}')
echo "$LOGIN" | head -c 200
TOKEN=$(echo "$LOGIN" | sed 's/.*"token":"//' | sed 's/".*//')
echo ""
echo "TOKEN_LEN: ${#TOKEN}"

echo ""
echo "--- 4. Validate Token ---"
curl -s -X POST $BASE/api/auth/validate \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN\"}" | head -c 200
echo ""

echo ""
echo "--- 5. Get Restaurants ---"
curl -s $BASE/api/catalog/restaurants \
  -H "Authorization: Bearer $TOKEN" | head -c 400
echo ""

echo ""
echo "--- 6. Get Restaurant 1 Menu ---"
curl -s $BASE/api/catalog/restaurants/1/menu \
  -H "Authorization: Bearer $TOKEN" | head -c 400
echo ""

echo ""
echo "--- 7. Create Order - VALID (gRPC) ---"
curl -s -X POST $BASE/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"restaurant_id":1,"items":[{"menu_item_id":1,"quantity":2,"unit_price":45.00},{"menu_item_id":4,"quantity":1,"unit_price":20.00}],"delivery_address":"12 Calle 5-30 Zona 10"}'
echo ""

echo ""
echo "--- 8. Create Order - BAD PRICE (gRPC should reject) ---"
curl -s -X POST $BASE/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"restaurant_id":1,"items":[{"menu_item_id":1,"quantity":1,"unit_price":999.99}],"delivery_address":"Test"}'
echo ""

echo ""
echo "--- 9. Create Order - NON-EXISTENT ITEM (gRPC should reject) ---"
curl -s -X POST $BASE/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"restaurant_id":1,"items":[{"menu_item_id":9999,"quantity":1,"unit_price":10.00}],"delivery_address":"Test"}'
echo ""

echo ""
echo "--- 10. Get All Orders ---"
curl -s $BASE/api/orders \
  -H "Authorization: Bearer $TOKEN" | head -c 400
echo ""

echo ""
echo "--- 11. Login REPARTIDOR & Get Deliveries ---"
REP_LOGIN=$(curl -s -X POST $BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"delivery@test.com","password":"admin123"}')
REP_TOKEN=$(echo "$REP_LOGIN" | sed 's/.*"token":"//' | sed 's/".*//')
echo "REP_TOKEN_LEN: ${#REP_TOKEN}"
curl -s $BASE/api/delivery \
  -H "Authorization: Bearer $REP_TOKEN" | head -c 200
echo ""

echo ""
echo "--- 12. Login RESTAURANTE & Create Delivery ---"
REST_LOGIN=$(curl -s -X POST $BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"restaurant@test.com","password":"admin123"}')
REST_TOKEN=$(echo "$REST_LOGIN" | sed 's/.*"token":"//' | sed 's/".*//')
echo "REST_TOKEN_LEN: ${#REST_TOKEN}"
curl -s -X POST $BASE/api/delivery \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REST_TOKEN" \
  -d '{"order_external_id":1,"courier_id":4}'
echo ""

echo ""
echo "--- 13. Start Delivery (REPARTIDOR) ---"
curl -s -X POST $BASE/api/delivery/1/start \
  -H "Authorization: Bearer $REP_TOKEN"
echo ""

echo ""
echo "--- 14. Complete Delivery (REPARTIDOR) ---"
curl -s -X POST $BASE/api/delivery/1/complete \
  -H "Authorization: Bearer $REP_TOKEN"
echo ""

echo ""
echo "========================================="
echo "  ALL TESTS COMPLETE"
echo "========================================="
