from typing import Any

from supabase import create_client, Client

from .config import settings


class _LazySupabaseClient:
    def __init__(self) -> None:
        self._client: Client | None = None

    def _get_client(self) -> Client:
        if self._client is None:
            if not settings.SUPABASE_URL:
                raise RuntimeError("SUPABASE_URL is not configured")
            if not settings.SUPABASE_SERVICE_ROLE_KEY:
                raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY is not configured")

            # Create the admin client only when the app actually needs it.
            self._client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SERVICE_ROLE_KEY,
            )

        return self._client

    def __getattr__(self, name: str) -> Any:
        return getattr(self._get_client(), name)


supabase = _LazySupabaseClient()
