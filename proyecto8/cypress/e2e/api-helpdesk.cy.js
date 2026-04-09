describe("Helpdesk API - End to End", () => {
  const usersBase = "http://localhost:3101/api";
  const ticketsBase = "http://localhost:3102/api";
  const assignmentsBase = "http://localhost:3103/api";
  const auditBase = "http://localhost:3104/api";

  function assertServiceUp(url, name) {
    cy.request({
      method: "GET",
      url: `${url}/health`,
      failOnStatusCode: false,
    }).then((response) => {
      expect(
        response.status,
        `${name} must be running before Cypress E2E execution`
      ).to.eq(200);
    });
  }

  before(() => {
    assertServiceUp(usersBase, "users-service");
    assertServiceUp(ticketsBase, "tickets-service");
    assertServiceUp(assignmentsBase, "assignments-service");
    assertServiceUp(auditBase, "audit-service");
  });

  it("creates and assigns a ticket, then validates audit events", () => {
    let requesterId;
    let agentId;
    let adminId;
    let ticketId;
    let assignmentId;

    cy.request("GET", `${usersBase}/users`).then((usersResponse) => {
      expect(usersResponse.status).to.eq(200);
      const users = usersResponse.body;
      requesterId = users.find((u) => u.role === "requester")?.id;
      agentId = users.find((u) => u.role === "agent")?.id;
      adminId = users.find((u) => u.role === "admin")?.id;

      expect(requesterId).to.be.a("number");
      expect(agentId).to.be.a("number");
      expect(adminId).to.be.a("number");
    });

    cy.then(() => {
      return cy.request("POST", `${ticketsBase}/tickets`, {
        requester_id: requesterId,
        title: `Cypress ticket ${Date.now()}`,
        description: "Usuario reporta lentitud extrema y timeout al ingresar al portal interno.",
        priority: "HIGH",
        category: "Performance",
      });
    }).then((ticketResponse) => {
      expect(ticketResponse.status).to.eq(201);
      ticketId = ticketResponse.body.id;
      expect(ticketResponse.body.status).to.eq("OPEN");
    });

    cy.then(() => {
      return cy.request("POST", `${assignmentsBase}/assignments`, {
        ticket_id: ticketId,
        agent_id: agentId,
        assigned_by: adminId,
        reason: "Cypress automated assignment",
      });
    }).then((assignmentResponse) => {
      expect(assignmentResponse.status).to.eq(201);
      assignmentId = assignmentResponse.body.id;
    });

    cy.then(() => {
      return cy.request("GET", `${ticketsBase}/tickets/${ticketId}`);
    }).then((updatedTicketResponse) => {
      expect(updatedTicketResponse.status).to.eq(200);
      expect(updatedTicketResponse.body.status).to.eq("ASSIGNED");
    });

    cy.then(() => {
      return cy.request("GET", `${assignmentsBase}/assignments/${assignmentId}`);
    }).then((assignmentDetailResponse) => {
      expect(assignmentDetailResponse.status).to.eq(200);
      expect(assignmentDetailResponse.body.ticket_id).to.eq(ticketId);
    });

    cy.wrap(null).then(() => {
      const maxTries = 8;

      const check = (attempt = 1) => {
        return cy.request("GET", `${auditBase}/events?limit=300`).then((eventsResponse) => {
          expect(eventsResponse.status).to.eq(200);
          const routingKeys = (eventsResponse.body.items || []).map((e) => e.routing_key);

          if (routingKeys.includes("ticket.created") && routingKeys.includes("ticket.assigned")) {
            return;
          }

          if (attempt >= maxTries) {
            throw new Error("Expected ticket.created and ticket.assigned events in audit buffer");
          }

          return cy.wait(1000).then(() => check(attempt + 1));
        });
      };

      return check();
    });
  });
});
