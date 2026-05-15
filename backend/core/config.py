import os
from dotenv import load_dotenv

# Load environment variables when the app starts
load_dotenv()

class Settings:
    """Application settings, loaded from environment variables."""
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

settings = Settings()
