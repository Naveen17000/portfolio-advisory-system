import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register(client: AsyncClient):
    resp = await client.post("/api/v1/auth/register", json={
        "email": "new@example.com",
        "password": "Password123!",
        "full_name": "New User",
        "date_of_birth": "1995-06-15",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "new@example.com"
    assert data["full_name"] == "New User"
    assert "id" in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    payload = {
        "email": "dup@example.com",
        "password": "Password123!",
        "full_name": "User One",
        "date_of_birth": "1990-01-01",
    }
    await client.post("/api/v1/auth/register", json=payload)
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "email": "login@example.com",
        "password": "Password123!",
        "full_name": "Login User",
        "date_of_birth": "1990-01-01",
    })
    resp = await client.post("/api/v1/auth/login", data={
        "username": "login@example.com",
        "password": "Password123!",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "email": "wrong@example.com",
        "password": "Password123!",
        "full_name": "Wrong User",
        "date_of_birth": "1990-01-01",
    })
    resp = await client.post("/api/v1/auth/login", data={
        "username": "wrong@example.com",
        "password": "WrongPass!",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_me(auth_client: AsyncClient):
    resp = await auth_client.get("/api/v1/auth/me")
    assert resp.status_code == 200
    assert resp.json()["email"] == "test@example.com"


@pytest.mark.asyncio
async def test_get_me_unauthorized(client: AsyncClient):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_refresh_token(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "email": "refresh@example.com",
        "password": "Password123!",
        "full_name": "Refresh User",
        "date_of_birth": "1990-01-01",
    })
    login_resp = await client.post("/api/v1/auth/login", data={
        "username": "refresh@example.com",
        "password": "Password123!",
    })
    refresh_token = login_resp.json()["refresh_token"]
    resp = await client.post("/api/v1/auth/refresh", json={
        "refresh_token": refresh_token,
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()
