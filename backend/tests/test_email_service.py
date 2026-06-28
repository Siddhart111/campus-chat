import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from email_service import build_resend_payload


def test_build_resend_payload_uses_sender_and_recipient():
    payload = build_resend_payload(
        to_email="siddharth.29555@stu.upes.ac.in",
        code="123456",
        from_email="onboarding@resend.dev",
        from_name="Campus Chat",
    )

    assert payload["from"] == "Campus Chat <onboarding@resend.dev>"
    assert payload["to"] == ["siddharth.29555@stu.upes.ac.in"]
    assert "123456" in payload["text"]
