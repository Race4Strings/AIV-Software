from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import User, Organization, OrganizationUser, OTP
from ..models.otp import OTPType
from ..schemas.auth import SignupRequest, SigninRequest
from ..utils import hash_password, verify_password, generate_otp
from .email_service import email_service


class AuthService:
    """Service for authentication operations."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def signup(self, data: SignupRequest) -> tuple:
        """
        Create a new user (unverified) and send verification OTP.
        
        Returns tuple of (user, otp_code).
        Raises ValueError if email or username already exists.
        """
        # Check if email exists
        result = await self.db.execute(
            select(User).where(User.email == data.email)
        )
        if result.scalar_one_or_none():
            raise ValueError("Email already registered")
        
        # Check if username exists
        result = await self.db.execute(
            select(User).where(User.user_name == data.username)
        )
        if result.scalar_one_or_none():
            raise ValueError("Username already taken")
        
        # Create user (unverified)
        user = User(
            name=data.name,
            email=data.email,
            user_name=data.username,
            password=hash_password(data.password),
            is_verified=False,
        )
        self.db.add(user)
        await self.db.flush()  # Get the user ID
        
        # Create default organization
        org = Organization(name=f"{data.username}'s Workspace")
        self.db.add(org)
        await self.db.flush()
        
        # Link user to organization as owner
        org_user = OrganizationUser(
            user_id=user.id,
            organization_id=org.id,
            role="owner",
        )
        self.db.add(org_user)
        
        # Generate and store OTP
        otp_code = generate_otp()
        otp = OTP(
            user_id=user.id,
            otp=otp_code,
            otp_type=OTPType.EMAIL_VERIFICATION,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
        )
        self.db.add(otp)
        
        await self.db.commit()
        await self.db.refresh(user)
        
        # Send verification email (async, don't block)
        await email_service.send_verification_otp(
            to=user.email,
            username=user.user_name,
            otp=otp_code,
        )
        
        return user, otp_code
    
    async def verify_email(self, email: str, otp_code: str) -> User:
        """
        Verify user's email with OTP.
        
        Returns the verified user.
        Raises ValueError if OTP is invalid or expired.
        """
        # Get user by email
        result = await self.db.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise ValueError("User not found")
        
        if user.is_verified:
            raise ValueError("Email already verified")
        
        # Find valid OTP
        result = await self.db.execute(
            select(OTP).where(
                OTP.user_id == user.id,
                OTP.otp == otp_code,
                OTP.otp_type == OTPType.EMAIL_VERIFICATION,
                OTP.expires_at > datetime.now(timezone.utc),
            )
        )
        otp = result.scalar_one_or_none()
        
        if not otp:
            raise ValueError("Invalid or expired OTP")
        
        # Mark user as verified
        user.is_verified = True
        
        # Delete used OTP
        await self.db.delete(otp)
        
        await self.db.commit()
        await self.db.refresh(user)
        
        return user
    
    async def resend_otp(self, email: str) -> str:
        """
        Resend verification OTP to user's email.
        
        Returns the OTP code.
        Raises ValueError if user not found or already verified.
        """
        result = await self.db.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise ValueError("User not found")
        
        if user.is_verified:
            raise ValueError("Email already verified")
        
        # Delete existing OTPs
        result = await self.db.execute(
            select(OTP).where(
                OTP.user_id == user.id,
                OTP.otp_type == OTPType.EMAIL_VERIFICATION,
            )
        )
        for otp in result.scalars():
            await self.db.delete(otp)
        
        # Generate new OTP
        otp_code = generate_otp()
        otp = OTP(
            user_id=user.id,
            otp=otp_code,
            otp_type=OTPType.EMAIL_VERIFICATION,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
        )
        self.db.add(otp)
        await self.db.commit()
        
        # Send email
        await email_service.send_verification_otp(
            to=user.email,
            username=user.user_name,
            otp=otp_code,
        )
        return otp_code
    
    async def signin(self, data: SigninRequest) -> User:
        """
        Authenticate user and return user data.
        
        Raises ValueError if credentials are invalid or user is not verified.
        """
        # Check if identifier is email or username
        identifier = data.identifier
        is_email = "@" in identifier
        
        if is_email:
            result = await self.db.execute(
                select(User).where(User.email == identifier)
            )
        else:
            result = await self.db.execute(
                select(User).where(User.user_name == identifier)
            )
        
        user = result.scalar_one_or_none()
        
        if not user:
            raise ValueError("Invalid email/username or password")
        
        # Verify password
        if not verify_password(data.password, user.password):
            raise ValueError("Invalid email/username or password")
        
        # Check if verified
        if not user.is_verified:
            raise ValueError("Please verify your email before signing in")
        
        return user
    
    async def forgot_password(self, email: str) -> bool:
        """
        Send password reset OTP.
        
        Returns True if sent (always returns True for security).
        """
        result = await self.db.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            # Don't reveal if user exists
            return True
        
        # Delete existing password reset OTPs
        result = await self.db.execute(
            select(OTP).where(
                OTP.user_id == user.id,
                OTP.otp_type == OTPType.PASSWORD_RESET,
            )
        )
        for otp in result.scalars():
            await self.db.delete(otp)
        
        # Generate new OTP
        otp_code = generate_otp()
        otp = OTP(
            user_id=user.id,
            otp=otp_code,
            otp_type=OTPType.PASSWORD_RESET,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
        )
        self.db.add(otp)
        await self.db.commit()
        
        # Send email
        await email_service.send_password_reset_otp(
            to=user.email,
            username=user.user_name,
            otp=otp_code,
        )
        
        return True
    
    async def reset_password(self, email: str, otp_code: str, new_password: str) -> User:
        """
        Reset user's password with OTP.
        
        Raises ValueError if OTP is invalid or expired.
        """
        result = await self.db.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise ValueError("Invalid email or OTP")
        
        # Find valid OTP
        result = await self.db.execute(
            select(OTP).where(
                OTP.user_id == user.id,
                OTP.otp == otp_code,
                OTP.otp_type == OTPType.PASSWORD_RESET,
                OTP.expires_at > datetime.now(timezone.utc),
            )
        )
        otp = result.scalar_one_or_none()
        
        if not otp:
            raise ValueError("Invalid or expired OTP")
        
        # Update password
        user.password = hash_password(new_password)
        
        # Delete used OTP
        await self.db.delete(otp)
        
        await self.db.commit()
        await self.db.refresh(user)
        
        return user
    
    async def get_user_by_id(self, user_id: UUID) -> Optional[User]:
        """Get user by ID."""
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()
