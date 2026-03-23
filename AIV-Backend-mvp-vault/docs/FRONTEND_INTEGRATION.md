`# Frontend Integration Guide - Chat System & Personas

## API Endpoints Overview

---

### 0. Admin Endpoints (No Authentication Required)

#### Seed Famous Personas
Use this to populate the database with the 3 famous personas (Satoshi, Leonardo, Cleopatra).

```http
POST /admin/seed-personas
```

**Response:**
```json
{
  "status": "success",
  "message": "Personas seeding complete",
  "results": [
    { "name": "Satoshi Nakamoto", "status": "created", "id": "..." },
    { "name": "Leonardo da Vinci", "status": "created", "id": "..." },
    { "name": "Cleopatra VII", "status": "created", "id": "..." }
  ]
}
```

*If personas already exist, returns `"status": "skipped"` with reason.*

#### List Seeded Personas
```http
GET /admin/personas
```

**Response:**
```json
{
  "count": 3,
  "personas": [
    {
      "id": "...",
      "name": "Satoshi Nakamoto",
      "description": "...",
      "personality": { "traits": [...], "speaking_style": "..." },
      "background": "...",
      "created_at": "..."
    }
  ]
}
```

---

### 1. Public Personas (Famous Clones)

#### List All Public Clones
```http
GET /contacts/public?offset=0&limit=20
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "78325e25-554e-475a-85f0-d21f8eee8546",
    "name": "Satoshi Nakamoto",
    "description": "The pseudonymous creator of Bitcoin...",
    "avatar_profile_url": null,
    "avatar_icon_url": null,
    "owner_name": null
  }
]
```

#### Get Persona Details
```http
GET /contacts/public/<clone_id>
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "78325e25-554e-475a-85f0-d21f8eee8546",
  "name": "Satoshi Nakamoto",
  "description": "The pseudonymous creator of Bitcoin...",
  "personality": {
    "traits": ["mysterious", "intellectual", "visionary"],
    "speaking_style": "Formal, technical, and precise...",
    "interests": ["cryptography", "economics", "decentralization"],
    "values": ["privacy", "decentralization", "financial freedom"]
  },
  "background": "Satoshi Nakamoto is the pseudonymous creator of Bitcoin...",
  "is_system": true,
  "owner_name": "AIV System",
  "created_at": "2025-12-25T09:07:10.332000+00:00"
}
```

#### Search Personas
```http
GET /contacts/search?q=satoshi&limit=20
Authorization: Bearer <token>
```

---

### 2. Creating Chats

#### Create Chat with Persona(s)
```http
POST /workspaces/<workspace_id>/chats
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Chat with Satoshi",
  "participant_clone_ids": ["78325e25-554e-475a-85f0-d21f8eee8546"],
  "participant_user_ids": [],
  "initial_message": "Hello Satoshi!"
}
```

#### Create Chat with AIV (No Participants)
```http
POST /workspaces/<workspace_id>/chats
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "General Chat",
  "participant_clone_ids": [],
  "participant_user_ids": []
}
```
*When no clone participants are added, AIV (the general AI assistant) will respond.*

---

### 3. Managing Participants

#### Add Participant to Chat
```http
POST /chats/<chat_id>/participants
Authorization: Bearer <token>
Content-Type: application/json

{
  "clone_id": "78325e25-554e-475a-85f0-d21f8eee8546"
}
```

#### Remove Participant from Chat
```http
DELETE /chats/<chat_id>/participants/<participant_id>
Authorization: Bearer <token>
```

**Response:**
```json
{
  "status": "removed",
  "participant_id": "abc123-..."
}
```

**Error Cases:**
- `404`: Participant not found
- `400`: Cannot remove yourself as owner

---

### 4. Sending Messages

#### Send Message
```http
POST /chats/<chat_id>/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "What do you think about Bitcoin?"
}
```

#### Using @Mentions in Group Chats
If multiple personas are in the chat, use @mentions to direct your message:

```json
{
  "content": "@Satoshi what inspired the blockchain design?"
}
```

*Only the mentioned clone will respond. If no @mention, the system will pick the most relevant responder.*

---

## Frontend Implementation Examples

### React/TypeScript - List Personas

```typescript
// api/contacts.ts
export async function listPublicPersonas(offset = 0, limit = 20) {
  const response = await fetch(
    `${API_URL}/contacts/public?offset=${offset}&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    }
  );
  return response.json();
}

export async function getPersonaDetail(cloneId: string) {
  const response = await fetch(
    `${API_URL}/contacts/public/${cloneId}`,
    {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    }
  );
  return response.json();
}
```

### React - Remove Participant Component

```tsx
// components/chat/ParticipantItem.tsx
interface Props {
  chatId: string;
  participant: {
    id: string;
    participant_type: 'clone' | 'user';
    clone?: { id: string; name: string; avatar_icon_url?: string };
    role: string;
  };
  onRemoved: () => void;
}

export function ParticipantItem({ chatId, participant, onRemoved }: Props) {
  const handleRemove = async () => {
    if (!confirm(`Remove ${participant.clone?.name} from this chat?`)) return;
    
    try {
      const response = await fetch(
        `${API_URL}/chats/${chatId}/participants/${participant.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${getToken()}`
          }
        }
      );
      
      if (response.ok) {
        onRemoved();
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to remove participant');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  // Can't remove owner
  const canRemove = participant.role !== 'owner';

  return (
    <div className="participant-item">
      <img src={participant.clone?.avatar_icon_url} alt={participant.clone?.name} />
      <span>{participant.clone?.name}</span>
      {canRemove && (
        <button onClick={handleRemove} className="remove-btn">
          ✕
        </button>
      )}
    </div>
  );
}
```

### React - Create Chat with Persona

```tsx
// components/library/PersonaCard.tsx
export function PersonaCard({ persona }: { persona: Persona }) {
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();

  const startChat = async () => {
    const response = await fetch(
      `${API_URL}/workspaces/${currentWorkspace.id}/chats`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: `Chat with ${persona.name}`,
          participant_clone_ids: [persona.id],
          participant_user_ids: []
        })
      }
    );
    
    if (response.ok) {
      const chat = await response.json();
      router.push(`/chat/${chat.id}`);
    }
  };

  return (
    <div className="persona-card">
      <h3>{persona.name}</h3>
      <p>{persona.description}</p>
      {persona.is_system && <span className="badge">System Persona</span>}
      <button onClick={startChat}>Start Chat</button>
    </div>
  );
}
```

---

## Available Famous Personas

| Name | ID | Description |
|------|-------|-------------|
| Satoshi Nakamoto | `78325e25-554e-475a-85f0-d21f8eee8546` | Bitcoin creator |
| Leonardo da Vinci | `4bcff96e-4e2c-4310-a364-075f82e6e73e` | Renaissance polymath |
| Cleopatra VII | `88f6d32c-107d-462a-b6fb-238d4c1b2303` | Egyptian pharaoh |

---

## Error Handling

| Status | Description |
|--------|-------------|
| `400` | Invalid request (missing fields, can't remove owner) |
| `401` | Unauthorized (invalid/expired token) |
| `403` | Forbidden (not a participant) |
| `404` | Resource not found |
