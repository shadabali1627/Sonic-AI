# Sonic AI

Sonic AI is a modern, high-performance AI chat application built with a robust tech stack designed for speed, scalability, and a premium user experience. It features a sleek, responsive frontend and a powerful asynchronous Python backend.

## 🚀 Features

-   **Modern UI/UX**: Built with Next.js 15 and Framer Motion for smooth animations and transitions.
-   **Secure Authentication**:
    -   Email/Password Login & Signup.
    -   Google OAuth Integration.
    -   Secure Session Management with JWT.
    -   Password Reset functionality.
-   **AI Chat Interface**:
    -   Real-time chat interactions.
    -   Markdown support for responses.
    -   Chat history persistence.
    -   "Regenerate" response capability.
-   **Voice Capabilities**: Multi-language speech synthesis and recognition.
-   **Responsive Design**: Fully optimized for Desktop, Tablet, and Mobile.

## 🛠️ Tech Stack

### Frontend
-   **Framework**: [Next.js 16](https://nextjs.org/) (React 19)
-   **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
-   **Components**: Radix UI, Class Variance Authority (Shadcn UI patterns)
-   **Animations**: [Framer Motion](https://www.framer.com/motion/)
-   **State/Forms**: React Hook Form, Zod
-   **Icons**: Lucide React

### Backend
-   **Framework**: [FastAPI](https://fastapi.tiangolo.com/)
-   **Language**: Python 3.10+
-   **Database ODM**: [Beanie](https://beanie-odm.dev/) (Async MongoDB ODM)
-   **Driver**: Motor (AsyncIO)
-   **AI/LLM**: LangChain, Google Gemini API
-   **Testing**: Pytest

### Database
-   **System**: MongoDB (Atlas or Local)

## 📂 Project Structure

```
d:/sonic ai/
├── backend/                # Python FastAPI Backend
│   ├── app/
│   │   ├── core/           # Config, Security, Exceptions
│   │   ├── models/         # Database Models (Beanie)
│   │   ├── routes/         # API Endpoints (Auth, Chat)
│   │   └── main.py         # Entry point
│   └── requirements.txt    # Python dependencies
├── frontend/               # Next.js Frontend
│   ├── src/
│   │   ├── app/            # App Router Pages
│   │   ├── components/     # Reusable UI Components
│   │   └── hooks/          # Custom React Hooks
│   └── package.json        # Node dependencies
├── TESTING.md              # Detailed testing guide
└── README.md               # Project documentation
```

## 🏁 Getting Started

### Prerequisites
-   **Node.js** (v18+ recommended)
-   **Python** (v3.10+ recommended)
-   **MongoDB** (Local instance or Atlas URI)

### 1. Setup Backend

Navigate to the backend directory:
```bash
cd backend
```

Create a virtual environment:
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

Install dependencies:
```bash
pip install -r requirements.txt
```

Create a `.env` file in `backend/` (see `.env.example` if available, or use the following template):
```env
MONGODB_URL=mongodb+srv://<user>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority
DATABASE_NAME=sonic_ai_db
SECRET_KEY=your_secret_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GEMINI_API_KEY=your_gemini_api_key
```

Run the server:
```bash
python -m uvicorn app.main:app --reload --port 8000
```
The API will be available at `http://localhost:8000`. API Docs at `http://localhost:8000/docs`.

### 2. Setup Frontend

Navigate to the frontend directory:
```bash
cd frontend
```

Install dependencies:
```bash
npm install
```

Create a `.env.local` file in `frontend/`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Run the development server:
```bash
npm run dev
```
The application will be available at `http://localhost:3000`.

## 🧪 Testing

For detailed instructions on running backend and frontend tests, please refer to [TESTING.md](./TESTING.md).

## 🤝 Contributing

1.  Fork the repository.
2.  Create a new feature branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes (`git commit -m 'Add some amazing feature'`).
4.  Push to the branch (`git push origin feature/amazing-feature`).
5.  Open a Pull Request.

## 📄 License

[MIT](https://choosealicense.com/licenses/mit/)
