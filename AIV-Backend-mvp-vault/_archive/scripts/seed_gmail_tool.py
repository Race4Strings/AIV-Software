"""
Script to create Gmail tool definition in the database.
"""
import asyncio

from app.database import async_session_maker, init_db
from app.models import ToolDefinition, ToolProvider


GMAIL_TOOL = {
    "name": "Gmail",
    "slug": "gmail",
    "description": "Connect your Gmail to let your clone help manage emails. Your clone can read, search, and send emails on your behalf.",
    "icon_url": "https://www.gstatic.com/images/branding/product/1x/gmail_2020q4_48dp.png",
    "provider": ToolProvider.GOOGLE,
    "oauth_scopes": [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.modify"
    ],
    "capabilities": [
        {
            "name": "read_emails",
            "description": "Read and search your emails",
            "requires_confirmation": False
        },
        {
            "name": "get_unread_count",
            "description": "Check how many unread emails you have",
            "requires_confirmation": False
        },
        {
            "name": "search_emails",
            "description": "Search emails by sender, subject, or content",
            "requires_confirmation": False
        },
        {
            "name": "send_email",
            "description": "Compose and send new emails",
            "requires_confirmation": True
        },
        {
            "name": "reply_email",
            "description": "Reply to existing email threads",
            "requires_confirmation": True
        },
        {
            "name": "archive_email",
            "description": "Archive emails to clean up inbox",
            "requires_confirmation": True
        }
    ],
    "is_active": True
}


async def seed_gmail_tool():
    """Create Gmail tool definition if it doesn't exist."""
    await init_db()
    
    async with async_session_maker() as db:
        from sqlalchemy import select
        
        # Check if Gmail tool already exists
        result = await db.execute(
            select(ToolDefinition).where(ToolDefinition.slug == "gmail")
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            print("⚠️ Gmail tool already exists, skipping")
            return
        
        tool = ToolDefinition(
            name=GMAIL_TOOL["name"],
            slug=GMAIL_TOOL["slug"],
            description=GMAIL_TOOL["description"],
            icon_url=GMAIL_TOOL["icon_url"],
            provider=GMAIL_TOOL["provider"],
            oauth_scopes=GMAIL_TOOL["oauth_scopes"],
            capabilities=GMAIL_TOOL["capabilities"],
            is_active=GMAIL_TOOL["is_active"]
        )
        db.add(tool)
        await db.commit()
        
        print("✅ Gmail tool created successfully!")
        print(f"   ID: {tool.id}")
        print(f"   Name: {tool.name}")
        print(f"   Capabilities: {len(tool.capabilities)}")


if __name__ == "__main__":
    asyncio.run(seed_gmail_tool())
