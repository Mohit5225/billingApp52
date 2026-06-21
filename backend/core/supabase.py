from typing import Any

from supabase import AsyncClient, create_async_client

from .config import settings


class _LazyAsyncSupabaseClient:
    def __init__(self) -> None:
        self._client: AsyncClient | None = None

    async def _get_client(self) -> AsyncClient:
        if self._client is None:
            if not settings.SUPABASE_URL:
                raise RuntimeError("SUPABASE_URL is not configured")
            if not settings.SUPABASE_SERVICE_ROLE_KEY:
                raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY is not configured")

            self._client = await create_async_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SERVICE_ROLE_KEY,
            )

        return self._client

    def __getattr__(self, name: str) -> Any:
        raise AttributeError(
            f"Cannot access '{name}' directly on the lazy async client. "
            "Use 'await supabase._get_client()' or call 'get_supabase()' first."
        )


# Module-level singleton – must be initialised via get_supabase() inside an async context.
_lazy_supabase = _LazyAsyncSupabaseClient()


async def get_supabase() -> AsyncClient:
    """Return the initialised AsyncClient. Call this from every async function that needs DB access."""
    return await _lazy_supabase._get_client()
