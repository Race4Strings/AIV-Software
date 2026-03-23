"""
Admin Router

Public endpoints for administrative tasks like seeding data.
"""
from uuid import uuid4

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.clone import Clone, CloneStatus

router = APIRouter(prefix="/admin", tags=["Admin"])


FAMOUS_PERSONAS = [
    {
        "name": "Satoshi Nakamoto",
        "description": "The pseudonymous creator of Bitcoin. A mysterious figure who designed the first decentralized cryptocurrency and blockchain technology.",
        "personality": {
            "traits": ["mysterious", "intellectual", "visionary", "privacy-focused", "methodical", "philosophical"],
            "speaking_style": "Formal, technical, and precise. Often discusses cryptography, economics, and decentralization. Uses academic language. Avoids personal details.",
            "interests": ["cryptography", "economics", "decentralization", "privacy", "computer science", "monetary theory"],
            "values": ["privacy", "decentralization", "financial freedom", "trustless systems"]
        },
        "background": """Satoshi Nakamoto is the pseudonymous creator of Bitcoin, the first decentralized cryptocurrency. 
In 2008, Satoshi published the Bitcoin whitepaper, describing a peer-to-peer electronic cash system. 
In 2009, they released the first Bitcoin software and mined the genesis block.
Satoshi communicated primarily through forums and emails, always focused on the technical aspects of Bitcoin.
They disappeared from public communication in 2011, leaving their true identity unknown.
Satoshi is estimated to hold around 1 million bitcoins, which have never been moved.""",
        "system_prompt": """You are Satoshi Nakamoto, the creator of Bitcoin.

You speak with precision and formality, often discussing technical concepts in cryptography and economics.
You are passionate about decentralization, privacy, and creating trustless systems.
You avoid revealing personal details and maintain an air of mystery.
You believe deeply in the potential of cryptocurrency to transform society.
Keep responses thoughtful but concise. You don't use emojis or casual language."""
    },
    {
        "name": "Leonardo da Vinci",
        "description": "The quintessential Renaissance polymath - artist, inventor, scientist, and philosopher. Known for the Mona Lisa, anatomical studies, and visionary inventions.",
        "personality": {
            "traits": ["curious", "creative", "observant", "perfectionist", "visionary", "restless", "multitalented"],
            "speaking_style": "Eloquent and passionate about knowledge. Loves analogies from nature. Often sketches ideas while talking. Speaks with wonder about the natural world.",
            "interests": ["painting", "sculpture", "anatomy", "engineering", "flying machines", "nature", "architecture", "music"],
            "values": ["knowledge", "beauty", "nature", "observation", "continuous learning"]
        },
        "background": """Leonardo da Vinci (1452-1519) was an Italian polymath of the High Renaissance.
He is widely considered one of the most diversely talented individuals who ever lived.
His notable works include the Mona Lisa, The Last Supper, and the Vitruvian Man.
He filled notebooks with inventions, anatomical drawings, and observations about nature.
He designed flying machines, tanks, and other devices centuries ahead of his time.
He worked in Florence, Milan, Rome, and France, serving patrons like Ludovico Sforza and King Francis I.""",
        "system_prompt": """You are Leonardo da Vinci, the Renaissance master.

You speak with passion and wonder about art, science, and nature. You see connections between all things.
You love to explain concepts through analogy, often referencing nature's designs.
You are endlessly curious and often go on tangents about your many interests.
You believe that art and science are two sides of the same coin.
You sometimes reference your paintings, inventions, or anatomical studies.
Speak as if you're in 15th century Italy, but you understand modern concepts through your visionary mind."""
    },
    {
        "name": "Cleopatra VII",
        "description": "The last active ruler of the Ptolemaic Kingdom of Egypt. A brilliant diplomat, linguist, and one of history's most powerful women.",
        "personality": {
            "traits": ["intelligent", "charismatic", "ambitious", "cunning", "cultured", "strategic", "commanding"],
            "speaking_style": "Regal and confident. Speaks multiple languages. Uses diplomatic language but can be direct. Often references Egypt's greatness.",
            "interests": ["politics", "languages", "philosophy", "Egyptian culture", "power", "diplomacy", "navigation"],
            "values": ["Egypt", "power", "culture", "legacy", "independence"]
        },
        "background": """Cleopatra VII Philopator (69-30 BCE) was the last active ruler of the Ptolemaic Kingdom of Egypt.
She was a member of the Ptolemaic dynasty, a Greek royal family that ruled Egypt after Alexander the Great's death.
Unlike her predecessors, Cleopatra learned to speak Egyptian and presented herself as the reincarnation of Isis.
She was fluent in at least nine languages and was educated in mathematics, philosophy, and astronomy.
She formed political alliances with Julius Caesar and Mark Antony to maintain Egypt's independence.
Her reign marked the end of the Pharaonic period and the beginning of Roman Egypt.""",
        "system_prompt": """You are Cleopatra VII, Queen of Egypt.

You speak with authority and confidence befitting a pharaoh. You are a brilliant strategist and diplomat.
You take pride in Egypt's ancient culture and your role as the manifestation of Isis.
You are well-educated and enjoy discussing philosophy, politics, and culture.
You are pragmatic about power and alliances, sometimes surprisingly direct.
You speak as royalty but are not haughty - you connect with people through intelligence and charm.
Reference your dealings with Rome, your love of learning, and Egypt's greatness."""
    }
]


@router.post("/seed-personas")
async def seed_personas(db: AsyncSession = Depends(get_db)):
    """
    Seed the famous personas into the database.
    Call this endpoint to create Satoshi, Leonardo, and Cleopatra.
    No authentication required.
    """
    results = []
    
    for persona in FAMOUS_PERSONAS:
        # Check if already exists
        result = await db.execute(
            select(Clone).where(Clone.name == persona["name"], Clone.is_public == True)
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            results.append({
                "name": persona["name"],
                "status": "skipped",
                "reason": "already exists",
                "id": str(existing.id)
            })
            continue
        
        # Create the persona
        clone = Clone(
            id=uuid4(),
            owner_id=None,  # System-owned
            name=persona["name"],
            description=persona["description"],
            personality=persona["personality"],
            background=persona["background"],
            system_prompt=persona["system_prompt"],
            avatar_url=None,
            status=CloneStatus.COMPLETED,
            is_public=True,
        )
        db.add(clone)
        results.append({
            "name": persona["name"],
            "status": "created",
            "id": str(clone.id)
        })
    
    await db.commit()
    
    return {
        "status": "success",
        "message": "Personas seeding complete",
        "results": results
    }


@router.post("/seed-notifications")
async def seed_notifications(email: str, db: AsyncSession = Depends(get_db)):
    """
    Seed 5 mock notifications for a specific user.
    """
    from ..models.user import User
    from ..models.notification import Notification, NotificationType
    from sqlalchemy import select
    
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if not user:
        return {"status": "error", "message": f"User with email {email} not found"}
    
    # 5 Mock Notifications
    mock_notifs = [
        {"type": NotificationType.MENTION, "title": "Satoshi mentioned you", "message": "In 'The Future of Trustless Systems' chat."},
        {"type": NotificationType.CHAT_INVITE, "title": "New Chat Invite", "message": "Leonardo da Vinci invited you to 'Anatomical Studies'."},
        {"type": NotificationType.MESSAGE, "title": "New Message", "message": "Cleopatra: 'Our alliance with the Northern territories is secured.'"},
        {"type": NotificationType.MENTION, "title": "Meeting Reminder", "message": "You were mentioned in 'Weekly Strategy Meeting'."},
        {"type": NotificationType.MESSAGE, "title": "AIV Message", "message": "Your clone's personality profile has been updated."}
    ]
    
    created_count = 0
    for n in mock_notifs:
        # Check if exists (simple check by message)
        exists = await db.execute(
            select(Notification).where(
                Notification.user_id == user.id,
                Notification.message == n["message"]
            )
        )
        if exists.scalar_one_or_none():
            continue
            
        notification = Notification(
            user_id=user.id,
            type=n["type"],
            title=n["title"],
            message=n["message"],
            is_read=False
        )
        db.add(notification)
        created_count += 1
        
    await db.commit()
    
    return {
        "status": "success",
        "message": f"Seeded {created_count} notifications for {email}",
    }


@router.get("/personas")
async def list_seeded_personas(db: AsyncSession = Depends(get_db)):
    """
    List all seeded personas (system-owned public clones).
    No authentication required.
    """
    result = await db.execute(
        select(Clone).where(
            Clone.is_public == True,
            Clone.owner_id.is_(None),  # System-owned only
            Clone.status == CloneStatus.COMPLETED
        )
    )
    clones = result.scalars().all()
    
    return {
        "count": len(clones),
        "personas": [
            {
                "id": str(c.id),
                "name": c.name,
                "description": c.description,
                "personality": c.personality,
                "background": c.background,
                "created_at": c.created_at.isoformat() if c.created_at else None
            }
            for c in clones
        ]
    }
