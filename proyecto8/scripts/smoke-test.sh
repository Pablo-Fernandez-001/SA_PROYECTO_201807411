#!/usr/bin/env bash
set -euo pipefail

echo "[1/7] Health checks..."
curl -fsS http://localhost:3101/api/health >/dev/null
curl -fsS http://localhost:3102/api/health >/dev/null
curl -fsS http://localhost:3103/api/health >/dev/null
curl -fsS http://localhost:3104/api/health >/dev/null

echo "[2/7] Getting users..."
USERS_JSON=$(curl -fsS http://localhost:3101/api/users)
REQUESTER_ID=$(echo "$USERS_JSON" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(next(x["id"] for x in d if x["role"]=="requester"))')
AGENT_ID=$(echo "$USERS_JSON" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(next(x["id"] for x in d if x["role"]=="agent"))')
ADMIN_ID=$(echo "$USERS_JSON" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(next(x["id"] for x in d if x["role"]=="admin"))')

echo "[3/7] Creating ticket..."
TICKET_JSON=$(curl -fsS -X POST http://localhost:3102/api/tickets \
  -H 'Content-Type: application/json' \
  -d "{\"requester_id\":$REQUESTER_ID,\"title\":\"Fallo de acceso a sistema interno\",\"description\":\"No es posible ingresar al portal interno desde la red corporativa\",\"priority\":\"HIGH\",\"category\":\"Access\"}")
TICKET_ID=$(echo "$TICKET_JSON" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')

echo "[4/7] Assigning ticket..."
ASSIGN_JSON=$(curl -fsS -X POST http://localhost:3103/api/assignments \
  -H 'Content-Type: application/json' \
  -d "{\"ticket_id\":$TICKET_ID,\"agent_id\":$AGENT_ID,\"assigned_by\":$ADMIN_ID,\"reason\":\"Asignacion automatica por prioridad\"}")
ASSIGN_ID=$(echo "$ASSIGN_JSON" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')

echo "[5/7] Verifying ticket status..."
TICKET_UPDATED=$(curl -fsS http://localhost:3102/api/tickets/$TICKET_ID)
STATUS=$(echo "$TICKET_UPDATED" | python3 -c 'import sys,json;print(json.load(sys.stdin)["status"])')
[ "$STATUS" = "ASSIGNED" ]

echo "[6/7] Verifying assignment..."
ASSIGN_CHECK=$(curl -fsS http://localhost:3103/api/assignments/$ASSIGN_ID)
ASSIGN_TICKET_ID=$(echo "$ASSIGN_CHECK" | python3 -c 'import sys,json;print(json.load(sys.stdin)["ticket_id"])')
[ "$ASSIGN_TICKET_ID" = "$TICKET_ID" ]

echo "[7/7] Verifying audit events..."
EVENTS=$(curl -fsS 'http://localhost:3104/api/events?limit=200')
python3 - << 'PY'
import json,sys
obj=json.loads(sys.stdin.read())
r=[x.get("routing_key") for x in obj.get("items",[])]
assert "ticket.created" in r, "ticket.created not found"
assert "ticket.assigned" in r, "ticket.assigned not found"
print("SMOKE TEST PASSED")
PY
<<< "$EVENTS"
