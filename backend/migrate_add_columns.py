"""
Adds the three new columns to the existing users table without data loss.

Run from Banking-system/ directory:
    .venv/Scripts/python -m backend.migrate_add_columns
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "ishimwe_bank.db")
DB_PATH = os.path.abspath(DB_PATH)


def column_exists(cursor, table, column):
    cursor.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cursor.fetchall())


def main():
    print(f"Database: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    added = []
    for col, definition in [
        ("full_name",     "TEXT"),
        ("date_of_birth", "TEXT"),
        ("location",      "TEXT"),
        ("access_code",   "TEXT"),
    ]:
        if not column_exists(cur, "users", col):
            cur.execute(f"ALTER TABLE users ADD COLUMN {col} {definition}")
            added.append(col)
            print(f"  Added column: {col}")
        else:
            print(f"  Already exists: {col}")

    conn.commit()
    conn.close()

    if added:
        print(f"\nMigration complete. Added {len(added)} column(s).")
        print("Restart uvicorn to pick up the changes (if running).")
    else:
        print("\nNothing to do — all columns already present.")


if __name__ == "__main__":
    main()
