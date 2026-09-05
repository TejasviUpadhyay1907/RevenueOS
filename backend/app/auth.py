from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, Dict

router = APIRouter()

# In-memory storage for users
USERS: Dict[str, dict] = {
    "demo@revenueos.in": {
        "email": "demo@revenueos.in",
        "password": "Demo@2025",
        "name": "Tejas",
        "merchant": "Acme Payments Pvt Ltd"
    },
    "admin@revenueos.in": {
        "email": "admin@revenueos.in",
        "password": "Admin@2025",
        "name": "Admin",
        "merchant": "RevenueOS Demo"
    }
}

# Mapping from token to email for quick lookup
TOKEN_TO_EMAIL: Dict[str, str] = {}

def create_token(email: str) -> str:
    if email == "demo@revenueos.in":
        return "demo_jwt_token"
    else:
        # Simple hash: sum of ASCII values of the email
        return f"demo_jwt_{sum(ord(c) for c in email)}"

# Initialize TOKEN_TO_EMAIL for existing users
for email in USERS:
    token = create_token(email)
    TOKEN_TO_EMAIL[token] = email

class UserLogin(BaseModel):
    email: str
    password: str

class UserSignup(BaseModel):
    name: str
    email: str
    password: str
    merchant: str

@router.post("/auth/login")
async def login(user: UserLogin):
    if user.email in USERS and USERS[user.email]["password"] == user.password:
        token = create_token(user.email)
        return {
            "token": token,
            "user": {
                "name": USERS[user.email]["name"],
                "email": USERS[user.email]["email"],
                "merchant": USERS[user.email]["merchant"]
            }
        }
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")

@router.post("/auth/signup")
async def signup(user: UserSignup):
    if user.email in USERS:
        raise HTTPException(status_code=400, detail="Email already registered")
    # Create token for the new user
    token = create_token(user.email)
    # Store the user
    USERS[user.email] = {
        "email": user.email,
        "password": user.password,
        "name": user.name,
        "merchant": user.merchant
    }
    # Update token mapping
    TOKEN_TO_EMAIL[token] = user.email
    return {
        "token": token,
        "user": {
            "name": user.name,
            "email": user.email,
            "merchant": user.merchant
        }
    }

@router.get("/auth/me")
async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authentication scheme")
    token = parts[1]
    if token not in TOKEN_TO_EMAIL:
        raise HTTPException(status_code=401, detail="Invalid token")
    email = TOKEN_TO_EMAIL[token]
    user_data = USERS[email]
    return {
        "name": user_data["name"],
        "email": user_data["email"],
        "merchant": user_data["merchant"]
    }