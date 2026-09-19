import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings

def send_otp_email(to_email: str, otp_code: str):
    message = MIMEMultipart("alternative")
    message["Subject"] = "Your SentinelDMS Login OTP"
    message["From"] = f"{settings.EMAILS_FROM_NAME} <noreply@sentineldms.com>"
    message["To"] = to_email

    text = f"Your OTP for SentinelDMS is: {otp_code}\n\nIt is valid for 5 minutes."
    html = f"""
    <html>
      <body>
        <p>Your OTP for SentinelDMS is:</p>
        <h2>{otp_code}</h2>
        <p>It is valid for 5 minutes.</p>
      </body>
    </html>
    """
    
    part1 = MIMEText(text, "plain")
    part2 = MIMEText(html, "html")
    message.attach(part1)
    message.attach(part2)

    try:
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
        if settings.SMTP_TLS:
            server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.EMAILS_FROM_EMAIL, to_email, message.as_string())
        server.quit()
        print(f"OTP email sent to {to_email}")
    except Exception as e:
        print(f"Failed to send email: {e}")
