from pydantic import BaseModel, EmailStr, Field

class UserCreate(BaseModel):
    email: str
    password: str = Field(..., min_length=8)
    username: str | None = None

class UserLogin(BaseModel):
    username: str
    password: str # Can act as password for OAuth2PasswordRequestForm compatibility if needed, or standalone

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str | None = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)

class DirectResetRequest(BaseModel):
    email: EmailStr
    new_password: str = Field(..., min_length=8)
