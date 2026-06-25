"""
Wipes all non-admin user data so the app starts fresh.
Run from Banking-system/ directory:
    .venv/Scripts/python -m backend.reset_db
"""
import sqlite3, os

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ishimwe_bank.db"))

TABLES_TO_CLEAR = [
    "session_audit_logs",
    "cash_out_sessions",
    "otp_codes",
    "kyc_requests",
    "agent_applications",
    "merchant_applications",
    "transactions",
    "wallets",
]

def main():
    print(f"Database: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute("PRAGMA foreign_keys = OFF")

    # Clear all supporting tables
    for table in TABLES_TO_CLEAR:
        try:
            cur.execute(f"DELETE FROM {table}")
            print(f"  Cleared: {table} ({cur.rowcount} rows)")
        except sqlite3.OperationalError as e:
            print(f"  Skip {table}: {e}")

    # Delete all non-admin users
    cur.execute("DELETE FROM users WHERE role != 'admin'")
    print(f"  Deleted non-admin users: {cur.rowcount} rows")

    # Re-create admin wallet if missing
    cur.execute("SELECT id FROM users WHERE role = 'admin'")
    admin = cur.fetchone()
    if admin:
        cur.execute("SELECT id FROM wallets WHERE user_id = ?", (admin[0],))
        if not cur.fetchone():
            cur.execute("INSERT INTO wallets (user_id, balance, float_balance) VALUES (?, 0, 0)", (admin[0],))
            print("  Re-created admin wallet")

    cur.execute("PRAGMA foreign_keys = ON")
    conn.commit()
    conn.close()
    print("\nDatabase reset complete. Admin account preserved.")

if __name__ == "__main__":
    main()
