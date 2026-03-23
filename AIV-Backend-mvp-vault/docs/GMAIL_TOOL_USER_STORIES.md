# Gmail Tool Integration - User Stories & Testing Guide

## 📋 User Stories

### US1: Connect Gmail Account
> **As a user**, I want to connect my Gmail account so my personal clone can help me manage emails.

**Acceptance Criteria:**
- [ ] User can see "Gmail" in available tools
- [ ] Clicking "Connect" starts Google OAuth flow
- [ ] After authorization, Gmail appears in "Connected Tools"
- [ ] Account email is displayed

---

### US2: Add Gmail to Chat
> **As a user**, I want to add Gmail to a chat so my clone can access my inbox during conversations.

**Acceptance Criteria:**
- [ ] User can see "Add Tool" option in chat settings
- [ ] Only user's connected tools are shown
- [ ] After adding, clone acknowledges tool access
- [ ] Tool appears in chat's tool list

---

### US3: Ask About Emails
> **As a user**, I want to ask "Do I have any unread emails?" and get a real answer.

**Acceptance Criteria:**
- [ ] Clone understands email-related queries
- [ ] Clone queries Gmail API
- [ ] Clone responds with actual unread count
- [ ] Clone lists recent emails with sender/subject

---

### US4: Receive Email Notifications
> **As a user**, I want to be notified in chat when I receive a new email.

**Acceptance Criteria:**
- [ ] Server polls Gmail every 1 minute
- [ ] New emails trigger notification in chat
- [ ] Notification shows sender, subject, preview
- [ ] No duplicate notifications for same email

---

### US5: Send Email via Clone (with confirmation)
> **As a user**, I want to ask my clone to send an email, but it should confirm before sending.

**Acceptance Criteria:**
- [ ] User says: "Send an email to john@example.com about the meeting"
- [ ] Clone drafts the email
- [ ] Clone asks: "Should I proceed? (yes/no)"
- [ ] Only after "yes", email is sent
- [ ] Clone confirms: "✅ Email sent!"

---

### US6: Disconnect Gmail
> **As a user**, I want to disconnect Gmail from my account when I no longer need it.

**Acceptance Criteria:**
- [ ] User can click "Disconnect" on connected tool
- [ ] Tokens are removed
- [ ] Tool is removed from all chats
- [ ] Clone can no longer access Gmail

---

## 🧪 Step-by-Step Testing Guide

### Prerequisites

1. **Google Cloud Setup:**
   ```
   1. Go to console.cloud.google.com
   2. Create/select project
   3. Enable Gmail API
   4. Create OAuth 2.0 Client ID (Web app)
   5. Add redirect URI: http://localhost:8000/tools/gmail/callback
   6. Copy Client ID and Secret
   ```

2. **Environment Setup:**
   ```bash
   # Add to backend-python/.env
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   API_BASE_URL=http://localhost:8000
   FRONTEND_URL=http://localhost:3000
   ```

3. **Seed Gmail Tool:**
   ```bash
   cd backend-python
   source venv/bin/activate
   python -m app.scripts.seed_gmail_tool
   # ✅ Gmail tool created successfully!
   ```

4. **Start Server:**
   ```bash
   uvicorn app.main:app --reload --port 8000
   # ✅ Tool monitoring started
   ```

---

### Test 1: List Available Tools

```bash
# Sign in first
curl -X POST http://localhost:8000/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"identifier": "your@email.com", "password": "yourpass"}' \
  -c cookies.txt

# List tools
curl http://localhost:8000/tools -b cookies.txt
```

**Expected Response:**
```json
[
  {
    "id": "uuid",
    "name": "Gmail",
    "slug": "gmail",
    "is_connected": false,
    "capabilities": [...]
  }
]
```

---

### Test 2: Start OAuth Flow

```bash
curl http://localhost:8000/tools/gmail/auth -b cookies.txt
```

**Expected Response:**
```json
{
  "auth_url": "https://accounts.google.com/o/oauth2/...",
  "state": "random-token"
}
```

**Manual Step:** Open `auth_url` in browser, complete Google login

---

### Test 3: Verify Connection

```bash
curl http://localhost:8000/tools/connections -b cookies.txt
```

**Expected Response:**
```json
[
  {
    "id": "connection-uuid",
    "tool_name": "Gmail",
    "account_email": "your@gmail.com",
    "is_active": true
  }
]
```

---

### Test 4: Add Gmail to Chat

```bash
# Get your workspace ID first
WORKSPACE_ID=$(curl -s http://localhost:8000/workspaces -b cookies.txt | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")

# Create a chat
CHAT_RESPONSE=$(curl -s -X POST "http://localhost:8000/workspaces/$WORKSPACE_ID/chats" \
  -H "Content-Type: application/json" \
  -d '{"title": "My Email Assistant"}' \
  -b cookies.txt)

CHAT_ID=$(echo $CHAT_RESPONSE | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

# Get connection ID
CONNECTION_ID=$(curl -s http://localhost:8000/tools/connections -b cookies.txt | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")

# Add tool to chat
curl -X POST "http://localhost:8000/tools/chat/$CHAT_ID" \
  -H "Content-Type: application/json" \
  -d "{\"tool_connection_id\": \"$CONNECTION_ID\"}" \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "id": "chat-tool-uuid",
  "tool_name": "Gmail",
  "account_email": "your@gmail.com"
}
```

---

### Test 5: Execute Tool Action - Get Unread Count

```bash
curl -X POST http://localhost:8000/tools/execute \
  -H "Content-Type: application/json" \
  -d "{
    \"tool_connection_id\": \"$CONNECTION_ID\",
    \"action\": \"get_unread_count\",
    \"parameters\": {}
  }" \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "success": true,
  "action_type": "get_unread_count",
  "result": {"unread_count": 5},
  "message": "You have 5 unread emails."
}
```

---

### Test 6: Execute Tool Action - Read Emails

```bash
curl -X POST http://localhost:8000/tools/execute \
  -H "Content-Type: application/json" \
  -d "{
    \"tool_connection_id\": \"$CONNECTION_ID\",
    \"action\": \"read_emails\",
    \"parameters\": {\"count\": 3}
  }" \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "success": true,
  "action_type": "read_emails",
  "result": {
    "emails": [
      {"from": "john@example.com", "subject": "Meeting", ...},
      ...
    ]
  }
}
```

---

### Test 7: Send Email (Confirmation Flow)

```bash
# Step 1: Request to send (will require confirmation)
curl -X POST http://localhost:8000/tools/execute \
  -H "Content-Type: application/json" \
  -d "{
    \"tool_connection_id\": \"$CONNECTION_ID\",
    \"action\": \"send_email\",
    \"parameters\": {
      \"to\": \"test@example.com\",
      \"subject\": \"Test Email\",
      \"body\": \"This is a test.\"
    }
  }" \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "success": true,
  "requires_confirmation": true,
  "action_id": "pending-action-uuid",
  "message": "I'll send an email to test@example.com. Should I proceed?"
}
```

```bash
# Step 2: Confirm the action
curl -X POST "http://localhost:8000/tools/actions/pending-action-uuid/confirm" \
  -H "Content-Type: application/json" \
  -d '{"action_id": "pending-action-uuid", "confirmed": true}' \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "success": true,
  "message": "✅ Email sent to test@example.com"
}
```

---

### Test 8: Background Monitoring

1. **Ensure Gmail is added to a chat** (Test 4)

2. **Send yourself an email** from another account

3. **Wait 1 minute** for polling

4. **Check chat messages:**
```bash
curl "http://localhost:8000/chats/$CHAT_ID/messages" -b cookies.txt
```

**Expected:** New message with email notification:
```json
{
  "content": "📧 **New Email Received**\n\n**From:** ...",
  "mentions": {"type": "email_notification"}
}
```

---

### Test 9: Disconnect Tool

```bash
curl -X DELETE "http://localhost:8000/tools/connections/$CONNECTION_ID" \
  -b cookies.txt
```

**Expected Response:**
```json
{"status": "disconnected", "connection_id": "uuid"}
```

---

## 🎯 Quick Checklist

| Test | Command | Expected |
|------|---------|----------|
| List tools | `GET /tools` | Gmail shown |
| Start OAuth | `GET /tools/gmail/auth` | auth_url returned |
| List connections | `GET /tools/connections` | Gmail connected |
| Add to chat | `POST /tools/chat/{id}` | Tool added |
| Unread count | `POST /tools/execute` (get_unread_count) | Count returned |
| Read emails | `POST /tools/execute` (read_emails) | Emails listed |
| Send email | `POST /tools/execute` (send_email) | Requires confirmation |
| Confirm send | `POST /tools/actions/{id}/confirm` | Email sent |
| Background poll | Wait 1 min after new email | Notification in chat |
| Disconnect | `DELETE /tools/connections/{id}` | Disconnected |

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| OAuth fails | Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` |
| "Tool not found" | Run `python -m app.scripts.seed_gmail_tool` |
| No monitoring started | Check server logs for "✅ Tool monitoring started" |
| Token expired | Reconnect Gmail (refresh token should auto-refresh) |
| No email notifications | Ensure tool is added to chat AND polling is running |
