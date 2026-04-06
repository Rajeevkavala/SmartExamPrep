#!/usr/bin/env python
"""
Clear all data from the PostgreSQL database.

WARNING: This script DELETES all data from all tables.
Use with caution!
"""

import sys
from sqlalchemy import text

from config import settings
from database import engine
from models.models import Base


def clear_database():
    """Drop all tables and recreate them (preserves schema, clears data)."""
    print("⚠️  WARNING: About to delete ALL data from the database!")
    print(f"Database: {settings.database_url}")
    
    # Safety confirmation
    response = input("\nType 'DELETE ALL' to confirm: ").strip()
    if response != "DELETE ALL":
        print("❌ Cancelled. No data was deleted.")
        sys.exit(0)
    
    try:
        print("\n🔄 Dropping all tables...")
        Base.metadata.drop_all(engine)
        print("✅ All tables dropped successfully!")
        
        print("\n🔄 Recreating all tables (empty schema)...")
        Base.metadata.create_all(engine)
        print("✅ All tables recreated successfully!")
        
        print("\n✨ Database is now empty and ready for fresh data!")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)


def truncate_tables_preserve_schema():
    """
    Alternative: Truncate all tables while preserving schema.
    This approach uses TRUNCATE CASCADE which is faster but requires careful ordering.
    """
    print("⚠️  WARNING: About to TRUNCATE ALL data from all tables!")
    print(f"Database: {settings.database_url}")
    
    response = input("\nType 'DELETE ALL' to confirm: ").strip()
    if response != "DELETE ALL":
        print("❌ Cancelled. No data was deleted.")
        sys.exit(0)
    
    try:
        with engine.connect() as conn:
            # Disable foreign key constraints temporarily
            print("\n🔄 Disabling foreign key constraints...")
            conn.execute(text("SET session_replication_role = 'replica'"))
            
            # Get all table names from information_schema
            print("🔄 Truncating all tables...")
            result = conn.execute(text(
                """
                SELECT tablename 
                FROM pg_tables 
                WHERE schemaname = 'public'
                AND tablename NOT LIKE 'pg_%'
                AND tablename NOT LIKE 'sql_%'
                """
            ))
            
            tables = [row[0] for row in result]
            print(f"Found {len(tables)} tables to truncate: {', '.join(tables)}")
            
            for table in tables:
                try:
                    conn.execute(text(f"TRUNCATE TABLE {table} CASCADE"))
                    print(f"  ✅ Truncated: {table}")
                except Exception as e:
                    print(f"  ⚠️  Could not truncate {table}: {e}")
            
            # Re-enable foreign key constraints
            print("\n🔄 Re-enabling foreign key constraints...")
            conn.execute(text("SET session_replication_role = 'origin'"))
            conn.commit()
            
        print("\n✨ All tables have been truncated!")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Clear PostgreSQL database")
    parser.add_argument(
        "--method",
        choices=["drop", "truncate"],
        default="drop",
        help="Method to clear data (default: drop)"
    )
    parser.add_argument(
        "--no-confirm",
        action="store_true",
        help="Skip confirmation prompt (DANGEROUS!)"
    )
    
    args = parser.parse_args()
    
    if args.method == "truncate":
        truncate_tables_preserve_schema()
    else:
        clear_database()
