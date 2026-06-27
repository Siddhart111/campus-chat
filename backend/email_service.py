"""Email service — Resend integration for OTP delivery."""
import os
import logging
import resend

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "").strip()
RESEND_FROM = os.environ.get(
    "RESEND_FROM", "Campus Chat <onboarding@resend.dev>"
).strip()

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY


def email_enabled() -> bool:
    return bool(RESEND_API_KEY)


def _otp_html(to_email: str, code: str) -> str:
    return f"""<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#05050A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#fff;">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
    <div style="background:linear-gradient(180deg,#0E0A24,#0B0918);border:1px solid rgba(139,92,246,0.3);border-radius:24px;padding:36px 28px;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:11px;letter-spacing:6px;color:#A1A1AA;text-transform:uppercase;margin-bottom:6px;">Campus Chat</div>
        <div style="font-size:28px;font-weight:800;letter-spacing:4px;background:linear-gradient(90deg,#8B5CF6,#4F46E5);-webkit-background-clip:text;-webkit-text-fill-color:transparent;color:#8B5CF6;">UPES verified</div>
      </div>
      <p style="font-size:15px;line-height:22px;color:#D4D4D8;margin:0 0 20px 0;">Hey there 👋</p>
      <p style="font-size:15px;line-height:22px;color:#D4D4D8;margin:0 0 24px 0;">Use this one-time code to sign in to your anonymous Campus Chat account for <strong style="color:#fff;">{to_email}</strong>.</p>
      <div style="background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.4);border-radius:16px;padding:24px;text-align:center;margin:24px 0;">
        <div style="font-size:36px;font-weight:800;letter-spacing:12px;color:#fff;font-family:'SF Mono',Menlo,monospace;">{code}</div>
        <div style="font-size:11px;color:#A1A1AA;letter-spacing:1px;margin-top:8px;">VALID FOR 5 MINUTES</div>
      </div>
      <p style="font-size:13px;line-height:20px;color:#A1A1AA;margin:16px 0;">For your security, <strong style="color:#fff;">do not share this code</strong> with anyone. The Campus Chat team will never ask you for it.</p>
      <p style="font-size:13px;line-height:20px;color:#A1A1AA;margin:16px 0;">If you didn't request this, just ignore the email — no account will be created.</p>
      <div style="height:1px;background:rgba(255,255,255,0.08);margin:28px 0;"></div>
      <p style="font-size:11px;color:#52525B;text-align:center;margin:0;line-height:18px;">Campus Chat · For UPES Dehradun students<br/>Anonymous · Real · UPES only</p>
    </div>
  </div>
</body></html>"""


def send_otp_email(to_email: str, code: str) -> dict:
    """Send the OTP via Resend. Raises if RESEND_API_KEY is not configured."""
    if not RESEND_API_KEY:
        raise RuntimeError("RESEND_API_KEY is not set on the server")
    params = {
        "from": RESEND_FROM,
        "to": [to_email],
        "subject": f"Your Campus Chat code: {code}",
        "html": _otp_html(to_email, code),
    }
    res = resend.Emails.send(params)
    logger.info("Resend send → %s id=%s", to_email, res.get("id"))
    return res
