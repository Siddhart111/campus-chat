from email_service import send_otp_email
import argparse

parser = argparse.ArgumentParser(description="Send a test OTP email using SMTP configuration.")
parser.add_argument("email", help="Recipient email address")
parser.add_argument("code", nargs="?", default="123456", help="OTP code to send")
args = parser.parse_args()

result = send_otp_email(args.email, args.code)
print(result)
