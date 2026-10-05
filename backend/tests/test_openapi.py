import pytest
from app.main import app


def test_openapi_schema_structure():
    """Verify that the OpenAPI schema follows modern OpenAPI 3.1.0 specifications."""
    schema = app.openapi()

    assert schema is not None
    assert "openapi" in schema
    assert schema["openapi"].startswith("3.")
    assert schema["info"]["title"] == "SmartInventory API"
    assert schema["info"]["version"] == "1.0.0"
    assert "summary" in schema["info"]
    assert "description" in schema["info"]

    # Security schemes
    components = schema.get("components", {})
    assert "securitySchemes" in components
    security_schemes = components["securitySchemes"]
    assert "ApiKeyAuth" in security_schemes
    assert security_schemes["ApiKeyAuth"]["type"] == "apiKey"
    assert security_schemes["ApiKeyAuth"]["in"] == "header"
    assert security_schemes["ApiKeyAuth"]["name"] == "X-API-KEY"

    assert "BearerAuth" in security_schemes
    assert security_schemes["BearerAuth"]["type"] == "http"
    assert security_schemes["BearerAuth"]["scheme"] == "bearer"

    # Tags
    tags = [t["name"] for t in schema.get("tags", [])]
    assert "developer-api" in tags
    assert "mcp" in tags
    assert "public-share" in tags
    assert "inventory" in tags
    assert "groups" in tags

    # Paths verification
    paths = schema.get("paths", {})
    assert "/mcp" in paths
    assert "post" in paths["/mcp"]
    assert "/api/v1/public/inventories" in paths
    assert "get" in paths["/api/v1/public/inventories"]
    assert "post" in paths["/api/v1/public/inventories"]
    assert "/api/v1/public/items/search" in paths
