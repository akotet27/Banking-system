from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from ..dependencies.auth import get_current_user
from ..models.contact import Contact
from ..models.user import User

router = APIRouter(prefix="/contacts", tags=["contacts"])


class ContactCreate(BaseModel):
    contact_phone: str
    label: Optional[str] = None


class ContactOut(BaseModel):
    id: int
    contact_user_id: int
    full_name: Optional[str]
    phone_number: str
    label: Optional[str]

    model_config = {"from_attributes": True}


@router.get("", response_model=list[ContactOut])
def list_contacts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    contacts = (
        db.query(Contact)
        .filter(Contact.owner_id == current_user.id)
        .order_by(Contact.created_at.desc())
        .all()
    )
    result = []
    for c in contacts:
        u = db.query(User).filter(User.id == c.contact_user_id).first()
        if u:
            result.append(ContactOut(
                id=c.id,
                contact_user_id=c.contact_user_id,
                full_name=u.full_name,
                phone_number=u.phone_number,
                label=c.label,
            ))
    return result


@router.post("", response_model=ContactOut, status_code=201)
def save_contact(
    payload: ContactCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    contact_user = db.query(User).filter(User.phone_number == payload.contact_phone).first()
    if not contact_user:
        raise HTTPException(status_code=404, detail="User not found")
    if contact_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot save yourself as a contact")

    existing = (
        db.query(Contact)
        .filter(Contact.owner_id == current_user.id, Contact.contact_user_id == contact_user.id)
        .first()
    )
    if existing:
        if payload.label is not None:
            existing.label = payload.label
            db.commit()
        return ContactOut(
            id=existing.id,
            contact_user_id=contact_user.id,
            full_name=contact_user.full_name,
            phone_number=contact_user.phone_number,
            label=existing.label,
        )

    contact = Contact(
        owner_id=current_user.id,
        contact_user_id=contact_user.id,
        label=payload.label,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return ContactOut(
        id=contact.id,
        contact_user_id=contact_user.id,
        full_name=contact_user.full_name,
        phone_number=contact_user.phone_number,
        label=contact.label,
    )


@router.delete("/{contact_id}", status_code=204)
def delete_contact(
    contact_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    contact = (
        db.query(Contact)
        .filter(Contact.id == contact_id, Contact.owner_id == current_user.id)
        .first()
    )
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    db.delete(contact)
    db.commit()
