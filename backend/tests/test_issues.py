from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_create_and_get_issue() -> None:
    create_res = client.post(
        "/issues",
        json={"title": "Test bug", "description": "Something broke"},
    )
    assert create_res.status_code == 201
    created = create_res.json()
    issue_id = created["id"]

    try:
        assert created["title"] == "Test bug"
        assert created["status"] == "open"
        assert created["labels"] == []

        get_res = client.get(f"/issues/{issue_id}")
        assert get_res.status_code == 200
        assert get_res.json()["id"] == issue_id
    finally:
        del_res = client.delete(f"/issues/{issue_id}")
        assert del_res.status_code == 204


def test_filter_issues() -> None:
    create_res = client.post(
        "/issues",
        json={
            "title": "Urgent filter test",
            "description": "Checks priority and label filtering",
            "priority": "urgent",
            "labels": ["pytest-unique-label"],
        },
    )
    assert create_res.status_code == 201
    issue_id = create_res.json()["id"]

    try:
        list_res = client.get(
            "/issues",
            params={"priority": "urgent", "label": "pytest-unique-label"},
        )
        assert list_res.status_code == 200
        returned_ids = [item["id"] for item in list_res.json()]
        assert issue_id in returned_ids
    finally:
        client.delete(f"/issues/{issue_id}")


def test_patch_issue_partial_update() -> None:
    create_res = client.post(
        "/issues",
        json={
            "title": "Original title",
            "description": "Should not be wiped by partial PATCH",
        },
    )
    assert create_res.status_code == 201
    issue_id = create_res.json()["id"]

    try:
        patch_res = client.patch(
            f"/issues/{issue_id}",
            json={"status": "in_progress"},
        )
        assert patch_res.status_code == 200
        updated = patch_res.json()
        assert updated["status"] == "in_progress"
        assert updated["title"] == "Original title"
        assert updated["description"] == "Should not be wiped by partial PATCH"
    finally:
        client.delete(f"/issues/{issue_id}")


def test_get_missing_issue_returns_404() -> None:
    res = client.get("/issues/999999")
    assert res.status_code == 404
    assert res.json()["detail"] == "Issue not found"