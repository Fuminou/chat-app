from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, UploadFile, File, Form
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
from fastapi.staticfiles import StaticFiles
import shutil
from datetime import datetime


app = FastAPI()
load_dotenv()

# Database Connection
DATABASE_URL = os.getenv("DATABASE_URL")

# Directory to store uploaded images
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Serve uploaded images
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


#Fix CORS Issue - Allow Requests from React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  #Allow React frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
db_pool = None

async def connect_db():
    global db_pool

    # If pool is already open, return it
    if db_pool and not db_pool._closed:
        return db_pool  

    print("🔄 Reconnecting to the database...")

    try:
        load_dotenv()
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            print("❌ ERROR: DATABASE_URL is missing or not loaded!")
            return None

        # Create new connection pool
        db_pool = await asyncpg.create_pool(database_url, min_size=1, max_size=5, timeout=10)
        print("✅ Database connection established!")
        return db_pool

    except Exception as e:
        print(f"❌ Database connection error: {e}")
        db_pool = None  # Ensure the variable is reset to None
        return None

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

class UserProfileUpdate(BaseModel):
    username: str
    profile_picture: str  # URL of the profile picture
    bio: str


#JWT Token Generation
def create_jwt_token(data: dict):
    expire = datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    data.update({"exp": expire})
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

#User Signup
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

#User Login (Token Generation)
@app.post("/token/")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    pool = await connect_db()
    if not pool:
        raise HTTPException(status_code=500, detail="Database connection failed")  # ✅ Prevents crashes

    async with pool.acquire() as conn:
        user = await conn.fetchrow("SELECT id, username, password FROM users WHERE username=$1", form_data.username)
        if not user or not pwd_context.verify(form_data.password, user["password"]):
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        token = create_jwt_token({"sub": user["username"]})
        return {"access_token": token, "token_type": "bearer"}


#Protected Route (Check Authentication)
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

#Secure WebSocket Connection (Authenticate Users)
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
        json_message = {"sender": sender, "text": message}  #Ensure correct JSON format
        for conn in self.active_connections.values():
            await conn.send_json(json_message)  #Send as JSON, not string

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
            raw_message = await websocket.receive_text()  #Receive raw text
            try:
                message_data = json.loads(raw_message)  #Parse JSON safely
                message_text = message_data.get("text", "")  #Extract text
            except json.JSONDecodeError:
                message_text = raw_message  #Fallback for non-JSON messages

            await manager.send_message(username, message_text)  #Send only message text
    except WebSocketDisconnect:
        manager.disconnect(username)


#Check Database Connection
@app.get("/ping_db")
async def ping_db():
    pool = await connect_db()
    if not pool:
        return {"status": "❌ Database connection failed!"}
    return {"status": "✅ Database is connected!"}

    
# Fetch User Profile
@app.get("/get_user_profile/")
async def get_user_profile(username: str):
    pool = await connect_db()

    if not pool:
        print("❌ Database pool is unavailable!")
        raise HTTPException(status_code=500, detail="Database connection failed")

    try:
        async with pool.acquire() as conn:
            user_profile = await conn.fetchrow("SELECT profile_picture, bio FROM users WHERE username=$1", username)

            if user_profile:
                print(f"✅ Fetched profile for {username}: {user_profile}")
                return {
                    "profile_picture": user_profile["profile_picture"] or "",
                    "bio": user_profile["bio"] or ""
                }
            else:
                raise HTTPException(status_code=404, detail="User not found")

    except asyncpg.exceptions.InterfaceError as e:
        print(f"❌ Database connection lost while fetching {username}: {e}")
        raise HTTPException(status_code=500, detail="Database connection lost. Please try again.")

    except Exception as e:
        print(f"❌ Error fetching profile for {username}: {e}")
        raise HTTPException(status_code=500, detail="Error fetching user profile")



# Update Profile
@app.post("/update_profile/")
async def update_profile(data: dict):
    async with await connect_db() as pool:
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE users SET bio=$1 WHERE username=$2",
                data["bio"], data["username"]
            )
            return {"message": "Profile updated"}
        
# Upload Profile Picture
@app.post("/upload_profile_picture/")
async def upload_profile_picture(username: str = Form(...), file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_url = f"http://localhost:8000/uploads/{file.filename}"
    print(f"✅ Saving profile picture for {username}: {file_url}")  # ✅ Debug output

    async with await connect_db() as pool:
        async with pool.acquire() as conn:
            await conn.execute("UPDATE users SET profile_picture=$1 WHERE username=$2", file_url, username)

    return {"profile_picture_url": file_url}

#Send Message (Save to Database)
@app.post("/send_message/")
async def send_message(data: dict):
    async with await connect_db() as pool:
        async with pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO messages (sender, text, timestamp) VALUES ($1, $2, NOW())",
                data["sender"], data["text"]
            )
    return {"message": "Message saved"}


#Get Messages (Load from Database)
@app.get("/get_messages/")
async def get_messages():
    async with await connect_db() as pool:
        async with pool.acquire() as conn:
            rows = await conn.fetch("SELECT sender, text, timestamp FROM messages ORDER BY timestamp ASC")
            return [
                {
                    "sender": row["sender"],
                    "text": row["text"],
                    "timestamp": row["timestamp"].strftime("%Y-%m-%d %H:%M:%S")  # Format timestamp properly
                }
                for row in rows
            ]
