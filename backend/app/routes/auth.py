from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from backend.app.models.user import User
from backend.app.models.auth_models import UserCreate, Token, TokenData, ForgotPasswordRequest, ResetPasswordRequest, DirectResetRequest
from backend.app.core.security import create_access_token, hash_password_manual, verify_password
from backend.app.core.config import settings
from jose import jwt, JWTError
from typing import Annotated
import uuid
import httpx

router = APIRouter()
print("LOADING AUTH.PY")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    
    # Try finding by username first, fallback (though sub is usually username)
    user = await User.find_one(User.username == token_data.username)
    if user is None:
        raise credentials_exception
    return user

@router.post("/test")
async def test_endpoint():
    print("TEST ENDPOINT CALLED")
    return {"message": "ok"}

@router.post("/register", response_model=Token)
async def register(user_in: UserCreate):
    print("REGISTER FUNCTION ENTRY")
    # Check if email exists
    user_exists = await User.find_one(User.email == user_in.email)
    if user_exists:
        raise HTTPException(
            status_code=400,
            detail="User with this email already exists"
        )
    
    # Auto-generate username if not provided
    if not user_in.username:
        # Generate a unique username from email prefix + random string
        base_name = user_in.email.split("@")[0]
        random_suffix = str(uuid.uuid4())[:4]
        final_username = f"{base_name}_{random_suffix}"
    else:
        final_username = user_in.username
        # Check if provided username exists
        username_exists = await User.find_one(User.username == final_username)
        if username_exists:
            raise HTTPException(
                status_code=400,
                detail="User with this username already exists"
            )

    print("REGISTER FUNCTION CALLED")
    try:
        hashed_password = hash_password_manual(user_in.password)
        new_user = User(
            email=user_in.email,
            username=final_username,
            hashed_password=hashed_password
        )
        await new_user.insert()
    except Exception as e:
        print(f"CRITICAL REGISTRATION ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise e
    
    access_token = create_access_token(subject=new_user.username)
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
async def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    # Allow login with either email or username
    # form_data.username contains the input string from the 'username' field 
    
    user = await User.find_one(User.email == form_data.username)
    if not user:
        user = await User.find_one(User.username == form_data.username)
        
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(subject=user.username)
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/google/login")
async def google_login(action: str = "login"):
    """
    Redirects the user to the Google OAuth login page.
    action: 'login' or 'signup' to distinguish context.
    """
    
    # Check if Client ID is configured, else warn
    if not settings.GOOGLE_CLIENT_ID:
        return {"error": "Google Client ID not configured on backend."}

    # IMPORTANT: The redirect_uri must be absolute (http://localhost:8000...) for Google to accept it, 
    # unless you have a proxy. 
    # Let's construct standard localhost URL for dev if not set in env?
    # Ideally, redirection should be handled by Frontend generating the link, 
    # OR Backend generating the link.
    # Let's assume the backend constructs the full URL for the user to visit.
    
    base_url = "http://localhost:8000" # TODO: Make this configurable
    redirect_uri = f"{base_url}{settings.API_V1_STR}/auth/google/callback"
    
    # We pass 'action' as the 'state' parameter to Google to persist it through the flow
    auth_url = (
         "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={settings.GOOGLE_CLIENT_ID}"
        f"&response_type=code"
        f"&redirect_uri={redirect_uri}"
        "&scope=openid%20email%20profile"
        f"&state={action}"
    )
    
    return RedirectResponse(auth_url)

@router.get("/google/callback")
async def google_callback(code: str, state: str = "login"):
    """Exchanges the authorization code for an ID token and logs the user in."""
    
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
         raise HTTPException(status_code=500, detail="Google Credentials not configured.")

    base_url = "http://localhost:8000" # TODO: Make this configurable
    redirect_uri = f"{base_url}{settings.API_V1_STR}/auth/google/callback"

    token_url = "https://oauth2.googleapis.com/token"
    # Note: 'state' param is not sent to token endpoint, it's just passed back to us by Google.
    
    data = {
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }
    
    async with httpx.AsyncClient() as client:
        # 1. Exchange Code for Token
        token_response = await client.post(token_url, data=data)
        if token_response.status_code != 200:
             raise HTTPException(status_code=400, detail=f"Google Token Exchange Failed: {token_response.text}")
        
        token_json = token_response.json()
        access_token = token_json.get("access_token")
        
        # 2. Get User Info
        user_info_response = await client.get("https://www.googleapis.com/oauth2/v2/userinfo", headers={"Authorization": f"Bearer {access_token}"})
        if user_info_response.status_code != 200:
             raise HTTPException(status_code=400, detail="Failed to get Google User Info")
             
        user_info = user_info_response.json()
        email = user_info.get("email")
        
        if not email:
             raise HTTPException(status_code=400, detail="Google account has no email.")

    # 3. Find or Create User
    user = await User.find_one(User.email == email)
    
    if user:
         # User exists. Check if we are in "signup" mode.
        if state == "signup":
            # REJECT: User already exists, cannot sign up again.
            return RedirectResponse(
                url=f"http://localhost:3000/callback?error=User with this email already exists"
                # Alternatively, we could auto-login but show a message?
                # User asked: "it show the message" when "again sign up"
                # So error is appropriate.
            )
    else:
        # User does not exist.
        # Create new user
        # Generate random password (user won't know it, they use Google)
        import secrets
        random_password = secrets.token_urlsafe(16)
        hashed_password = hash_password_manual(random_password)
        
        # Username from email
        base_name = email.split("@")[0]
        # Ensure unique username
        random_suffix = str(uuid.uuid4())[:4]
        final_username = f"{base_name}_{random_suffix}"
        
        new_user = User(
            email=email,
            username=final_username,
            hashed_password=hashed_password
        )
        await new_user.insert()
        user = new_user
    
    # 4. Create Session Token
    access_token = create_access_token(subject=user.username)
    
    # 5. Redirect to Frontend with Token
    # Assuming Frontend runs on localhost:3000
    frontend_url = f"http://localhost:3000/callback?token={access_token}"
    return RedirectResponse(url=frontend_url)

@router.get("/github/login")
async def github_login():
    return {"message": "GitHub Login Placeholder - Requires Client ID/Secret"}

@router.get("/me", response_model=User)
async def read_users_me(current_user: Annotated[User, Depends(get_current_user)]):
    return current_user

@router.get("/github/callback")
async def github_callback(code: str):
    return {"message": "GitHub Callback Placeholder", "code": code}

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    user = await User.find_one(User.email == request.email)
    if not user:
        # We generally shouldn't reveal if user exists, but for this simpler app -> 404
        # Or return 200 with "If account exists, email sent."
        raise HTTPException(status_code=404, detail="User not found")

    # Generate Token
    reset_token = str(uuid.uuid4())
    user.reset_token = reset_token
    user.reset_token_expire = datetime.utcnow() + timedelta(minutes=15)
    await user.save()

    # Send Email (Dev Mode: Print to Console)
    reset_link = f"http://localhost:3000/reset-password?token={reset_token}"
    
    print("\n" + "="*50)
    print(f"PASSWORD RESET REQUEST FOR: {user.email}")
    print(f"RESET LINK: {reset_link}")
    print("="*50 + "\n")

    return {"message": "Password reset link has been sent to your email (check server console for Dev Mode)."}

@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    user = await User.find_one(User.reset_token == request.token)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid token")

    if user.reset_token_expire < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Token expired")

    # Reset Password
    user.hashed_password = hash_password_manual(request.new_password)
    user.reset_token = None
    user.reset_token_expire = None
    await user.save()

    return {"message": "Password successfully updated. You can now log in."}

@router.post("/reset-password-direct")
async def reset_password_direct(request: DirectResetRequest):
    """
    INSECURE: Updates password directly for the given email.
    For Dev/Demo purposes only as requested. 
    """
    user = await User.find_one(User.email == request.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = hash_password_manual(request.new_password)
    # Clear any pending reset tokens just in case
    user.reset_token = None
    user.reset_token_expire = None
    await user.save()

    return {"message": "Password updated successfully."}
