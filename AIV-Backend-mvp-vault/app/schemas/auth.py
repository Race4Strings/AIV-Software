from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


# ============== Request Schemas ==============

class SignupRequest(BaseModel):
    """Schema for user registration. Requires a valid access code."""
    name: str = Field(..., min_length=2, max_length=255)
    username: str = Field(..., min_length=3, max_length=255, pattern=r"^[a-zA-Z0-9_]+$")
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=255)
    access_code: Optional[str] = Field(None, description="AIV access code (required in production)")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "John Doe",
                "username": "johndoe",
                "email": "john@example.com",
                "password": "securepassword123",
                "access_code": "AIV-ABC123"
            }
        }


class SigninRequest(BaseModel):
    """Schema for user login."""
    identifier: str = Field(..., min_length=3, description="Email or username")
    password: str = Field(..., min_length=1)
    
    class Config:
        json_schema_extra = {
            "example": {
                "identifier": "john@example.com or johndoe",
                "password": "securepassword123"
            }
        }


class VerifyEmailRequest(BaseModel):
    """Schema for email verification."""
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)


class ResendOTPRequest(BaseModel):
    """Schema for resending OTP."""
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    """Schema for password reset request."""
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Schema for password reset with OTP."""
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=8, max_length=255)


# ============== Response Schemas ==============

class UserResponse(BaseModel):
    """Schema for user data in responses."""
    id: UUID
    name: str
    email: str
    user_name: str
    is_verified: bool
    created_at: datetime
    role: Optional[str] = None
    org_id: Optional[str] = None
    org_name: Optional[str] = None

    class Config:
        from_attributes = True


class SignupResponse(BaseModel):
    """Response after successful signup."""
    state: str = "success"
    message: str
    data: UserResponse


class SigninResponse(BaseModel):
    """Response after successful login."""
    state: str = "success"
    message: str
    data: UserResponse


class MessageResponse(BaseModel):
    """Generic message response."""
    state: str
    message: str
    data: Optional[dict] = None
