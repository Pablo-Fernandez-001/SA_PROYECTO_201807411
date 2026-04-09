$ErrorActionPreference = "Stop"

Write-Host "[1/7] Health checks..."
Invoke-RestMethod -Method Get -Uri "http://localhost:3101/api/health" | Out-Null
Invoke-RestMethod -Method Get -Uri "http://localhost:3102/api/health" | Out-Null
Invoke-RestMethod -Method Get -Uri "http://localhost:3103/api/health" | Out-Null
Invoke-RestMethod -Method Get -Uri "http://localhost:3104/api/health" | Out-Null

Write-Host "[2/7] Getting users..."
$users = Invoke-RestMethod -Method Get -Uri "http://localhost:3101/api/users"
$requester = $users | Where-Object { $_.role -eq "requester" } | Select-Object -First 1
$agent = $users | Where-Object { $_.role -eq "agent" } | Select-Object -First 1
$admin = $users | Where-Object { $_.role -eq "admin" } | Select-Object -First 1

if (-not $requester -or -not $agent -or -not $admin) {
  throw "Required seed users not found (requester/agent/admin)."
}

Write-Host "[3/7] Creating ticket..."
$ticketBody = @{
  requester_id = [int]$requester.id
  title = "Fallo de acceso a sistema interno"
  description = "No es posible ingresar al portal interno desde la red corporativa"
  priority = "HIGH"
  category = "Access"
} | ConvertTo-Json

$ticket = Invoke-RestMethod -Method Post -Uri "http://localhost:3102/api/tickets" -ContentType "application/json" -Body $ticketBody

Write-Host "[4/7] Assigning ticket..."
$assignmentBody = @{
  ticket_id = [int]$ticket.id
  agent_id = [int]$agent.id
  assigned_by = [int]$admin.id
  reason = "Asignacion automatica por prioridad"
} | ConvertTo-Json

$assignment = Invoke-RestMethod -Method Post -Uri "http://localhost:3103/api/assignments" -ContentType "application/json" -Body $assignmentBody

Write-Host "[5/7] Verifying ticket status changed to ASSIGNED..."
$ticketUpdated = Invoke-RestMethod -Method Get -Uri "http://localhost:3102/api/tickets/$($ticket.id)"
if ($ticketUpdated.status -ne "ASSIGNED") {
  throw "Expected ticket status ASSIGNED but got $($ticketUpdated.status)"
}

Write-Host "[6/7] Verifying assignment exists..."
$assignmentCheck = Invoke-RestMethod -Method Get -Uri "http://localhost:3103/api/assignments/$($assignment.id)"
if ($assignmentCheck.ticket_id -ne $ticket.id) {
  throw "Assignment ticket_id mismatch."
}

Write-Host "[7/7] Verifying audit event ingestion..."
 $foundTicketCreated = $null
 $foundTicketAssigned = $null

for ($i = 0; $i -lt 10; $i++) {
  $events = Invoke-RestMethod -Method Get -Uri "http://localhost:3104/api/events?limit=300"
  $items = @($events.items)
  $foundTicketCreated = $items | Where-Object { $_.routing_key -eq "ticket.created" } | Select-Object -First 1
  $foundTicketAssigned = $items | Where-Object { $_.routing_key -eq "ticket.assigned" } | Select-Object -First 1

  if ($foundTicketCreated -and $foundTicketAssigned) {
    break
  }

  Start-Sleep -Seconds 1
}

if (-not $foundTicketCreated -or -not $foundTicketAssigned) {
  throw "Expected ticket.created and ticket.assigned events in audit buffer."
}

Write-Host "SMOKE TEST PASSED" -ForegroundColor Green
