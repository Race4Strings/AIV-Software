"""
File Upload Router

Handles file uploads using S3-compatible storage (MinIO/AWS/Railway).
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from typing import Literal

from ..services.storage_service import get_storage_service, StorageService
from ..middleware.auth_middleware import require_auth

router = APIRouter(tags=["Upload"])


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    folder: Literal["uploads", "voice", "images", "documents"] = Query("uploads"),
    user: dict = Depends(require_auth),
    storage: StorageService = Depends(get_storage_service)
):
    """
    Upload a file to S3-compatible storage.
    Files are organized by user: {folder}/{user_id}/{filename}
    """
    try:
        content = await file.read()
        import io
        file_obj = io.BytesIO(content)
        
        # Get user ID for per-user folder organization
        user_id = str(user.get('id', 'anonymous'))
        
        # Upload based on folder type
        if folder == "voice":
            result = storage.upload_voice(file_obj, file.filename, user_id=user_id)
        elif folder == "images":
            result = storage.upload_image(file_obj, file.filename, user_id=user_id)
        elif folder == "documents":
            result = storage.upload_document(file_obj, file.filename, user_id=user_id)
        else:
            result = storage.upload_file(file_obj, file.filename, user_id=user_id, folder=folder)
        
        return result
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/upload/voice")
async def upload_voice(
    file: UploadFile = File(...),
    user: dict = Depends(require_auth),
    storage: StorageService = Depends(get_storage_service)
):
    """Upload a voice recording. Files organized by user."""
    try:
        content = await file.read()
        import io
        file_obj = io.BytesIO(content)
        user_id = str(user.get('id', 'anonymous'))
        return storage.upload_voice(file_obj, file.filename, user_id=user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice upload failed: {str(e)}")


@router.post("/upload/image")
async def upload_image(
    file: UploadFile = File(...),
    user: dict = Depends(require_auth),
    storage: StorageService = Depends(get_storage_service)
):
    """Upload an image file. Files organized by user."""
    try:
        content = await file.read()
        import io
        file_obj = io.BytesIO(content)
        user_id = str(user.get('id', 'anonymous'))
        return storage.upload_image(file_obj, file.filename, user_id=user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")


@router.post("/upload/document")
async def upload_document(
    file: UploadFile = File(...),
    user: dict = Depends(require_auth),
    storage: StorageService = Depends(get_storage_service)
):
    """Upload a knowledge document. Files organized by user."""
    try:
        content = await file.read()
        import io
        file_obj = io.BytesIO(content)
        user_id = str(user.get('id', 'anonymous'))
        return storage.upload_document(file_obj, file.filename, user_id=user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document upload failed: {str(e)}")
