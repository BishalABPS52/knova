from pydantic import BaseModel


class RegisterRequest(BaseModel):
    email: str
    password: str
    username: str
    
    
class LoginRequest(BaseModel):
    email: str
    password: str
    
class UserRequest(BaseModel):
    email: str
    username: str