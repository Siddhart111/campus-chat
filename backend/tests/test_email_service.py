import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from email_service import send_otp_email


def test_send_otp_email_sets_correct_message():
    # This test only validates the function returns the correct status.
    result = send_otp_email("siddharth.29555@stu.upes.ac.in", "123456")
    assert result["ok"] is True
    assert result["to"] == "siddharth.29555@stu.upes.ac.in"
