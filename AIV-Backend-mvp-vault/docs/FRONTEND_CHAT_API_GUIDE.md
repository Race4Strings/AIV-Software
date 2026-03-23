# Frontend API Guide: Contacts, Workspaces & Multi-Chat

> API documentation for frontend developers to integrate contacts, workspaces, and multi-party chat features.

---

## Quick Reference

| Feature | Base URL | Auth Required |
|---------|----------|---------------|
| Contacts | `/contacts` | ✅ Yes |
| Workspaces | `/workspaces` | ✅ Yes |
| Chats | `/workspaces/{id}/chats`, `/chats` | ✅ Yes |
| Notifications | `/notifications` | ✅ Yes |

---

## 🔐 Authentication

All endpoints require session cookie authentication. User must be signed in.

---

## 📇 Contacts API

Manage user's contact list of clones and other users.

### List Contacts

```
GET /contacts
```

**Response:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Contact ID |
| `contact_type` | string | `"clone"` or `"user"` |
| `nickname` | string | Custom display name (optional) |
| `is_favorite` | boolean | Favorite status |
| `clone` | object | Clone info (if type=clone) |
| `user` | object | User info (if type=user) |

**Use Case:** Display user's contact list in sidebar.

---

### List Public Clones

```
GET /contacts/public?offset={0}&limit={20}
```

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `offset` | int | ❌ | Number of items to skip (default: 0) |
| `limit` | int | ❌ | Max results (default: 20, max: 100) |

**Response:** Array of public clones sorted alphabetically.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Clone ID |
| `name` | string | Clone name |
| `description` | string | Bio/description |
| `avatar_icon_url` | string | Icon URL |
| `owner_name` | string | Creator's name |

**Use Case:** Display all available AI personas in library/browse view.

---

### Search Public Clones

```
GET /contacts/search?q={name}&limit={20}
```

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | ✅ | Search query (min 1 char) |
| `limit` | int | ❌ | Max results (default: 20) |

**Response:** Array of public clones matching search.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Clone ID |
| `name` | string | Clone name |
| `description` | string | Bio/description |
| `avatar_icon_url` | string | Icon URL |
| `owner_name` | string | Creator's name |

**Use Case:** "Add Contact" search popup.

---

### Add Contact

```
POST /contacts
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contact_clone_id` | UUID | ⚠️ | Clone to add (use one) |
| `contact_user_id` | UUID | ⚠️ | User to add (use one) |
| `nickname` | string | ❌ | Custom display name |

> ⚠️ Must provide exactly one of `contact_clone_id` or `contact_user_id`

**Use Case:** User clicks "Add" on search result.

---

### Remove Contact

```
DELETE /contacts/{contact_id}
```

**Use Case:** User removes contact from list.

---

### Toggle Favorite

```
PUT /contacts/{contact_id}/favorite
```

**Response:** `{ "is_favorite": true/false }`

**Use Case:** Star/unstar a contact.

---

## 📁 Workspaces API

Organize chats into workspaces.

### List Workspaces

```
GET /workspaces
```

**Response:** Array of workspaces.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Workspace ID |
| `name` | string | Workspace name |
| `description` | string | Description |
| `is_default` | boolean | Is "General" workspace |
| `icon` | string | Emoji icon |
| `chat_count` | int | Number of chats |

**Use Case:** Workspace switcher dropdown.

> 💡 **Note:** A default "General" workspace is auto-created for each user.

---

### Create Workspace

```
POST /workspaces
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Workspace name (1-100 chars) |
| `description` | string | ❌ | Description |
| `icon` | string | ❌ | Emoji icon |

**Use Case:** "New Workspace" button.

---

### Update Workspace

```
PUT /workspaces/{workspace_id}
```

**Request Body:** Same as create (all optional).

---

### Delete Workspace

```
DELETE /workspaces/{workspace_id}
```

> ⚠️ Cannot delete the default workspace.

---

## 💬 Chats API

Multi-party chat with clones and users.

### List Chats in Workspace

```
GET /workspaces/{workspace_id}/chats
```

**Response:** Array of chats.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Chat ID |
| `title` | string | Chat title |
| `chat_type` | string | `"direct"` or `"group"` |
| `participant_count` | int | Number of participants |
| `message_count` | int | Total messages |
| `last_message` | object | Most recent message |

**Use Case:** Chat list in workspace view.

---

### Create Chat

```
POST /workspaces/{workspace_id}/chats
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | ❌ | Chat title |
| `participant_clone_ids` | UUID[] | ✅ | Clone IDs to add |
| `participant_user_ids` | UUID[] | ❌ | User IDs to add |
| `initial_message` | string | ❌ | First message to send |

**Flow:**
1. User selects clones from contacts
2. Optionally adds title
3. Sends initial message
4. AI orchestrator picks best clone to respond
5. Chat is created with response

**Use Case:** "New Chat" with selected contacts.

---

### Get Chat Details

```
GET /chats/{chat_id}?limit={50}&offset={0}
```

**Response:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Chat ID |
| `title` | string | Chat title |
| `participants` | array | List of participants |
| `messages` | array | Messages (paginated) |
| `message_count` | int | Total message count |

**Use Case:** Open chat view.

---

### Get Messages (Paginated)

```
GET /chats/{chat_id}/messages?limit={50}&offset={0}
```

**Use Case:** Load more messages (infinite scroll).

---

### Send Message ⭐

```
POST /chats/{chat_id}/messages
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | ✅ | Message text (1-5000 chars) |

**Response:**
```json
{
  "status": "sent",
  "user_message": { ... },
  "clone_responses": [ { ... }, { ... } ]
}
```

**🎯 AI Orchestration Rules:**

| Scenario | Who Responds |
|----------|--------------|
| `@CloneName` in message | That clone responds |
| Multiple `@mentions` | All mentioned clones respond |
| No mentions | AI picks best clone based on message |

**Use Case:** User types message, clones respond.

---

### Add Participant

```
POST /chats/{chat_id}/participants
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `clone_id` | UUID | ⚠️ | Clone to add (use one) |
| `user_id` | UUID | ⚠️ | User to add (use one) |

**Use Case:** Add more contacts to existing chat.

---

## 🔔 Notifications API

In-app notifications for mentions and messages.

### List Notifications

```
GET /notifications?unread_only={false}&limit={50}
```

**Response:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Notification ID |
| `type` | string | `"mention"`, `"message"`, `"chat_invite"` |
| `title` | string | Notification title |
| `message` | string | Notification body |
| `is_read` | boolean | Read status |
| `chat_id` | UUID | Related chat |

---

### Get Unread Count

```
GET /notifications/unread-count
```

**Response:** `{ "unread_count": 5 }`

**Use Case:** Badge on notifications icon.

---

### Mark as Read

```
PUT /notifications/{notification_id}/read
```

---

### Mark All as Read

```
PUT /notifications/read-all
```

---

## 📱 User Flows

### Flow 1: First-Time User

```
1. User signs in
2. GET /workspaces → "General" workspace exists
3. GET /contacts → Empty list
4. GET /contacts/search?q=alex → Find public clones
5. POST /contacts → Add clone to contacts
6. POST /workspaces/{id}/chats → Start first chat
```

### Flow 2: Start Multi-Clone Chat

```
1. User clicks "New Chat"
2. Display contacts (GET /contacts)
3. User selects 2+ clones
4. User types initial message
5. POST /workspaces/{id}/chats with:
   - participant_clone_ids: [clone1, clone2]
   - initial_message: "Hello!"
6. AI picks best clone to respond
7. Display chat with response
```

### Flow 3: Ongoing Conversation

```
1. User opens chat (GET /chats/{id})
2. Display messages
3. User sends: "What do you think?"
4. POST /chats/{id}/messages
5. AI analyzes message
6. Best clone responds
7. Append response to chat
```

### Flow 4: Direct @ Mention

```
1. User types: "@Maya what colors for the logo?"
2. POST /chats/{id}/messages
3. System detects @Maya mention
4. Maya clone responds specifically
5. Other clones don't respond
```

---

## ⚠️ Error Responses

| Status | Meaning |
|--------|---------|
| 400 | Bad request (validation error) |
| 401 | Not authenticated |
| 403 | Not authorized (not owner/participant) |
| 404 | Resource not found |

**Error Format:**
```json
{
  "detail": "Error message here"
}
```

---

## 💡 Tips for Frontend

1. **Optimistic UI**: Show user message immediately, then append clone response
2. **Typing Indicator**: Show while waiting for clone response (~3-5 seconds)
3. **@Mention Autocomplete**: Parse `@` and show clone name suggestions
4. **Workspace Badge**: Show `chat_count` on workspace tabs
5. **Unread Badge**: Poll `/notifications/unread-count` periodically
