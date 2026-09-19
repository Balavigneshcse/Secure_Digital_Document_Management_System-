import asyncio
from app.db.session import SessionLocal
from app.models.user import User, RoleEnum
from app.core.security import get_password_hash

async def create_admin():
    async with SessionLocal() as session:
        # Check if exists
        from sqlalchemy import select
        result = await session.execute(select(User).where(User.email == "balavigneshcse@gmail.com"))
        user = result.scalars().first()
        if not user:
            admin_user = User(
                email="balavigneshcse@gmail.com",
                hashed_password=get_password_hash("Bala@cse"),
                full_name="Balavignesh Admin",
                role=RoleEnum.ADMIN,
                is_active=True
            )
            session.add(admin_user)
            await session.commit()
            print("Admin user created successfully!")
        else:
            print("Admin user already exists. Updating password just in case...")
            user.hashed_password = get_password_hash("Bala@cse")
            await session.commit()
            print("Password updated.")

if __name__ == "__main__":
    asyncio.run(create_admin())
