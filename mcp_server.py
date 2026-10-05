#!/usr/bin/env python3
"""
SmartInventory MCP Server - Stdio Bridge to Native HTTP MCP Server.

This bridge allows any standard stdio MCP client (Claude Desktop, Cursor, Cline, Antigravity)
to interact with SmartInventory's secure HTTP MCP endpoint.

Environment Variables:
  SMARTINVENTORY_API_URL: Base URL of SmartInventory (default: https://inventario.sustrato.red)
  SMARTINVENTORY_API_KEY: User API Key (starts with sk_live_...)
"""

import sys
import os
import json
import urllib.request
import urllib.error

API_URL = os.environ.get("SMARTINVENTORY_API_URL", "https://inventario.sustrato.red").rstrip("/")
API_KEY = os.environ.get("SMARTINVENTORY_API_KEY", "")


def main():
    if not API_KEY:
        sys.stderr.write("Error: SMARTINVENTORY_API_KEY environment variable is required.\n")
        sys.stderr.flush()

    target_url = f"{API_URL}/mcp"

    while True:
        line = sys.stdin.readline()
        if not line:
            break

        line = line.strip()
        if not line:
            continue

        try:
            req_data = json.loads(line)
        except json.JSONDecodeError:
            continue

        headers = {
            "Content-Type": "application/json",
            "X-API-KEY": API_KEY,
            "User-Agent": "SmartInventory-MCP-Stdio-Bridge/1.0"
        }

        try:
            req_bytes = json.dumps(req_data).encode("utf-8")
            req = urllib.request.Request(target_url, data=req_bytes, headers=headers, method="POST")

            with urllib.request.urlopen(req, timeout=30) as resp:
                resp_bytes = resp.read()
                if resp_bytes:
                    sys.stdout.write(resp_bytes.decode("utf-8") + "\n")
                    sys.stdout.flush()

        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")
            err_resp = {
                "jsonrpc": "2.0",
                "id": req_data.get("id"),
                "error": {
                    "code": -32000,
                    "message": f"HTTP {e.code}: {err_body}"
                }
            }
            sys.stdout.write(json.dumps(err_resp) + "\n")
            sys.stdout.flush()

        except Exception as ex:
            err_resp = {
                "jsonrpc": "2.0",
                "id": req_data.get("id"),
                "error": {
                    "code": -32000,
                    "message": f"Connection error to {target_url}: {str(ex)}"
                }
            }
            sys.stdout.write(json.dumps(err_resp) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    main()
