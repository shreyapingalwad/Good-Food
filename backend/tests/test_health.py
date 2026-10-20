from unittest.mock import patch


def test_liveness_endpoint(client):
    """Verify /health/live returns HTTP 200 with status ok."""
    response = client.get("/health/live")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "MessSaver" in data["app"]


def test_readiness_endpoint_available(client):
    """Verify /health/ready returns HTTP 200 when database ping succeeds."""
    response = client.get("/health/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["database"] == "connected"


def test_readiness_endpoint_unavailable(client):
    """Verify /health/ready returns HTTP 503 when database ping fails."""
    with patch("app.api.health.ping_database", return_value=False):
        response = client.get("/health/ready")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "not_ready"
        assert data["database"] == "disconnected"
