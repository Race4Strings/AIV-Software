"""
S3-Compatible Storage Service

Uses boto3 for S3 API compatibility with:
- MinIO (local development)
- AWS S3 (production)
- Railway Buckets (platform)
- Any S3-compatible storage
"""

import logging
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from typing import Optional, BinaryIO
from uuid import uuid4
import mimetypes
from functools import lru_cache
from fastapi import HTTPException

from ..config import get_settings

logger = logging.getLogger(__name__)

ALLOWED_TYPES = {
    "voice": {
        "mimetypes": ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/m4a", "audio/webm"],
        "max_size_mb": 500,
    },
    "image": {
        "mimetypes": ["image/jpeg", "image/png", "image/webp", "image/gif"],
        "max_size_mb": 50,
    },
    "document": {
        "mimetypes": [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        "max_size_mb": 100,
    },
}


class StorageService:
    """S3-compatible storage service."""
    
    def __init__(self):
        settings = get_settings()
        
        # Internal endpoint for uploads (fast within Railway network)
        self.endpoint_url = f"{'https' if settings.minio_secure else 'http'}://{settings.minio_endpoint}"
        
        # Public URL for frontend access (use MINIO_PUBLIC_URL if set)
        self.public_url = settings.minio_public_url if settings.minio_public_url else self.endpoint_url
        
        # Configure boto3 for S3-compatible endpoint (for uploads)
        self.s3_client = boto3.client(
            's3',
            endpoint_url=self.endpoint_url,
            aws_access_key_id=settings.minio_access_key,
            aws_secret_access_key=settings.minio_secret_key,
            config=Config(
                signature_version='s3v4',
                s3={'addressing_style': 'path'}  # Use path-style for MinIO compatibility
            ),
            region_name=settings.minio_region  # Default region for MinIO
        )
        
        # Create a second client for presigned URLs using PUBLIC endpoint
        # This ensures presigned URLs use the publicly accessible domain
        self.s3_public_client = boto3.client(
            's3',
            endpoint_url=self.public_url,
            aws_access_key_id=settings.minio_access_key,
            aws_secret_access_key=settings.minio_secret_key,
            config=Config(
                signature_version='s3v4',
                s3={'addressing_style': 'path'}
            ),
            region_name=settings.minio_region
        )
        
        self.bucket_name = settings.minio_bucket
        
        # Ensure bucket exists
        self._ensure_bucket_exists()
    
    def _ensure_bucket_exists(self) -> None:
        """Create bucket if it doesn't exist."""
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', '')
            if error_code in ('404', 'NoSuchBucket'):
                self.s3_client.create_bucket(Bucket=self.bucket_name)
                logger.info(f"Created bucket: {self.bucket_name}")
            else:
                raise
    
    def upload_file(
        self,
        file: BinaryIO,
        filename: str,
        user_id: Optional[str] = None,
        content_type: Optional[str] = None,
        folder: str = "uploads",
        file_category: Optional[str] = None,
    ) -> dict:
        """
        Upload a file to S3-compatible storage.

        Args:
            file: File-like object to upload
            filename: Original filename
            user_id: User ID for organizing files per user
            content_type: MIME type (auto-detected if not provided)
            folder: Folder prefix in bucket (uploads, voice, images, documents)
            file_category: Optional category for validation (voice, image, document)

        Returns:
            dict with url, key, filename
        """
        # Validate file category if provided
        if file_category and file_category in ALLOWED_TYPES:
            rules = ALLOWED_TYPES[file_category]

            # Detect content type for validation
            detected_type = content_type
            if not detected_type:
                detected_type, _ = mimetypes.guess_type(filename)
                detected_type = detected_type or "application/octet-stream"

            if detected_type not in rules["mimetypes"]:
                allowed = ", ".join(rules["mimetypes"])
                raise HTTPException(
                    status_code=400,
                    detail=f"File type '{detected_type}' is not allowed for {file_category} uploads. Allowed types: {allowed}",
                )

            # Check file size
            file.seek(0, 2)  # Seek to end
            file_size_bytes = file.tell()
            file.seek(0)  # Seek back to start
            max_bytes = rules["max_size_mb"] * 1024 * 1024
            if file_size_bytes > max_bytes:
                raise HTTPException(
                    status_code=400,
                    detail=f"File size ({file_size_bytes // (1024 * 1024)}MB) exceeds the {rules['max_size_mb']}MB limit for {file_category} uploads.",
                )

        # Generate unique key with user folder
        ext = filename.rsplit('.', 1)[-1] if '.' in filename else 'bin'
        unique_filename = f"{uuid4()}.{ext}"
        
        # Organize by user_id if provided: {folder}/{user_id}/{uuid}.{ext}
        if user_id:
            key = f"{folder}/{user_id}/{unique_filename}"
        else:
            key = f"{folder}/{unique_filename}"
        
        # Detect content type if not provided
        if not content_type:
            content_type, _ = mimetypes.guess_type(filename)
            content_type = content_type or 'application/octet-stream'
        
        # Upload to S3 (Railway Buckets are private, ACL not supported)
        self.s3_client.upload_fileobj(
            file,
            self.bucket_name,
            key,
            ExtraArgs={
                'ContentType': content_type,
            }
        )
        
        # Generate presigned URL for access (Railway Buckets are private by default)
        # Use the PUBLIC client so the URL uses the public endpoint
        # Presigned URLs are valid for up to 90 days on Railway
        presigned_url = self.s3_public_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': self.bucket_name, 'Key': key},
            ExpiresIn=7 * 24 * 60 * 60  # 7 days in seconds
        )
        
        return {
            "url": presigned_url,
            "key": key,
            "filename": filename,
            "content_type": content_type
        }
    
    def upload_voice(self, file: BinaryIO, filename: str, user_id: Optional[str] = None, file_category: Optional[str] = None) -> dict:
        """Upload voice recording."""
        return self.upload_file(file, filename, user_id=user_id, folder="voice", file_category=file_category)

    def upload_image(self, file: BinaryIO, filename: str, user_id: Optional[str] = None, file_category: Optional[str] = None) -> dict:
        """Upload image file."""
        return self.upload_file(file, filename, user_id=user_id, folder="images", file_category=file_category)

    def upload_document(self, file: BinaryIO, filename: str, user_id: Optional[str] = None, file_category: Optional[str] = None) -> dict:
        """Upload knowledge document."""
        return self.upload_file(file, filename, user_id=user_id, folder="documents", file_category=file_category)
    
    def get_presigned_url(self, key: str, expires_in: int = 3600) -> str:
        """
        Generate a presigned URL for private file access.
        
        Args:
            key: Object key in bucket
            expires_in: URL expiration time in seconds
        
        Returns:
            Presigned URL string (using public endpoint)
        """
        return self.s3_public_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': self.bucket_name, 'Key': key},
            ExpiresIn=expires_in
        )
    
    def delete_file(self, key: str) -> bool:
        """Delete a file from storage."""
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)
            return True
        except ClientError:
            return False
    
    def file_exists(self, key: str) -> bool:
        """Check if a file exists in storage."""
        try:
            self.s3_client.head_object(Bucket=self.bucket_name, Key=key)
            return True
        except ClientError:
            return False


@lru_cache()
def get_storage_service() -> StorageService:
    """Get cached storage service instance."""
    return StorageService()
