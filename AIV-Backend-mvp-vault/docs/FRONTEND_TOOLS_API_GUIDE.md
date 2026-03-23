# Frontend API Guide: Tool Integrations

> API documentation for connecting external tools (Gmail) to user accounts and chats.

---

## Quick Reference

| Endpoint | Description |
|----------|-------------|
| `GET /tools` | List available tools |
| `GET /tools/connections` | User's connected tools |
| `GET /tools/{slug}/auth` | Start OAuth flow |
| `DELETE /tools/connections/{id}` | Disconnect tool |
| `GET /tools/chat/{chat_id}` | Tools in a chat |
| `POST /tools/chat/{chat_id}` | Add tool to chat |

---

## 🔧 List Available Tools

```
GET /tools
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Gmail",
    "slug": "gmail",
    "description": "Connect your Gmail...",
    "icon_url": "https://...",
    "provider": "google",
    "capabilities": [
      {"name": "read_emails", "requires_confirmation": false},
      {"name": "send_email", "requires_confirmation": true}
    ],
    "is_connected": false
  }
]
```

**Use Case:** Display available tools on Tools page.

---

## 🔗 Connect Tool (OAuth)

### Step 1: Start OAuth Flow

```
GET /tools/{slug}/auth
```

**Response:**
```json
{
  "auth_url": "https://accounts.google.com/o/oauth2/...",
  "state": "random-state-token"
}
```

### Step 2: Redirect User

```javascript
window.location.href = response.auth_url;
```

### Step 3: Handle Callback

User returns to: `{frontend_url}/tools?connected=gmail` or `?error=...`

**Use Case:** "Connect Gmail" button.

---

## 📋 List Connected Tools

```
GET /tools/connections
```

**Response:**
```json
[
  {
    "id": "connection-uuid",
    "tool_id": "tool-uuid",
    "tool_name": "Gmail",
    "tool_slug": "gmail",
    "tool_icon": "https://...",
    "account_email": "user@gmail.com",
    "connected_at": "2025-01-01T00:00:00Z",
    "is_active": true
  }
]
```

---

## ❌ Disconnect Tool

```
DELETE /tools/connections/{connection_id}
```

**Response:** `{ "status": "disconnected" }`

---

## 💬 Add Tool to Chat

After connecting a tool, add it to a chat so your clone can use it.

### List Tools in Chat

```
GET /tools/chat/{chat_id}
```

### Add Tool to Chat

```
POST /tools/chat/{chat_id}
```

**Request:**
```json
{
  "tool_connection_id": "connection-uuid",
  "settings": {}
}
```

### Remove Tool from Chat

```
DELETE /tools/chat/{chat_id}/{chat_tool_id}
```

---

## 📱 User Flow: Connect Gmail

```
1. User goes to /tools page
2. Frontend calls GET /tools
3. User clicks "Connect Gmail"
4. Frontend calls GET /tools/gmail/auth
5. Frontend redirects to auth_url
6. User logs into Google, approves
7. Google redirects to /tools/gmail/callback
8. Backend exchanges code for tokens
9. Backend redirects to /tools?connected=gmail
10. Frontend shows success message
```

---

## 💬 User Flow: Use in Chat

```
1. User opens chat with their clone
2. Clicks "Add Tools" button
3. Frontend calls GET /tools/connections
4. User selects Gmail connection
5. Frontend calls POST /tools/chat/{chat_id}
6. Clone now has Gmail access
7. User asks: "Do I have any unread emails?"
8. Clone uses Gmail to respond
```

---

## ⚙️ Environment Variables

Add to `.env`:

```
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
API_BASE_URL=https://api.yoursite.com
FRONTEND_URL=https://yoursite.com
```

---

## 🔒 Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create project or select existing
3. Enable Gmail API
4. Go to Credentials → Create OAuth Client ID
5. Application type: Web application
6. Authorized redirect URIs: `{API_BASE_URL}/tools/gmail/callback`
7. Copy Client ID and Secret to `.env`

---

## ⚠️ Only Personal Clone

Remember: Only the user's personal clone can use tools.
Public clones in group chats cannot access user's connected tools.

---

## 🔄 Background Monitoring

The server automatically polls connected Gmail accounts every **1 minute**.

### What Happens:

1. Server checks for new unread emails
2. If found, creates a notification message in chats with Gmail enabled
3. User sees: "📧 **New Email Received** - From: John, Subject: Meeting"

### Notification Message Format:

```
📧 **New Email Received**

**From:** john@example.com
**Subject:** Project Meeting Tomorrow

Hey, just wanted to confirm our meeting tomorrow at 2 PM...

_Reply to this message if you'd like me to help with this email._
```

### What Frontend Should Do:

1. Poll `/chats/{id}/messages` or use WebSocket for real-time
2. Look for messages with `mentions.type` = "email_notification"
3. Display with email styling (different from regular messages)
4. Allow user to reply: "Reply saying I'll be there"

