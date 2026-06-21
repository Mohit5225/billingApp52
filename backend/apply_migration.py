import os
import psycopg2
from urllib.parse import urlparse
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in environment variables.")

# Handle Supabase pooler URL translation if needed
if "pooler.supabase.com" in DATABASE_URL:
    print("Using pooled connection...")

def apply_migration(filepath: str):
    print(f"Applying migration from {filepath}...")
    with open(filepath, "r") as f:
        sql = f.read()

    try:
        with psycopg2.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute(sql)
                conn.commit()
                print("Migration applied successfully.")
    except Exception as e:
        print(f"Error applying migration: {e}")

if __name__ == "__main__":
    import sys
    script_dir = os.path.dirname(os.path.abspath(__file__))
    migration_filename = sys.argv[1] if len(sys.argv) > 1 else "03_manual_matches.sql"
    migration_file = os.path.join(script_dir, migration_filename)
    if not os.path.exists(migration_file):
        print(f"File not found: {migration_file}")
    else:
        apply_migration(migration_file)
