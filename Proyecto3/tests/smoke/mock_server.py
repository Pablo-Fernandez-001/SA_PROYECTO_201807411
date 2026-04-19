#!/usr/bin/env python3
from http.server import BaseHTTPRequestHandler, HTTPServer
import json


class MockHandler(BaseHTTPRequestHandler):
    def _json(self, payload, code=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            return self._json({"status": "OK", "service": "mock-gateway"})
        if self.path == "/api/health":
            return self._json({"status": "OK", "service": "mock-gateway"})
        if self.path.startswith("/api/catalog/restaurants"):
            return self._json([
                {"id": 1, "name": "Mock Restaurant"}
            ])
        if self.path.startswith("/api/orders"):
            return self._json({"orders": []})

        return self._json({"message": "Not found"}, code=404)

    def log_message(self, format, *args):
        return


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", 8080), MockHandler)
    print("Mock server listening on :8080")
    server.serve_forever()
