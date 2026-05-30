# 🎙️ Sonic AI

Sonic AI is a modern, responsive, voice-first AI chat assistant built using **Next.js 16 (App Router)** and **MongoDB**. Designed with a premium, mobile-first aesthetic, Sonic AI features real-time conversational streaming, custom authentication with password recovery, dynamic chat session management, and robust PDF document analysis.

---

## 🚀 Key Features

*   **⚡ Voice-First Streaming**: Chat completions stream in real-time, optimized for text-to-speech engine compatibility (concise, direct paragraph responses).
*   **🤖 Dual AI SDK Configuration**:
    *   **OpenRouter Integration**: Currently active, utilizing the `openai/gpt-oss-120b:free` model for responses.
    *   **Google Generative AI SDK**: Integrated and pre-configured for future Google model activations.
*   **📁 PDF Analysis Service**: Allows uploading and parsing PDF files on the fly utilizing `pdf-parse` v2 class-based processing.
*   **🔐 Custom Authentication & Recovery**:
    *   Secure signup & login using JWT (via `jose` cookies) and salted password hashing.
    *   Email verification and direct password reset flow.
*   **💬 Persistent Chat History**: Session creation, renaming, and persistent database-level deletion (MongoDB Atlas).
*   **🎨 Premium UI/UX**: Dynamic design with clean layout aesthetics, responsive sidebar history list, and custom animations.

---

## 🛠️ Tech Stack

*   **Frontend**: Next.js 16, React 19, Tailwind CSS (v4), Framer Motion, Lucide Icons
*   **Database**: MongoDB (Native driver)
*   **AI/LLM**: OpenRouter API (`openai/gpt-oss-120b:free`), Google Generative AI SDK (`@google/generative-ai`)
*   **Authentication**: JWT (`jose`), custom PBKDF2 cryptography
*   **File Parsing**: `pdf-parse` v2 (configured as a server-side external package)

---

## ⚙️ Setup Instructions

### 1. Prerequisites
Ensure you have **Node.js 18+** installed.

### 2. Environment Configuration
Create a `.env.local` file in the root directory and configure the following variables:

```env
# MongoDB Connection
MONGODB_URI=your_mongodb_connection_string

# Authentication Secrets
JWT_SECRET=your_jwt_signing_secret

# OpenRouter Configuration (Active)
OPENROUTER_API_KEY=your_openrouter_api_key

# Google Generative AI Configuration (SDK Configured)
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Running Locally
Run the development server. Because of a Turbopack spacing limitation on Windows paths, the dev command is pre-configured to build using Webpack:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to view the application.

### 5. Production Build
Ensure code compiles, type checks, and builds successfully:
```bash
npm run build
```

---

## ☁️ Deployment on Vercel

Sonic AI is fully optimized and configured for seamless deployment on Vercel:

1.  Push your code to a Git repository (GitHub/GitLab/Bitbucket).
2.  Import the repository into Vercel.
3.  Add all environment variables (`MONGODB_URI`, `JWT_SECRET`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`) in the **Environment Variables** section of the Vercel project configuration.
4.  Deploy! Vercel will build using the native serverless wrapper.
