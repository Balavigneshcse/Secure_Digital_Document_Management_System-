import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import SessionLocal
from app.models.user import User, RoleEnum
from app.core.security import get_password_hash

async def create_admin():
    async with SessionLocal() as db:
        email = "balavigneshcse@gmail.com"
        # Check if exists
        from sqlalchemy import select
        stmt = select(User).where(User.email == email)
        result = await db.execute(stmt)
        if result.scalar_one_or_none():
            print("Admin user already exists")
            return
            
        hashed_password = get_password_hash("Bala@cse")
        admin_user = User(
            email=email,
            full_name="Balavignesh",
            hashed_password=hashed_password,
            role=RoleEnum.ADMIN
        )
        db.add(admin_user)
        await db.commit()
        print("Admin user created successfully!")

if __name__ == "__main__":
    asyncio.run(create_admin())
