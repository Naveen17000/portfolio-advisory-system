from uuid import uuid4

from app.services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)


def test_hash_and_verify():
    hashed = hash_password("mypassword")
    assert verify_password("mypassword", hashed)
    assert not verify_password("wrongpassword", hashed)


def test_access_token_roundtrip():
    uid = uuid4()
    token = create_access_token(uid)
    decoded = decode_token(token, expected_type="access")
    assert decoded == uid


def test_refresh_token_roundtrip():
    uid = uuid4()
    token = create_refresh_token(uid)
    decoded = decode_token(token, expected_type="refresh")
    assert decoded == uid


def test_access_token_rejected_as_refresh():
    uid = uuid4()
    token = create_access_token(uid)
    assert decode_token(token, expected_type="refresh") is None


def test_invalid_token():
    assert decode_token("garbage.token.here") is None
