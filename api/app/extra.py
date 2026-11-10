"""Пуш-уведомления, проверка мастеров (Didit + документы), автоперевод чата, профили из Telegram (забрать/удалить), источники сборщика."""
import base64
import json
import os
import secrets
import threading
import urllib.request
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, delete
from sqlalchemy.orm import Session

from . import models as m, ai
from .db import get_db, SessionLocal
from .account import need_user, need_admin, current_user, my_master, conv_access, UPLOADS, SITE

router = APIRouter(prefix="/api/v1")

# ---------------- Web Push (VAPID) ----------------
VAPID_FILE = os.path.join(UPLOADS, "vapid.json")


def _vapid():
    if os.path.exists(VAPID_FILE):
        return json.load(open(VAPID_FILE))
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import ec
    key = ec.generate_private_key(ec.SECP256R1())
    priv = key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()).decode()
    pub = key.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    data = {"private_pem": priv, "public": base64.urlsafe_b64encode(pub).decode().rstrip("=")}
    json.dump(data, open(VAPID_FILE, "w"))
    return data


@router.get("/push/key")
def push_key():
    return {"key": _vapid()["public"]}


class SubIn(BaseModel):
    endpoint: str = Field(min_length=10, max_length=2000)
    keys: dict


@router.post("/me/push")
def push_sub(body: SubIn, u: m.User = Depends(need_user), db: Session = Depends(get_db)):
    s = db.scalar(select(m.PushSub).where(m.PushSub.endpoint == body.endpoint))
    if not s:
        s = m.PushSub(endpoint=body.endpoint, user_id=u.id, p256dh=body.keys.get("p256dh", ""), auth=body.keys.get("auth", ""))
        db.add(s)
    else:
        s.user_id = u.id
    db.commit()
    return {"ok": True}


def _push_send(user_id: int, title: str, body: str, url: str):
    try:
        from pywebpush import webpush, WebPushException
    except Exception:
        return
    v = _vapid()
    pem_path = os.path.join(UPLOADS, "vapid_private.pem")
    if not os.path.exists(pem_path):
        open(pem_path, "w").write(v["private_pem"])
    with SessionLocal() as db:
        for s in db.scalars(select(m.PushSub).where(m.PushSub.user_id == user_id)):
            try:
                webpush({"endpoint": s.endpoint, "keys": {"p256dh": s.p256dh, "auth": s.auth}},
                        json.dumps({"title": title, "body": body, "url": url}), vapid_private_key=pem_path,
                        vapid_claims={"sub": "mailto:admin@kront.rs"}, ttl=3600)
            except WebPushException as e:
                if getattr(e, "response", None) is not None and e.response.status_code in (404, 410):
                    db.delete(s)
            except Exception:
                pass
        db.commit()


def push_user(user_id: int | None, title: str, body: str, url: str = "/"):
    if user_id:
        threading.Thread(target=_push_send, args=(user_id, title, body[:180], url), daemon=True).start()


# ---------------- онлайн мастера ----------------

@router.post("/me/seen")
def seen(u: m.User | None = Depends(current_user), db: Session = Depends(get_db)):
    ms = my_master(db, u)
    if ms:
        ms.last_seen = datetime.utcnow()
        ms.online = True
        db.commit()
    return {"ok": True}


def refresh_online(db: Session):
    """Мастер «онлайн», если заходил на сайт за последние 10 минут (только для настоящих мастеров)."""
    edge = datetime.utcnow() - timedelta(minutes=10)
    for ms in db.scalars(select(m.Master).where(m.Master.demo.is_(False), m.Master.online.is_(True))):
        if not ms.last_seen or ms.last_seen < edge:
            ms.online = False
    db.commit()


# ---------------- проверка мастеров ----------------
DIDIT_KEY = os.getenv("DIDIT_API_KEY", "").strip()
DIDIT_WF = os.getenv("DIDIT_WORKFLOW_ID", "").strip()


def _didit(method: str, path: str, body: dict | None = None):
    req = urllib.request.Request(f"https://verification.didit.me{path}", method=method, data=json.dumps(body).encode() if body else None,
                                 headers={"Content-Type": "application/json", "X-Api-Key": DIDIT_KEY})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)


def auto_level(ms: m.Master):
    """Уровень 3 «Надёжный» — автоматически: ≥10 подтверждённых заказов, рейтинг ≥4,7 и пройден уровень 1."""
    if ms.level >= 1 and ms.orders_count >= 10 and ms.rating >= 4.7:
        ms.level = max(ms.level, 3)


@router.get("/me/master/verification")
def verification(u: m.User = Depends(need_user), db: Session = Depends(get_db)):
    ms = my_master(db, u)
    if not ms:
        raise HTTPException(404)
    docs = db.scalars(select(m.VerifDoc).where(m.VerifDoc.master_id == ms.id).order_by(m.VerifDoc.id.desc())).all()
    return {"level": ms.level, "kyc": bool(DIDIT_KEY and DIDIT_WF), "kyc_status": ms.kyc_status, "orders": ms.orders_count, "rating": ms.rating,
            "docs": [{"id": d.id, "kind": d.kind, "file": d.file, "status": d.status, "note": d.note} for d in docs]}


@router.post("/me/master/verification/kyc")
def kyc_start(lang: str = "sr", u: m.User = Depends(need_user), db: Session = Depends(get_db)):
    ms = my_master(db, u)
    if not ms or not (DIDIT_KEY and DIDIT_WF):
        raise HTTPException(503, "kyc")
    r = _didit("POST", "/v2/session/", {"workflow_id": DIDIT_WF, "vendor_data": f"master-{ms.id}",
                                         "callback": f"{SITE}/{lang}/kabinet/provera?kyc=1"})
    ms.kyc_session, ms.kyc_status = r.get("session_id", ""), "Not Started"
    db.commit()
    return {"url": r.get("url")}


@router.post("/me/master/verification/kyc/refresh")
def kyc_refresh(u: m.User = Depends(need_user), db: Session = Depends(get_db)):
    ms = my_master(db, u)
    if not ms or not ms.kyc_session or not DIDIT_KEY:
        return {"level": ms.level if ms else 0, "kyc_status": ""}
    try:
        r = _didit("GET", f"/v2/session/{ms.kyc_session}/decision/")
        ms.kyc_status = r.get("status", ms.kyc_status)
        if ms.kyc_status == "Approved":
            ms.level = max(ms.level, 1)
            auto_level(ms)
        db.commit()
    except Exception:
        pass
    return {"level": ms.level, "kyc_status": ms.kyc_status}


class DocIn(BaseModel):
    kind: str = Field(default="license", max_length=40)
    file: str = Field(min_length=10, max_length=255)


@router.post("/me/master/verification/docs")
def doc_add(body: DocIn, u: m.User = Depends(need_user), db: Session = Depends(get_db)):
    ms = my_master(db, u)
    if not ms or not body.file.startswith("/api/v1/files/"):
        raise HTTPException(400)
    db.add(m.VerifDoc(master_id=ms.id, kind=body.kind, file=body.file))
    db.commit()
    return {"ok": True}


@router.get("/admin/verification")
def admin_docs(a: m.User = Depends(need_admin), db: Session = Depends(get_db)):
    out = []
    for d, ms in db.execute(select(m.VerifDoc, m.Master).join(m.Master, m.Master.id == m.VerifDoc.master_id).order_by(m.VerifDoc.id.desc()).limit(100)).all():
        out.append({"id": d.id, "kind": d.kind, "file": d.file, "status": d.status, "master": ms.name, "slug": ms.slug, "level": ms.level,
                    "at": d.created_at.isoformat() + "Z"})
    return out


class DecideIn(BaseModel):
    approve: bool
    note: str = ""


@router.post("/admin/verification/{did}")
def admin_doc_decide(did: int, body: DecideIn, a: m.User = Depends(need_admin), db: Session = Depends(get_db)):
    d = db.get(m.VerifDoc, did)
    if not d:
        raise HTTPException(404)
    d.status, d.note = ("approved" if body.approve else "rejected"), body.note[:300]
    ms = db.get(m.Master, d.master_id)
    if body.approve:
        ms.level = max(ms.level, 2)
        auto_level(ms)
    db.commit()
    from .account import notify_user
    notify_user(db, ms.user_id, "Kront: " + ("документ одобрен — уровень «Профи»" if body.approve else "документ не принят: " + body.note), "/ru/kabinet/provera")
    return {"ok": True}


# ---------------- автоперевод чата ----------------

class TrIn(BaseModel):
    ids: list[int] = Field(max_length=100)
    lang: str = "sr"


@router.get("/ai/status")
def ai_status():
    return {"translate": ai.enabled}


@router.post("/conversations/{cid}/translate")
def translate(cid: int, body: TrIn, u: m.User = Depends(need_user), db: Session = Depends(get_db)):
    conv_access(db, cid, u)
    if not ai.enabled:
        return {}
    lang = "ru" if body.lang == "ru" else "sr"
    out = {}
    for msg in db.scalars(select(m.Message).where(m.Message.conversation_id == cid, m.Message.id.in_(body.ids), m.Message.kind == "text")):
        if msg.sender_id == u.id:
            continue
        tr = db.scalar(select(m.MsgTranslation).where(m.MsgTranslation.message_id == msg.id, m.MsgTranslation.lang == lang))
        if not tr:
            try:
                tr = m.MsgTranslation(message_id=msg.id, lang=lang, text=ai.translate(msg.body, lang))
                db.add(tr)
                db.commit()
            except Exception:
                continue
        if tr.text.strip() != msg.body.strip():
            out[str(msg.id)] = tr.text
    return out


# ---------------- профили из Telegram: забрать / удалить ----------------

@router.get("/claim/{token}")
def claim_info(token: str, db: Session = Depends(get_db)):
    ms = db.scalar(select(m.Master).where(m.Master.claim_token == token, m.Master.claimed.is_(False))) if len(token) >= 16 else None
    if not ms:
        raise HTTPException(404)
    return {"slug": ms.slug, "name": ms.name, "services": [s.category.name_sr for s in ms.services]}


@router.post("/claim/{token}")
def claim(token: str, u: m.User = Depends(need_user), db: Session = Depends(get_db)):
    ms = db.scalar(select(m.Master).where(m.Master.claim_token == token, m.Master.claimed.is_(False))) if len(token) >= 16 else None
    if not ms:
        raise HTTPException(404)
    if my_master(db, u):
        raise HTTPException(409, "has_profile")
    ms.user_id, ms.claimed, ms.claim_token = u.id, True, ""
    db.commit()
    return {"slug": ms.slug}


class RemoveIn(BaseModel):
    contact: str = Field(min_length=3, max_length=200)


@router.post("/masters/{slug}/removal")
def removal(slug: str, body: RemoveIn, db: Session = Depends(get_db)):
    ms = db.scalar(select(m.Master).where(m.Master.slug == slug, m.Master.claimed.is_(False)))
    if not ms:
        raise HTTPException(404)
    db.add(m.RemovalRequest(master_id=ms.id, contact=body.contact.strip()))
    ms.hidden = True  # скрываем сразу, удаление и стоп-лист — в админке
    db.commit()
    return {"ok": True}


# ---------------- админка: сборщик ----------------

@router.get("/admin/collector")
def collector_overview(a: m.User = Depends(need_admin), db: Session = Depends(get_db)):
    unclaimed = db.scalars(select(m.Master).where(m.Master.claimed.is_(False)).order_by(m.Master.id.desc()).limit(200)).all()
    return {"enabled": bool(os.getenv("TG_API_ID") and os.getenv("TG_SESSION")), "ai": ai.enabled,
            "sources": [{"id": s.id, "handle": s.handle, "enabled": s.enabled, "found": s.found, "error": s.error,
                         "checked_at": s.checked_at.isoformat() + "Z" if s.checked_at else None} for s in db.scalars(select(m.TgSource).order_by(m.TgSource.id))],
            "unclaimed": [{"id": x.id, "slug": x.slug, "name": x.name, "tg": x.tg_username, "invite": x.invite_state, "hidden": x.hidden,
                           "source": x.source_url} for x in unclaimed],
            "removals": [{"id": r.id, "master_id": r.master_id, "contact": r.contact, "at": r.created_at.isoformat() + "Z"}
                         for r in db.scalars(select(m.RemovalRequest).order_by(m.RemovalRequest.id.desc()).limit(100))]}


class SourceIn(BaseModel):
    handle: str = Field(min_length=3, max_length=120)


@router.post("/admin/collector/sources")
def source_add(body: SourceIn, a: m.User = Depends(need_admin), db: Session = Depends(get_db)):
    h = body.handle.strip().replace("https://", "").replace("t.me/", "").lstrip("@").split("/")[0]
    if not h or db.scalar(select(m.TgSource).where(m.TgSource.handle == h)):
        raise HTTPException(409)
    db.add(m.TgSource(handle=h))
    db.commit()
    return {"ok": True}


@router.delete("/admin/collector/sources/{sid}")
def source_del(sid: int, a: m.User = Depends(need_admin), db: Session = Depends(get_db)):
    db.execute(delete(m.TgSource).where(m.TgSource.id == sid))
    db.commit()
    return {"ok": True}


@router.post("/admin/removals/{rid}/done")
def removal_done(rid: int, a: m.User = Depends(need_admin), db: Session = Depends(get_db)):
    r = db.get(m.RemovalRequest, rid)
    if r:
        ms = db.get(m.Master, r.master_id) if r.master_id else None
        if ms and not ms.claimed:
            for key in [ms.tg_username.lower(), ms.phone]:
                if key and not db.scalar(select(m.TgStop).where(m.TgStop.key == key)):
                    db.add(m.TgStop(key=key))
            db.delete(ms)
        db.delete(r)
        db.commit()
    return {"ok": True}


def new_claim_token() -> str:
    return secrets.token_urlsafe(18)
