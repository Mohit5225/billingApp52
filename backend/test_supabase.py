import asyncio
from core.supabase import supabase

async def main():
    print("Testing maybe_single().execute() with no rows")
    try:
        res = supabase.table("profiles").select("id").eq("id", "00000000-0000-0000-0000-000000000000").maybe_single().execute()
        print("Result type:", type(res))
        print("Result:", res)
        if res is None:
            print("res is None!")
        else:
            print("res.data:", res.data)
    except Exception as e:
        print("Exception:", str(e))

asyncio.run(main())
