import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch, AsyncMock
from app.main import app

@pytest.mark.asyncio
async def test_root():
    # Mock init_db to avoid real database connection during tests
    with patch("backend.app.main.init_db", new_callable=AsyncMock) as mock_init_db:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/")
        
        assert response.status_code == 200
        assert response.json()["status"] == "running"
