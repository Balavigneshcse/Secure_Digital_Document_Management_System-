import asyncio
import asyncpg

async def main():
    try:
        conn = await asyncpg.connect('postgresql://postgres:postgres@localhost:5432/sentineldms')
        await conn.execute('CREATE EXTENSION IF NOT EXISTS vector;')
        print("Success: pgvector extension created")
        await conn.close()
    except Exception as e:
        print(f"Failed to create pgvector extension: {e}")

if __name__ == "__main__":
    asyncio.run(main())
