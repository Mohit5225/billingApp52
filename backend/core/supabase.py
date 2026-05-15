from supabase import create_client, Client
from .config import settings

# --- Global admin client, created once at startup ---
# Using SERVICE_ROLE_KEY allows the backend to perform admin tasks 
# while still enforcing RLS via .auth(jwt) when querying.
supabase: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_ROLE_KEY
)
