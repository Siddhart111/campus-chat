# Campus Chat

This repository contains a real-time Expo chat app with a FastAPI backend.

## Backend setup

1. Create `backend/.env` with:
   ```dotenv
   MONGO_URL="<your mongo connection string>"
   DB_NAME="<your database name>"
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT="587"
   SMTP_USER="<your smtp user>"
   SMTP_PASSWORD="<your smtp password>"
   SMTP_FROM_NAME="Campus Chat"
   ```

2. Install backend dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. Run the backend locally:
   ```bash
   cd backend
   uvicorn backend.server:app --host 0.0.0.0 --port 8000
   ```

4. Or use the startup helper:
   ```bash
   cd backend
   ./run.sh
   ```

5. Deploy using a host that supports FastAPI/uvicorn. If you use a platform with a `Procfile`, add this file to the backend directory:
   ```text
   web: uvicorn backend.server:app --host 0.0.0.0 --port ${PORT:-8000}
   ```

## Frontend setup

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. To connect the app to your hosted backend, set:
   - `EXPO_PUBLIC_BACKEND_URL` to your backend origin, for example `https://silent-scholar-2.example.com`

3. Run the Expo app:
   ```bash
   cd frontend
   EXPO_PUBLIC_BACKEND_URL="https://your-backend-host" npm start
   ```

4. On Android or iOS, open the Expo client and the app will use the backend host from `EXPO_PUBLIC_BACKEND_URL`.

## Notes

- The backend already includes a WebSocket endpoint at `/api/ws/{user_id}`.
- The frontend now uses a shared realtime provider so private messages and typing events work consistently across screens.
- For Play Store publishing, build the Expo Android app with EAS and upload the generated APK/AAB to Google Play.
