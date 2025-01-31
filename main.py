from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
import asyncpg
from passlib.context import CryptContext
import jwt
import datetime
from fastapi.middleware.cors import CORSMiddleware
import json
from dotenv import load_dotenv
import os

app = FastAPI()
load_dotenv()

#Fix CORS Issue - Allow Requests from React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React frontend
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

# Database Connection
DATABASE_URL = os.getenv("DATABASE_URL")

async def connect_db():
    return await asyncpg.create_pool(DATABASE_URL)

# Password Hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Secret Key
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")

# OAuth2 scheme for authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# User models
class UserSignup(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

# ✅ JWT Token Generation
def create_jwt_token(data: dict):
    expire = datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    data.update({"exp": expire})
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

# ✅ 1️⃣ User Signup
@app.post("/signup/")
async def signup(user: UserSignup):
    async with await connect_db() as pool:
        async with pool.acquire() as conn:
            existing_user = await conn.fetchval("SELECT id FROM users WHERE username=$1", user.username)
            if existing_user:
                raise HTTPException(status_code=400, detail="Username already taken")
            
            hashed_password = pwd_context.hash(user.password)
            user_id = await conn.fetchval(
                "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id",
                user.username, hashed_password
            )
            return {"id": user_id, "username": user.username, "message": "User registered successfully"}

# ✅ 2️⃣ User Login (Token Generation)
@app.post("/token/")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    async with await connect_db() as pool:
        async with pool.acquire() as conn:
            user = await conn.fetchrow("SELECT id, username, password FROM users WHERE username=$1", form_data.username)
            if not user or not pwd_context.verify(form_data.password, user["password"]):
                raise HTTPException(status_code=401, detail="Invalid username or password")
            
            token = create_jwt_token({"sub": user["username"]})
            return {"access_token": token, "token_type": "bearer"}

# ✅ 3️⃣ Protected Route (Check Authentication)
@app.get("/me/")
async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        return {"username": username}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ✅ 4️⃣ Secure WebSocket Connection (Authenticate Users)
class ConnectionManager:
    def __init__(self):
        self.active_connections = {}

    async def connect(self, websocket: WebSocket, username: str):
        await websocket.accept()
        self.active_connections[username] = websocket

    def disconnect(self, username: str):
        if username in self.active_connections:
            del self.active_connections[username]

    async def send_message(self, sender: str, message: str):
        json_message = {"sender": sender, "text": message}  # ✅ Ensure correct JSON format
        for conn in self.active_connections.values():
            await conn.send_json(json_message)  # ✅ Send as JSON, not string

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close()
        return

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
    except jwt.ExpiredSignatureError:
        await websocket.close()
    except jwt.InvalidTokenError:
        await websocket.close()

    await manager.connect(websocket, username)
    try:
        while True:
            raw_message = await websocket.receive_text()  # ✅ Receive raw text
            try:
                message_data = json.loads(raw_message)  # ✅ Parse JSON safely
                message_text = message_data.get("text", "")  # ✅ Extract text
            except json.JSONDecodeError:
                message_text = raw_message  # Fallback for non-JSON messages

            await manager.send_message(username, message_text)  # ✅ Send only message text
    except WebSocketDisconnect:
        manager.disconnect(username)


# ✅ 5️⃣ Check Database Connection
@app.get("/ping_db")
async def ping_db():
    try:
        pool = await connect_db()
        async with pool.acquire() as conn:
            await conn.execute("SELECT 1")
        return {"status": "Connected to Supabase DB"}
    except Exception as e:
        return {"error": str(e)}
