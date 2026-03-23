import uuid
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address
import redis.asyncio as redis

from ..database import get_db

limiter = Limiter(key_func=get_remote_address)
from ..schemas.auth import (
    SignupRequest, SignupResponse,
    SigninRequest, SigninResponse,
    VerifyEmailRequest, ResendOTPRequest,
    ForgotPasswordRequest, ResetPasswordRequest,
    UserResponse, MessageResponse
)
from ..services.auth_service import AuthService
from ..middleware.auth_middleware import (
    get_redis_client, require_auth, create_session, destroy_session
)
from ..config import get_settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup")
@limiter.limit("3/minute")
async def signup(
    request: Request,
    data: SignupRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new user account.
    
    An OTP will be sent to the user's email for verification.
    The user must verify their email before they can sign in.
    """
    try:
        service = AuthService(db)
        user, otp_code = await service.signup(data)
        
        settings = get_settings()
        dev_mode = getattr(settings, 'dev_mode', False)
        
        response_data = {
            "state": "success",
            "message": "Account created. Please check your email for verification code.",
            "data": UserResponse.model_validate(user).model_dump(mode="json"),
        }
        # In dev mode, include OTP in response so testers don't need email/logs
        if dev_mode:
            response_data["dev_otp"] = otp_code
        
        return response_data
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/verify-email", response_model=MessageResponse)
@limiter.limit("5/minute")
async def verify_email(
    request: Request,
    data: VerifyEmailRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis_client),
):
    """
    Verify user's email with OTP.
    
    After successful verification, the user is automatically signed in.
    """
    try:
        service = AuthService(db)
        user = await service.verify_email(data.email, data.otp)
        
        # Auto sign-in after verification
        settings = get_settings()
        session_id = str(uuid.uuid4())
        user_data = {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "user_name": user.user_name,
            "is_verified": user.is_verified,
        }
        
        await create_session(
            redis_client,
            session_id,
            user_data,
            settings.session_expire_minutes,
        )
        
        response.set_cookie(
            key="session_id",
            value=session_id,
            httponly=True,
            max_age=settings.session_expire_minutes * 60,
            samesite=settings.cookie_samesite,
            secure=settings.cookie_secure,
            path="/",
        )
        
        return MessageResponse(
            state="success",
            message="Email verified successfully",
            data=user_data,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/resend-otp", response_model=MessageResponse)
async def resend_otp(
    data: ResendOTPRequest,
    db: AsyncSession = Depends(get_db),
):
    """Resend verification OTP to user's email."""
    try:
        service = AuthService(db)
        otp_code = await service.resend_otp(data.email)
        
        settings = get_settings()
        dev_mode = getattr(settings, 'dev_mode', False)
        
        response = MessageResponse(
            state="success",
            message="Verification code sent to your email",
        )
        if dev_mode:
            response.data = {"dev_otp": otp_code}
        
        return response
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/signin", response_model=SigninResponse)
@limiter.limit("5/minute")
async def signin(
    request: Request,
    data: SigninRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis_client),
):
    """
    Sign in with username and password.
    
    User must be verified to sign in.
    """
    try:
        service = AuthService(db)
        user = await service.signin(data)
        
        # Look up org name for frontend display
        from sqlalchemy import select as sa_select
        from ..models.organization import Organization, OrganizationUser
        org_name = "My Organization"
        try:
            org_result = await db.execute(
                sa_select(Organization.name).join(
                    OrganizationUser, OrganizationUser.organization_id == Organization.id
                ).where(OrganizationUser.user_id == user.id).limit(1)
            )
            org_row = org_result.scalar_one_or_none()
            if org_row:
                org_name = org_row
        except Exception:
            pass

        # Create session
        settings = get_settings()
        session_id = str(uuid.uuid4())
        user_data = {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "user_name": user.user_name,
            "is_verified": user.is_verified,
            "role": getattr(user, "role", "TALENT"),
            "org_name": org_name,
        }

        await create_session(
            redis_client,
            session_id,
            user_data,
            settings.session_expire_minutes,
        )

        response.set_cookie(
            key="session_id",
            value=session_id,
            httponly=True,
            max_age=settings.session_expire_minutes * 60,
            samesite=settings.cookie_samesite,
            secure=settings.cookie_secure,
            path="/",
        )

        return SigninResponse(
            state="success",
            message="Signed in successfully",
            data=UserResponse.model_validate(user),
        )
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/signout", response_model=MessageResponse)
async def signout(
    request: Request,
    response: Response,
    redis_client: redis.Redis = Depends(get_redis_client),
):
    """Sign out and destroy session."""
    session_id = request.cookies.get("session_id")
    
    if session_id:
        await destroy_session(redis_client, session_id)
    
    response.delete_cookie("session_id")
    
    return MessageResponse(
        state="success",
        message="Signed out successfully",
    )


@router.get("/me", response_model=MessageResponse)
async def get_me(
    user: dict = Depends(require_auth),
):
    """Get current authenticated user."""
    return MessageResponse(
        state="success",
        message="User retrieved",
        data=user,
    )


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Request password reset.
    
    An OTP will be sent to the user's email if the account exists.
    """
    service = AuthService(db)
    await service.forgot_password(data.email)
    
    # Always return success for security
    return MessageResponse(
        state="success",
        message="If an account exists with this email, a reset code has been sent",
    )


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Reset password with OTP."""
    try:
        service = AuthService(db)
        await service.reset_password(data.email, data.otp, data.new_password)
        
        return MessageResponse(
            state="success",
            message="Password reset successfully",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
