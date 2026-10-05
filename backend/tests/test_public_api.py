import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session
from app.models import SharedAccess


def test_auth_failure(client: TestClient):
    """Requests without a valid API key must return 401."""
    resp = client.get("/api/v1/public/inventories")
    assert resp.status_code == 401

    resp_invalid = client.get("/api/v1/public/inventories", headers={"X-API-KEY": "invalid_key"})
    assert resp_invalid.status_code == 401


def test_inventory_and_item_crud_lifecycle(client: TestClient, test_data: dict, session: Session):
    """Full lifecycle: create inventory -> create item -> bulk create -> update -> search -> delete."""
    headers_a = {"X-API-KEY": test_data["key_a"]}
    headers_b = {"X-API-KEY": test_data["key_b"]}

    # 1. User A creates an inventory
    create_inv_payload = {
        "name": "Robotics Lab",
        "description": "Hardware and sensors for robotics",
        "currency": "USD",
        "language": "EN",
        "settings": {"type": "GENERAL", "rack": "A-1"}
    }
    resp = client.post("/api/v1/public/inventories", json=create_inv_payload, headers=headers_a)
    assert resp.status_code == 201
    group_data = resp.json()
    group_id = group_data["id"]
    assert group_data["name"] == "Robotics Lab"
    assert group_data["my_role"] == "OWNER"

    # 2. List inventories
    resp_list = client.get("/api/v1/public/inventories", headers=headers_a)
    assert resp_list.status_code == 200
    envelope = resp_list.json()
    assert len(envelope["data"]) == 1
    assert envelope["data"][0]["id"] == group_id
    assert envelope["meta"]["total"] == 1

    # 3. User B cannot see User A's inventory
    resp_list_b = client.get("/api/v1/public/inventories", headers=headers_b)
    assert resp_list_b.status_code == 200
    assert len(resp_list_b.json()["data"]) == 0

    # 4. User A creates an item in the inventory
    create_item_payload = {
        "name": "Lidar Sensor 360",
        "description": "Laser rangefinder scanner",
        "category": "Sensors",
        "price": 149.99,
        "quantity": 2,
        "status": "completed",
        "meta_data": {"model": "RPLIDAR-A1", "range_meters": 12}
    }
    resp_item = client.post(f"/api/v1/public/inventories/{group_id}/items", json=create_item_payload, headers=headers_a)
    assert resp_item.status_code == 201
    item_data = resp_item.json()
    item_id = item_data["id"]
    assert item_data["name"] == "Lidar Sensor 360"
    assert item_data["price"] == 149.99
    assert item_data["meta_data"]["model"] == "RPLIDAR-A1"

    # 5. User B cannot create an item in User A's inventory (404/403)
    resp_item_b = client.post(f"/api/v1/public/inventories/{group_id}/items", json=create_item_payload, headers=headers_b)
    assert resp_item_b.status_code in [403, 404]

    # 6. Bulk create items
    bulk_payload = {
        "items": [
            {"name": "Servo Motor MG996R", "category": "Actuators", "price": 12.50, "quantity": 10},
            {"name": "Ultrasonic Sensor HC-SR04", "category": "Sensors", "price": 3.99, "quantity": 5}
        ]
    }
    resp_bulk = client.post(f"/api/v1/public/inventories/{group_id}/items/bulk", json=bulk_payload, headers=headers_a)
    assert resp_bulk.status_code == 201
    bulk_data = resp_bulk.json()
    assert bulk_data["created"] == 2
    assert len(bulk_data["items"]) == 2

    # 7. List items in inventory
    resp_items = client.get(f"/api/v1/public/inventories/{group_id}/items", headers=headers_a)
    assert resp_items.status_code == 200
    items_env = resp_items.json()
    assert items_env["meta"]["total"] == 3

    # 8. Filter items by category
    resp_cat = client.get(f"/api/v1/public/inventories/{group_id}/items?category=Sensors", headers=headers_a)
    assert resp_cat.status_code == 200
    assert resp_cat.json()["meta"]["total"] == 2

    # 9. Update item and verify metadata merging
    update_payload = {
        "price": 139.99,
        "meta_data": {"tested": True, "firmware": "v2.1"}
    }
    resp_update = client.put(f"/api/v1/public/items/{item_id}", json=update_payload, headers=headers_a)
    assert resp_update.status_code == 200
    updated_item = resp_update.json()
    assert updated_item["price"] == 139.99
    # Prior metadata must be preserved
    assert updated_item["meta_data"]["model"] == "RPLIDAR-A1"
    assert updated_item["meta_data"]["tested"] is True

    # 10. Search items across user inventories
    resp_search = client.get("/api/v1/public/items/search?q=Lidar", headers=headers_a)
    assert resp_search.status_code == 200
    search_data = resp_search.json()
    assert search_data["meta"]["total"] == 1
    assert search_data["data"][0]["name"] == "Lidar Sensor 360"

    # User B searching sees nothing
    resp_search_b = client.get("/api/v1/public/items/search?q=Lidar", headers=headers_b)
    assert resp_search_b.status_code == 200
    assert resp_search_b.json()["meta"]["total"] == 0

    # 11. Delete item
    resp_del_item = client.delete(f"/api/v1/public/items/{item_id}", headers=headers_a)
    assert resp_del_item.status_code == 200

    # Verify item is gone
    resp_get_gone = client.get(f"/api/v1/public/items/{item_id}", headers=headers_a)
    assert resp_get_gone.status_code == 404

    # 12. Delete inventory folder
    resp_del_inv = client.delete(f"/api/v1/public/inventories/{group_id}", headers=headers_a)
    assert resp_del_inv.status_code == 200

    # Verify folder is gone
    resp_get_inv_gone = client.get(f"/api/v1/public/inventories/{group_id}", headers=headers_a)
    assert resp_get_inv_gone.status_code == 404


def test_shared_access_permissions(client: TestClient, test_data: dict, session: Session):
    """Test that VIEWER role cannot write, while EDITOR role can write."""
    headers_a = {"X-API-KEY": test_data["key_a"]}
    headers_b = {"X-API-KEY": test_data["key_b"]}

    # User A creates a folder
    res = client.post("/api/v1/public/inventories", json={"name": "Shared Lab"}, headers=headers_a)
    group_id = res.json()["id"]

    # Grant User B VIEWER access
    share_viewer = SharedAccess(
        user_id=test_data["user_b"].id,
        group_id=group_id,
        role="VIEWER"
    )
    session.add(share_viewer)
    session.commit()

    # User B can view the folder
    res_b_view = client.get(f"/api/v1/public/inventories/{group_id}", headers=headers_b)
    assert res_b_view.status_code == 200
    assert res_b_view.json()["my_role"] == "VIEWER"

    # User B CANNOT write/create item as VIEWER
    res_b_write = client.post(
        f"/api/v1/public/inventories/{group_id}/items",
        json={"name": "Illegal Item"},
        headers=headers_b
    )
    assert res_b_write.status_code == 403

    # Upgrade User B to EDITOR
    share_viewer.role = "EDITOR"
    session.add(share_viewer)
    session.commit()

    # User B can now create item as EDITOR
    res_b_edit = client.post(
        f"/api/v1/public/inventories/{group_id}/items",
        json={"name": "Editor Created Item"},
        headers=headers_b
    )
    assert res_b_edit.status_code == 201

    # User B CANNOT delete the folder (only owner can delete folder)
    res_b_del = client.delete(f"/api/v1/public/inventories/{group_id}", headers=headers_b)
    assert res_b_del.status_code == 403
