# Frontend API Guide - Logic Flow

A simplified guide showing the correct API flow for each user journey.

---

## API Categories

| Category | Purpose | When to Use |
|----------|---------|-------------|
| **Authentication** | Sign up, sign in, verify | Before anything else |
| **onboard** | NEW 3-step onboarding | First-time clone creation |
| **Cloning Portal** | Legacy endpoints | Only for manual edits/updates |
| **Training Chat** | Chat-based training | After clone is activated |
| **Upload** | File uploads | Only if not using onboard |

---

## Flow 1: New User Signup

```
┌─────────────────────────────────────────────────────────────┐
│                    NEW USER SIGNUP                           │
└─────────────────────────────────────────────────────────────┘

Step 1: Create Account
├── POST /auth/signup
│   Body: { email, password, name, username }
│   Response: { state: "success", data: { id, email, is_verified: false } }

Step 2: Check Email for OTP
├── (User receives email with 6-digit code)

Step 3: Verify Email
├── POST /auth/verify-email
│   Body: { email, otp }
│   Response: { state: "success", data: { id, is_verified: true } }

Step 4: Sign In
├── POST /auth/signin
│   Body: { identifier: email, password }
│   Response: { state: "success", data: { id, name, email } }
│   Note: Sets session cookie automatically

Done: User is now authenticated
```

---

## Flow 2: Returning User Sign In

```
┌─────────────────────────────────────────────────────────────┐
│                    RETURNING USER                            │
└─────────────────────────────────────────────────────────────┘

Step 1: Sign In
├── POST /auth/signin
│   Body: { identifier: email_or_username, password }
│   Response: { state: "success", data: { id, name, email } }

Step 2: Check if Clone Exists
├── GET /clone/status
│   Response: { has_clone: true/false, clone_id, status }

If has_clone == false → Go to Flow 3 (Onboarding)
If has_clone == true → Go to Dashboard
```

---

## Flow 3: 3-Step Onboarding (NEW - Recommended)

```
┌─────────────────────────────────────────────────────────────┐
│              3-STEP ONBOARDING (Video-based)                 │
└─────────────────────────────────────────────────────────────┘

Prerequisites: User is signed in, no clone exists

Step 1: Create Empty Clone
├── POST /clone
│   Body: { name: "My Clone" }
│   Response: { id: "clone-uuid", status: "draft" }
│   Save clone_id for next steps

Step 2: Record & Submit Video + Rights
├── POST /clone/{clone_id}/onboard
│   Content-Type: multipart/form-data
│   Body:
│   ├── video: <file.webm/mp4/mov>  (30-60 second intro)
│   ├── is_public: false
│   ├── allow_ai_learning: true
│   ├── allow_audio_clone: true
│   Response: { status: "processing", clone_id }

Step 3: Poll Status Until Complete
├── GET /clone/{clone_id}/onboard/status
│   Response:
│   ├── overall_status: "pending" | "processing" | "complete" | "failed"
│   ├── video_saved: true/false
│   ├── frames_extracted: true/false
│   ├── audio_extracted: true/false
│   ├── transcription_complete: true/false
│   ├── dimensions_extracted: true/false
│   ├── voice_cloned: true/false
│   ├── avatar_generated: true/false
│   ├── personality_synthesized: true/false
│   └── transcription, dimensions, voice_id, avatar_url (when available)

   Poll every 2 seconds until overall_status == "complete"

Done: Clone is fully created with:
├── Voice cloned from video
├── Personality extracted from speech
├── Avatar generated from video frame
├── 10 dimensions analyzed
└── Status: "completed" and ready to use
```

---

## Flow 4: Dashboard (After Onboarding)

```
┌─────────────────────────────────────────────────────────────┐
│                    DASHBOARD                                 │
└─────────────────────────────────────────────────────────────┘

Prerequisites: User is signed in, has clone

Check Status
├── GET /clone/status
│   Response: { has_clone: true, clone_id, status: "completed" }

Get Clone Details
├── GET /clone/{clone_id}
│   Response: Full clone object with all data
│   ├── name, description
│   ├── avatar_profile_url, avatar_icon_url
│   ├── personality { traits, values, quirks, speaking_style }
│   ├── background
│   ├── dimensions { mind, work, heart, ... }
│   ├── elevenlabs_voice_id
│   └── onboard_transcription
```

---

## Flow 5: Enhancement (Optional, Anytime)

```
┌─────────────────────────────────────────────────────────────┐
│            ENHANCEMENT (After Onboarding)                    │
└─────────────────────────────────────────────────────────────┘

These are OPTIONAL improvements after initial onboarding.

Add Better Photos (for improved avatar)
├── POST /clone/{clone_id}/enhance/photos
│   Content-Type: multipart/form-data
│   Body: photos: [file1, file2, file3]  (max 3)
│   Response: { status: "success", avatar generated from photos }

Add Knowledge Documents
├── POST /clone/{clone_id}/enhance/knowledge
│   Content-Type: multipart/form-data
│   Body: files: [pdf1, doc2, txt3]
│   Response: { status: "success", files_uploaded, total_files }
```

---

## Flow 6: Training Chat (Simplified)

```
┌─────────────────────────────────────────────────────────────┐
│              TRAINING CHAT (Single Session)                  │
└─────────────────────────────────────────────────────────────┘

Purpose: Refine clone's personality through conversation
Note: One lifetime chat session per clone, auto-managed

Step 1: Open Training Page (get chat history)
├── GET /clones/{clone_id}/training/chat
│   Params: ?limit=50&offset=0  (optional pagination)
│   Response:
│   ├── session_id: "uuid"  (auto-created if none exists)
│   ├── messages: [ { role, content, created_at }, ... ]
│   └── total_messages: 25

Step 2: Send Message & Get Response
├── POST /clones/{clone_id}/training/chat
│   Body: { "content": "What do you think about X?" }
│   Response:
│   ├── user_message: { id, role: "user", content, created_at }
│   ├── assistant_message: { id, role: "assistant", content, created_at }
│   └── dimension_updated: "work"  (if any dimension was updated)

Step 3: Leave page, come back anytime
├── GET /clones/{clone_id}/training/chat
│   Same session, all messages preserved

No session management needed! Just GET and POST.
```

---

## Flow 7: Manual Clone Updates (Legacy)

```
┌─────────────────────────────────────────────────────────────┐
│            MANUAL UPDATES (Not needed for new flow)          │
└─────────────────────────────────────────────────────────────┘

These are only needed if you want to manually edit specific parts.
The new onboard flow handles all of this automatically.

Update Voice Data
├── PUT /clone/{clone_id}/voice
│   Body: { voice recording data }

Update Personality
├── PUT /clone/{clone_id}/personality
│   Body: { narrative answers }

Update Individual Dimension
├── PUT /clone/{clone_id}/dimensions/{dimension_key}
│   Body: { content: "updated dimension content" }
│   dimension_key: mind, work, heart, ethics, future, spirit, 
│                  experiences, physicality, surroundings, relationships

Update Visual
├── PUT /clone/{clone_id}/visual
│   Body: { avatar_profile_url, avatar_icon_url }

Update Rights
├── PUT /clone/{clone_id}/rights
│   Body: { is_public, ... }

Activate Clone (Legacy)
├── POST /clone/{clone_id}/activate
│   Note: Only needed for legacy flow. New onboard auto-activates.
```

---

## Quick Reference: Which API for What

| I want to... | Use this API |
|--------------|--------------|
| Create new account | `POST /auth/signup` |
| Verify email | `POST /auth/verify-email` |
| Sign in | `POST /auth/signin` |
| Check if user has clone | `GET /clone/status` |
| Create clone | `POST /clone` |
| **Submit video onboard** | `POST /clone/{id}/onboard` |
| **Check onboard progress** | `GET /clone/{id}/onboard/status` |
| Get clone details | `GET /clone/{id}` |
| Add photos later | `POST /clone/{id}/enhance/photos` |
| Add documents later | `POST /clone/{id}/enhance/knowledge` |
| **Get training chat** | `GET /clones/{id}/training/chat` |
| **Send training message** | `POST /clones/{id}/training/chat` |
| Get training stats | `GET /clones/{id}/training/stats` |
| Upload any file | `POST /upload` |
| Sign out | `GET /auth/signout` |

---

## Frontend Page → API Mapping

| Page | APIs Used |
|------|-----------|
| **/login** | `POST /auth/signin` |
| **/signup** | `POST /auth/signup` → `POST /auth/verify-email` |
| **/onboard** | `GET /clone/status` → `POST /clone` → `POST /clone/{id}/onboard` → `GET /clone/{id}/onboard/status` |
| **/dashboard** | `GET /clone/status` → `GET /clone/{id}` |
| **/settings** | `GET /clone/{id}` → `PUT /clone/{id}/...` |
| **/training** | `GET /clones/{id}/training/chat` → `POST /clones/{id}/training/chat` |
| **/enhance** | `POST /clone/{id}/enhance/photos` or `POST /clone/{id}/enhance/knowledge` |

---

## Status Values

### Clone Status
| Value | Meaning |
|-------|---------|
| `draft` | Clone created, not yet processed |
| `processing` | Onboard video being processed |
| `completed` | Ready to use |

### Onboard Status
| Value | Meaning |
|-------|---------|
| `pending` | Not started |
| `processing` | Video being processed |
| `complete` | All steps done |
| `failed` | Error occurred |

---

## Error Handling

```
All errors return:
{
  "detail": "Error message"
}

Status codes:
├── 200: Success
├── 401: Not authenticated (redirect to login)
├── 404: Clone not found
├── 422: Validation error (check request body)
├── 500: Server error
```

---

## Summary: The Simple New User Journey

```
1. POST /auth/signup           → Create account
2. POST /auth/verify-email     → Verify with OTP
3. POST /auth/signin           → Sign in
4. GET  /clone/status          → Check if has clone (no)
5. POST /clone                 → Create empty clone
6. POST /clone/{id}/onboard    → Submit video + rights
7. GET  /clone/{id}/onboard/status → Poll until complete
8. Redirect to dashboard       → User is all set!
```

That's it! The new onboard flow does everything in one submission.
