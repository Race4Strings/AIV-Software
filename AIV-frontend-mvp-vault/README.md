# AIV Frontend - Next.js

A production-quality Next.js frontend for the AIV platform.

## Features

- 🔐 Authentication with email verification
- 🧬 6-Stage Cloning Portal
- 🎨 Beautiful, responsive UI with Tailwind CSS
- ⚡ React Query for data fetching
- 📝 Form validation with React Hook Form + Zod

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query + Zustand
- **Forms**: React Hook Form + Zod
- **UI/UX**: Lucide Icons, Sonner toasts

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your API URL

# Start development server
npm run dev
```

Visit http://localhost:3001

## Project Structure

```
frontend-nextjs/
├── src/
│   ├── app/
│   │   ├── (auth)/         # Auth pages
│   │   ├── (portal)/       # Cloning portal
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/             # Reusable UI
│   │   ├── providers/      # Context providers
│   │   └── ...
│   ├── lib/
│   │   ├── api/            # API client
│   │   └── utils.ts
│   └── stores/             # State management
├── public/
├── tailwind.config.js
└── package.json
```

## Portal Stages

1. **Voice** - Record voice sample with MediaRecorder
2. **Personality** - Answer 5 "Spurge" questions
3. **Knowledge** - Upload documents (optional)
4. **Visual** - Upload photos/portraits
5. **Rights** - Set privacy preferences
6. **Activate** - Review and activate clone
