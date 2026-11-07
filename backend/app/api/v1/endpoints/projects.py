import secrets
from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import generate_device_token
from app.models.device import Device, DeviceToken
from app.models.project import Project
from app.models.user import User
from app.schemas.device import DeviceCreate, DeviceResponse, DeviceTokenResponse
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate

router = APIRouter()


@router.get(
    "",
    response_model=List[ProjectResponse],
    summary="List Projects",
    description="Retrieve all projects owned by the authenticated user.",
)
def list_projects(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> List[ProjectResponse]:
    # Query projects with device count
    stmt = (
        select(Project, func.count(Device.id).label("devices_count"))
        .outerjoin(Device, Device.project_id == Project.id)
        .where(Project.owner_id == current_user.id)
        .group_by(Project.id)
        .order_by(Project.created_at.desc())
    )
    results = db.execute(stmt).all()

    response_items = []
    for project, count in results:
        item = ProjectResponse.model_validate(project)
        item.devices_count = count
        response_items.append(item)
    return response_items


@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Project",
)
def create_project(
    payload: ProjectCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ProjectResponse:
    project = Project(
        owner_id=current_user.id,
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        current_metrics_revision=payload.current_metrics_revision,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    res = ProjectResponse.model_validate(project)
    res.devices_count = 0
    return res


@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="Get Project Details",
)
def get_project(
    project_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ProjectResponse:
    stmt = select(Project).where(Project.id == project_id, Project.owner_id == current_user.id)
    project = db.execute(stmt).scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    count_stmt = select(func.count(Device.id)).where(Device.project_id == project.id)
    count = db.execute(count_stmt).scalar() or 0

    res = ProjectResponse.model_validate(project)
    res.devices_count = count
    return res


@router.patch(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="Update Project Metadata",
)
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ProjectResponse:
    stmt = select(Project).where(Project.id == project_id, Project.owner_id == current_user.id)
    project = db.execute(stmt).scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if payload.name is not None:
        project.name = payload.name.strip()
    if payload.description is not None:
        project.description = payload.description.strip()

    db.commit()
    db.refresh(project)

    count_stmt = select(func.count(Device.id)).where(Device.project_id == project.id)
    count = db.execute(count_stmt).scalar() or 0

    res = ProjectResponse.model_validate(project)
    res.devices_count = count
    return res


@router.get(
    "/{project_id}/devices",
    response_model=List[DeviceResponse],
    summary="List Devices in Project",
)
def list_project_devices(
    project_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> List[DeviceResponse]:
    # Check ownership
    proj_stmt = select(Project).where(Project.id == project_id, Project.owner_id == current_user.id)
    project = db.execute(proj_stmt).scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    devices_stmt = (
        select(Device)
        .where(Device.project_id == project_id)
        .order_by(Device.created_at.desc())
    )
    devices = db.execute(devices_stmt).scalars().all()
    results = []
    for d in devices:
        res = DeviceResponse.model_validate(d)
        active_token = next((t for t in d.tokens if t.revoked_at is None), None)
        if active_token:
            res.token = DeviceTokenResponse.model_validate(active_token)
        results.append(res)
    return results


@router.post(
    "/{project_id}/devices",
    response_model=DeviceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Device & Issue Token",
    description="Register a new IoT device under this project and return its initial device token.",
)
def create_project_device(
    project_id: int,
    payload: DeviceCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> DeviceResponse:
    # Check project ownership
    proj_stmt = select(Project).where(Project.id == project_id, Project.owner_id == current_user.id)
    project = db.execute(proj_stmt).scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    # Determine device_code
    code = payload.device_code.strip() if payload.device_code else f"DEV_{secrets.token_hex(4).upper()}"

    # Check device code uniqueness
    existing_code = db.execute(select(Device).where(Device.device_code == code)).scalar_one_or_none()
    if existing_code is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Device code '{code}' is already registered",
        )

    device = Device(
        project_id=project.id,
        device_code=code,
        name=payload.name.strip(),
        interval_seconds=payload.interval_seconds,
        metrics_revision=payload.metrics_revision or project.current_metrics_revision,
        status="active",
    )
    db.add(device)
    db.flush()

    # Generate initial device token
    raw_token, token_hash, token_prefix = generate_device_token()
    token = DeviceToken(
        device_id=device.id,
        token_hash=token_hash,
        token_prefix=token_prefix,
        raw_token=raw_token,
        name="Initial Primary Token",
    )
    db.add(token)
    db.commit()
    db.refresh(device)
    db.refresh(token)

    res = DeviceResponse.model_validate(device)
    token_dto = DeviceTokenResponse.model_validate(token)
    token_dto.raw_token = raw_token  # Returned once for ESP32 configuration
    res.token = token_dto
    return res
