from pydantic import BaseModel


class RegisterRequest(BaseModel):
    email: str
    password_hash: str | None = None
    username: str
    
    
class LoginRequest(BaseModel):
    email: str
    password_hash: str | None = None
    
