# Sonic AI

<div align="center">
  <h3>The Next Generation of Multimodal Intelligence</h3>
  <p>
    <a href="https://nextjs.org/">
      <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
    </a>
    <a href="https://tailwindcss.com/">
      <img src="https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
    </a>
    <a href="https://fastapi.tiangolo.com/">
      <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
    </a>
    <a href="https://python.org/">
      <img src="https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
    </a>
    <a href="https://mongodb.com/">
      <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
    </a>
  </p>
  <br />
  <a href="https://sonic-ai.theworkpc.com" target="_blank">
    <img src="https://img.shields.io/badge/🚀_View_Live_Demo-000000?style=for-the-badge&logoSize=auto" alt="Live Demo" height="40" />
  </a>
</div>

<br />

Sonic AI is a modern, high-performance AI chat application built designed for speed, scalability, and a premium user experience. It leverages the power of **Google Gemma 3** models to provide multimodal interaction (text and vision) in a sleek interface.

## 📸 Screenshots

<div align="center">
  <img src="docs/screenshots/screenshot-4.png" alt="Chat Interface" width="800" />
  <br/><br/>
  <div style="display: flex; gap: 10px; justify-content: center;">
    <img src="docs/screenshots/screenshot-1.png" alt="Login Screen" width="400" />
    <img src="docs/screenshots/screenshot-3.png" alt="Welcome Screen" width="400" />
  </div>
</div>

## 🚀 Features

-   **🤖 Advanced AI Integration**: Powered by **Google Gemma 3** (Text) and **Gemma 3 Vision** (Image Analysis).
-   **✨ Modern UI/UX**: Built with **Next.js 16**, **Tailwind CSS 4**, and **Framer Motion** for fluid animations.
-   **🔐 Secure & Robust**: Full authentication system (Email/Password, Google OAuth) with secure session management.
-   **💬 Rich Chat Experience**:
    -   Real-time streaming responses with "typewriter" effect.
    -   Markdown rendering for code and rich text.
    -   Chat history with persistence.
    -   Voice capabilities (Speech-to-Text & Text-to-Speech).
-   **📱 Fully Responsive**: Optimized for generic desktop, tablet, and mobile experiences.

## 🛠️ Tech Stack

### Frontend
-   **Framework**: [Next.js 16](https://nextjs.org/) (React 19)
-   **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
-   **Animations**: [Framer Motion](https://www.framer.com/motion/)
-   **State Management**: React Hook Form, Zod

### Backend
-   **Framework**: [FastAPI](https://fastapi.tiangolo.com/)
-   **Language**: Python 3.10+
-   **Database**: [MongoDB](https://www.mongodb.com/) with [Beanie ODM](https://beanie-odm.dev/)
-   **AI Engine**: LangChain & Google Gemini API

## 📂 Project Structure

```bash
sonic-ai/
├── backend/                # Python FastAPI Backend
│   ├── app/
│   │   ├── core/           # Config, Security
│   │   ├── models/         # Database Models
│   │   ├── routes/         # API Endpoints
│   │   └── main.py         # App Entry Point
├── frontend/               # Next.js Frontend
│   ├── src/
│   │   ├── app/            # App Router Pages
│   │   ├── components/     # UI Components
│   │   ├── hooks/          # Custom Hooks
└── docs/                   # Documentation & Assets
```

## 🏁 Getting Started

### Prerequisites
-   **Node.js** (v18+)
-   **Python** (v3.10+)
-   **MongoDB** URI

### Quick Setup

1.  **Clone the repo**
    ```bash
    git clone https://github.com/shadabali1627/Sonic-AI.git
    cd Sonic-AI
    ```

2.  **Setup Backend**
    ```bash
    cd backend
    python -m venv .venv
    source .venv/bin/activate  # Windows: .venv\Scripts\activate
    pip install -r requirements.txt
    python -m uvicorn app.main:app --reload
    ```

3.  **Setup Frontend**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

## 🧪 Testing
See [TESTING.md](./TESTING.md) for details on running tests.

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License
[MIT](https://choosealicense.com/licenses/mit/)
