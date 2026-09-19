from fastapi import HTTPException, status
from typing import List
from app.models.user import RoleEnum

# Role Hierarchy Map
ROLE_HIERARCHY = {
    RoleEnum.ADMIN: 100,
    RoleEnum.OFFICER: 80,
    RoleEnum.INVESTIGATOR: 60,
    RoleEnum.LEGAL: 40,
    RoleEnum.VIEWER: 20,
}

def verify_role(user_role: RoleEnum, min_required_role: RoleEnum) -> bool:
    """Check if the user's role has sufficient privileges based on hierarchy."""
    user_level = ROLE_HIERARCHY.get(user_role, 0)
    required_level = ROLE_HIERARCHY.get(min_required_role, 100)
    return user_level >= required_level

class RoleChecker:
    def __init__(self, min_role: RoleEnum):
        self.min_role = min_role

    def __call__(self, user_role: RoleEnum) -> bool:
        if not verify_role(user_role, self.min_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action."
            )
        return True
