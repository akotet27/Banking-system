"""
Adds new columns to existing tables without data loss.

Run from Banking-system/ directory:
    .venv/Scripts/python -m backend.migrate_add_columns
"""

import sqlite3
import os

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ishimwe_bank.db"))


def column_exists(cursor, table, column):
    cursor.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cursor.fetchall())


def main():
    print(f"Database: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    added = []

    migrations = [
        ("users",        "full_name",     "TEXT"),
        ("users",        "date_of_birth", "TEXT"),
        ("users",        "location",      "TEXT"),
        ("users",        "access_code",   "TEXT"),
        ("kyc_requests", "document_file", "TEXT"),
    ]

    for table, col, definition in migrations:
        if not column_exists(cur, table, col):
            cur.execute(f"ALTER TABLE {table} ADD COLUMN {col} {definition}")
            added.append(f"{table}.{col}")
            print(f"  Added: {table}.{col}")
        else:
            print(f"  Already exists: {table}.{col}")

    conn.commit()
    conn.close()

    if added:
        print(f"\nMigration complete. Added {len(added)} column(s).")
        print("Restart uvicorn to pick up the changes (if running).")
    else:
        print("\nNothing to do — all columns already present.")


if __name__ == "__main__":
    main()
