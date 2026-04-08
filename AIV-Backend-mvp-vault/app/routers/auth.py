import logging
import uuid
import string
import random
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Response, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, func
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
from ..middleware.permissions import require_role
from ..config import get_settings
from ..models.access_code import AccessCode
from ..models.waitlist import WaitlistEntry

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


# ------------------------------------------------------------------
# Access Code + Waitlist Schemas
# ------------------------------------------------------------------

class ValidateCodeRequest(BaseModel):
    code: str

class GenerateCodesRequest(BaseModel):
    count: int = 5
    label: str = "Admin Generated"
    prefix: str = "AIV"

class JoinWaitlistRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    role: Optional[str] = None  # creator, manager, brand, investor
    phone: Optional[str] = None
    referral_source: Optional[str] = None
    metadata: Optional[dict] = None

class GrantAccessRequest(BaseModel):
    waitlist_id: str

class GrantAccessBulkRequest(BaseModel):
    waitlist_ids: List[str]


def _generate_code(prefix: str = "AIV") -> str:
    """Generate a unique access code like AIV-A3F9K2."""
    chars = string.ascii_uppercase + string.digits
    suffix = "".join(random.choices(chars, k=6))
    return f"{prefix}-{suffix}"


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
    settings = get_settings()
    dev_mode = getattr(settings, 'dev_mode', False)

    # Validate access code (required in production, optional in dev mode)
    access_code_record = None
    if data.access_code:
        result = await db.execute(
            select(AccessCode).where(AccessCode.code == data.access_code.strip().upper())
        )
        access_code_record = result.scalar_one_or_none()
        if not access_code_record:
            raise HTTPException(status_code=400, detail="Invalid access code.")
        if access_code_record.is_used:
            raise HTTPException(status_code=400, detail="This access code has already been used.")
        if access_code_record.expires_at and access_code_record.expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="This access code has expired.")
    elif not dev_mode:
        raise HTTPException(status_code=400, detail="An access code is required to create an account.")

    try:
        service = AuthService(db)
        user, otp_code = await service.signup(data)

        # Mark access code as used
        if access_code_record:
            access_code_record.is_used = True
            access_code_record.used_by = user.id
            access_code_record.used_at = datetime.now(timezone.utc)
            await db.flush()

        response_data = {
            "state": "success",
            "message": "Account created. Please check your email for verification code.",
            "data": UserResponse.model_validate(user).model_dump(mode="json"),
        }
        if dev_mode:
            response_data["dev_otp"] = otp_code

        return response_data
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Catch database IntegrityError (duplicate email/username race condition)
        error_str = str(e).lower()
        if "unique" in error_str or "duplicate" in error_str or "integrity" in error_str:
            raise HTTPException(status_code=400, detail="An account with this email or username already exists.")
        raise


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
@limiter.limit("3/minute")
async def resend_otp(
    request: Request,
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
@limiter.limit("3/minute")
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
        org_id = None
        try:
            org_result = await db.execute(
                sa_select(Organization.id, Organization.name).join(
                    OrganizationUser, OrganizationUser.organization_id == Organization.id
                ).where(OrganizationUser.user_id == user.id).limit(1)
            )
            org_row = org_result.first()
            if org_row:
                org_id = str(org_row[0])
                org_name = org_row[1]
        except Exception as e:
            logger.warning(f"Non-critical auth operation failed: {e}")

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
            "org_id": org_id,
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

        user_response = UserResponse.model_validate(user)
        user_response.role = getattr(user, "role", "TALENT")
        user_response.org_id = org_id
        user_response.org_name = org_name

        return SigninResponse(
            state="success",
            message="Signed in successfully",
            data=user_response,
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
@limiter.limit("3/minute")
async def forgot_password(
    request: Request,
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Request password reset.
    
    An OTP will be sent to the user's email if the account exists.
    """
    # Per-email rate limiting (max 3 per hour)
    import redis.asyncio as redis_client
    settings = get_settings()
    r = redis_client.from_url(settings.redis_url, decode_responses=True)
    try:
        key = f"password_reset:{data.email.lower().strip()}"
        count = await r.incr(key)
        if count == 1:
            await r.expire(key, 3600)  # 1 hour window
        if count > 3:
            await r.close()
            # Still return same message to prevent enumeration
            return MessageResponse(
                state="success",
                message="If an account exists with this email, a reset code has been sent",
            )
    except Exception:
        pass  # Redis failure shouldn't block password reset
    finally:
        await r.close()

    service = AuthService(db)
    await service.forgot_password(data.email)

    # Always return success for security (timing attack mitigation)
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


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    data: ChangePasswordRequest,
    user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Change password for authenticated user. Requires current password."""
    from ..models.user import User
    import bcrypt

    result = await db.execute(select(User).where(User.id == uuid.UUID(user["id"])))
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Verify old password
    if not bcrypt.checkpw(data.old_password.encode(), db_user.password_hash.encode()):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    # Validate new password
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")

    if data.old_password == data.new_password:
        raise HTTPException(status_code=400, detail="New password must be different from current password")

    # Hash and update
    new_hash = bcrypt.hashpw(data.new_password.encode(), bcrypt.gensalt()).decode()
    db_user.password_hash = new_hash
    await db.flush()

    return MessageResponse(state="success", message="Password changed successfully")


# ------------------------------------------------------------------
# Access Code Endpoints
# ------------------------------------------------------------------

@router.post("/validate-code")
async def validate_code(
    data: ValidateCodeRequest,
    db: AsyncSession = Depends(get_db),
):
    """Check if an access code is valid and available. Public endpoint."""
    result = await db.execute(
        select(AccessCode).where(AccessCode.code == data.code.strip().upper())
    )
    code = result.scalar_one_or_none()
    if not code:
        return {"valid": False, "message": "Invalid access code."}
    if code.is_used:
        return {"valid": False, "message": "This code has already been used."}
    if code.expires_at and code.expires_at < datetime.now(timezone.utc):
        return {"valid": False, "message": "This code has expired."}
    return {"valid": True, "message": "Code is valid."}


@router.post("/generate-codes")
async def generate_codes(
    data: GenerateCodesRequest,
    user: dict = Depends(require_role("OWNER")),
    db: AsyncSession = Depends(get_db),
):
    """Generate new access codes. Admin only."""
    codes = []
    for _ in range(min(data.count, 50)):  # Cap at 50 per request
        code_str = _generate_code(data.prefix)
        # Ensure uniqueness
        while True:
            existing = await db.execute(select(AccessCode).where(AccessCode.code == code_str))
            if not existing.scalar_one_or_none():
                break
            code_str = _generate_code(data.prefix)

        code = AccessCode(code=code_str, label=data.label)
        db.add(code)
        codes.append(code_str)

    await db.flush()
    return {"codes": codes, "count": len(codes)}


@router.get("/access-codes")
async def list_access_codes(
    status: Optional[str] = None,  # available, used
    user: dict = Depends(require_role("OWNER")),
    db: AsyncSession = Depends(get_db),
):
    """List all access codes. Admin only."""
    query = select(AccessCode).order_by(AccessCode.created_at.desc())
    if status == "available":
        query = query.where(AccessCode.is_used == False)
    elif status == "used":
        query = query.where(AccessCode.is_used == True)

    result = await db.execute(query)
    codes = result.scalars().all()
    return [
        {
            "id": str(c.id),
            "code": c.code,
            "label": c.label,
            "is_used": c.is_used,
            "used_by": str(c.used_by) if c.used_by else None,
            "used_at": c.used_at.isoformat() if c.used_at else None,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "expires_at": c.expires_at.isoformat() if c.expires_at else None,
        }
        for c in codes
    ]


# ------------------------------------------------------------------
# Waitlist Endpoints
# ------------------------------------------------------------------

@router.post("/waitlist")
async def join_waitlist(
    data: JoinWaitlistRequest,
    db: AsyncSession = Depends(get_db),
):
    """Join the waitlist. Public endpoint — no auth required."""
    # Check for duplicate
    existing = await db.execute(
        select(WaitlistEntry).where(WaitlistEntry.email == data.email.lower())
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="This email is already on the waitlist.")

    entry = WaitlistEntry(
        email=data.email.lower(),
        name=data.name,
        role=data.role,
        phone=data.phone,
        referral_source=data.referral_source,
        extra_data=data.metadata,
    )
    db.add(entry)
    await db.flush()

    return {
        "id": str(entry.id),
        "email": entry.email,
        "status": entry.status,
        "message": "You're on the list. We'll review your request and reach out soon.",
    }


@router.get("/waitlist")
async def list_waitlist(
    status: Optional[str] = None,  # pending, granted, removed
    user: dict = Depends(require_role("OWNER")),
    db: AsyncSession = Depends(get_db),
):
    """List waitlist entries. Admin only."""
    query = select(WaitlistEntry).order_by(WaitlistEntry.created_at.desc())
    if status:
        query = query.where(WaitlistEntry.status == status)

    result = await db.execute(query)
    entries = result.scalars().all()
    return [
        {
            "id": str(e.id),
            "email": e.email,
            "name": e.name,
            "role": e.role,
            "phone": e.phone,
            "referral_source": e.referral_source,
            "metadata": e.extra_data,
            "status": e.status,
            "granted_code": e.granted_code,
            "created_at": e.created_at.isoformat() if e.created_at else None,
            "granted_at": e.granted_at.isoformat() if e.granted_at else None,
        }
        for e in entries
    ]


@router.post("/grant-access")
async def grant_access(
    data: GrantAccessRequest,
    user: dict = Depends(require_role("OWNER")),
    db: AsyncSession = Depends(get_db),
):
    """Grant access to a waitlisted user. Generates code, updates status."""
    result = await db.execute(
        select(WaitlistEntry).where(WaitlistEntry.id == uuid.UUID(data.waitlist_id))
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Waitlist entry not found.")
    if entry.status == "granted":
        return {"message": "Already granted.", "code": entry.granted_code}

    # Generate and save code
    code_str = _generate_code("AIV")
    code = AccessCode(code=code_str, label=f"Waitlist - {entry.name or entry.email}")
    db.add(code)

    entry.status = "granted"
    entry.granted_code = code_str
    entry.granted_at = datetime.now(timezone.utc)
    await db.flush()

    return {"id": str(entry.id), "code": code_str, "email": entry.email}


@router.post("/grant-access-bulk")
async def grant_access_bulk(
    data: GrantAccessBulkRequest,
    user: dict = Depends(require_role("OWNER")),
    db: AsyncSession = Depends(get_db),
):
    """Grant access to multiple waitlisted users at once."""
    results = []
    for wid in data.waitlist_ids:
        try:
            r = await db.execute(
                select(WaitlistEntry).where(WaitlistEntry.id == uuid.UUID(wid))
            )
            entry = r.scalar_one_or_none()
            if not entry or entry.status == "granted":
                continue

            code_str = _generate_code("AIV")
            code = AccessCode(code=code_str, label=f"Waitlist - {entry.name or entry.email}")
            db.add(code)

            entry.status = "granted"
            entry.granted_code = code_str
            entry.granted_at = datetime.now(timezone.utc)
            results.append({"id": str(entry.id), "code": code_str, "email": entry.email})
        except Exception as e:
            logger.warning(f"Waitlist grant failed for entry: {e}")
            continue

    await db.flush()
    return {"granted": len(results), "results": results}


@router.delete("/waitlist/{waitlist_id}")
async def remove_from_waitlist(
    waitlist_id: str,
    user: dict = Depends(require_role("OWNER")),
    db: AsyncSession = Depends(get_db),
):
    """Remove an entry from the waitlist."""
    result = await db.execute(
        select(WaitlistEntry).where(WaitlistEntry.id == uuid.UUID(waitlist_id))
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Waitlist entry not found.")

    entry.status = "removed"
    await db.flush()
    return {"message": "Removed from waitlist."}
