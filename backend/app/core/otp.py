import pyotp

def generate_otp_secret() -> str:
    """Generate a base32 random string for user's TOTP secret (if used)."""
    return pyotp.random_base32()

def generate_totp_code(secret: str) -> str:
    """Generate current TOTP code based on secret."""
    totp = pyotp.TOTP(secret)
    return totp.now()

def verify_totp_code(secret: str, code: str) -> bool:
    """Verify a given code against the secret."""
    totp = pyotp.TOTP(secret)
    return totp.verify(code)

# For email-based OTP, we can just generate a random 6-digit number
import random
def generate_email_otp() -> str:
    """Generate a random 6-digit code for email OTP."""
    return str(random.randint(100000, 999999))
