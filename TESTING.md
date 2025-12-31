# Sonic AI Testing Documentation

This document outlines the testing strategy, procedures, and tools used for the Sonic AI application.

## Testing Strategy

We employ a multi-layered testing strategy to ensure the reliability and robustness of the application:
1.  **Unit Testing**: Testing individual functions and components in isolation.
2.  **Integration Testing**: Testing the interaction between different modules (e.g., API endpoints).
3.  **End-to-End (E2E) Testing**: Testing the complete user flow from frontend to backend.
4.  **Manual Testing**: Verified by human review for UI/UX and complex scenarios.

## Backend Testing

The backend is built with FastAPI and tested using `pytest`.

### Prerequisites
- Python installed
- Virtual environment activated (`.venv`)
- Dependencies installed: `pip install -r backend/requirements.txt` (ensure `pytest` and `httpx` are included)

### Running Tests
To run all backend tests, navigate to the `backend` directory (or root) and run:
```bash
pytest
```

To run a specific test file:
```bash
pytest backend/tests/test_filename.py
```

### Key Test Areas
- **Authentication**: Signup, Login, Token generation/validation.
- **API Endpoints**: Request validation, response format, error handling.
- **Database**: CRUD operations (using a test database if configured).

## Frontend Testing

The frontend is built with Next.js/React and tested using `vitest` (for unit/component tests) and potentially `Playwright`/`Cypress` for E2E.

### Prerequisites
- Node.js installed
- Dependencies installed: `npm install`

### Running Unit Tests
To run frontend unit tests:
```bash
npm run test
# or
npx vitest
```

### Key Test Areas
- **Components**: Rendering, props, event handling.
- **Hooks**: Custom logic and state management.
- **Utils**: Helper functions.

## Manual Testing Checklist

Before specific releases or merges, verify the following manually:

### Authentication Flow
- [ ] User can sign up with valid credentials.
- [ ] User cannot sign up with existing email.
- [ ] User can log in.
- [ ] User is redirected to dashboard after login.
- [ ] Logout functions correctly.

### Chat Functionality
- [ ] Messages can be sent and received.
- [ ] History loads correctly.
- [ ] Real-time updates work (if applicable).

### UI/UX
- [ ] Responsive design works on Mobile/Tablet/Desktop.
- [ ] Theme switching (Dark/Light) works.
- [ ] No visual regressions.

## Troubleshooting

- **Database Connection Issues**: Ensure the local DB is running or the connection string in `.env` is correct.
- **Port Conflicts**: Ensure ports 8000 (Backend) and 3000 (Frontend) are free.
- **Dependency Errors**: Try deleting `node_modules` or `.venv` and reinstalling.
