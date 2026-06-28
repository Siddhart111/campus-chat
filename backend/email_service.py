"""Email service — Gmail SMTP integration for OTP delivery."""
from dotenv import load_dotenv
load_dotenv()
import os
import ssl
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
#TEST
logger = logging.getLogger(__name__)

SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com").strip()
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "").strip()
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "").replace(" ", "").strip()
SMTP_FROM_NAME = os.environ.get("SMTP_FROM_NAME", "Campus Chat").strip()
SMTP_FROM_EMAIL = os.environ.get("SMTP_FROM_EMAIL", SMTP_USER).strip()


def email_enabled() -> bool:
    return bool(SMTP_USER and SMTP_PASSWORD)


def _otp_html(to_email: str, code: str) -> str:
    return f"""<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#05050A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#fff;">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
    <div style="background:linear-gradient(180deg,#0E0A24,#0B0918);border:1px solid rgba(139,92,246,0.3);border-radius:24px;padding:36px 28px;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:11px;letter-spacing:6px;color:#A1A1AA;text-transform:uppercase;margin-bottom:6px;">Campus Chat</div>
        <div style="font-size:28px;font-weight:800;letter-spacing:4px;color:#8B5CF6;">UPES verified</div>
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


def _otp_text(to_email: str, code: str) -> str:
    return (
        f"Campus Chat — UPES verification\n\n"
        f"Your one-time code is: {code}\n\n"
        f"This code is valid for 5 minutes. Do not share it with anyone.\n"
        f"If you didn't request this, ignore this email.\n\n"
        f"— Campus Chat (Anonymous · Real · UPES only)"
    )


def send_otp_email(to_email: str, code: str) -> dict:
    """Send the OTP via Gmail SMTP. Raises if SMTP not configured or send fails."""
    if not email_enabled():
        raise RuntimeError("SMTP credentials are not configured on the server")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Your Campus Chat code: {code}"
    msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL or SMTP_USER}>"
    msg["To"] = to_email
    msg["Reply-To"] = SMTP_FROM_EMAIL or SMTP_USER

    msg.attach(MIMEText(_otp_text(to_email, code), "plain", "utf-8"))
    msg.attach(MIMEText(_otp_html(to_email, code), "html", "utf-8"))

    ctx = ssl.create_default_context()
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
        server.ehlo()
        server.starttls(context=ctx)
        server.ehlo()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_USER, [to_email], msg.as_string())

    logger.info("SMTP OTP email sent to %s", to_email)
    return {"ok": True, "to": to_email}
