"""Аккаунты (вход через Telegram и email), кабинет мастера, чат и заказы, отзывы, админка."""
import json
import os
import re
import secrets
import smtplib
import threading
import time
import unicodedata
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from email.message import EmailMessage
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, Request, Response, UploadFile, File
from fastapi.responses import FileResponse, RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy import select, func, or_, delete
from sqlalchemy.orm import Session

from . import models as m
from .db import get_db, SessionLocal

router = APIRouter(prefix="/api/v1")
COOKIE = "kront_s"
UPLOADS = os.getenv("UPLOADS_DIR", "./uploads")
os.makedirs(UPLOADS, exist_ok=True)
TG_TOKEN = os.getenv("TG_BOT_TOKEN", "").strip()
TG_NAME = os.getenv("TG_BOT_NAME", "").strip().lstrip("@")
SITE = os.getenv("SITE_URL", "")
SMTP = {k: os.getenv(f"SMTP_{k}", "") for k in ("HOST", "PORT", "USER", "PASS", "FROM")}
GOOGLE_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()
GOOGLE_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
ADMINS = {x.strip() for x in os.getenv("ADMIN_TG_IDS", "").split(",") if x.strip()}


# ---------------- сессии ----------------

def current_user(request: Request, db: Session = Depends(get_db)) -> m.User | None:
    tok = request.cookies.get(COOKIE)
    if not tok:
        return None
    s = db.get(m.Session, tok)
    if not s or s.expires_at < datetime.utcnow():
        return None
    return db.get(m.User, s.user_id)


def need_user(u: m.User | None = Depends(current_user)) -> m.User:
    if not u:
        raise HTTPException(401, "login")
    return u


def need_admin(u: m.User = Depends(need_user)) -> m.User:
    if u.role != "admin":
        raise HTTPException(403, "admin")
    return u


def start_session(db: Session, resp: Response, request: Request, user: m.User):
    tok = secrets.token_urlsafe(32)
    db.add(m.Session(token=tok, user_id=user.id, expires_at=datetime.utcnow() + timedelta(days=90)))
    db.commit()
    secure = SITE.startswith("https://") or request.headers.get("x-forwarded-proto", request.url.scheme) == "https"
    resp.set_cookie(COOKIE, tok, max_age=90 * 86400, httponly=True, samesite="lax", secure=secure, path="/")


def make_admin_if_first(db: Session, u: m.User):
    if (u.tg_id and str(u.tg_id) in ADMINS) or not db.scalar(select(func.count(m.User.id)).where(m.User.role == "admin")):
        u.role = "admin"


def my_master(db: Session, u: m.User | None) -> m.Master | None:
    if not u:
        return None
    return db.scalar(select(m.Master).where(m.Master.user_id == u.id))


def user_out(db: Session, u: m.User):
    ms = my_master(db, u)
    return {"id": u.id, "name": u.name, "photo": u.photo, "email": u.email, "tg": u.tg_username, "role": u.role,
            "master": {"slug": ms.slug, "name": ms.name} if ms else None}


@router.get("/auth/config")
def auth_config():
    return {"google": bool(GOOGLE_ID and GOOGLE_SECRET)}


# ---------------- вход через Google (OAuth 2.0, код авторизации) ----------------

def _safe_next(n: str) -> str:
    return n if n.startswith("/") and not n.startswith("//") else "/"


@router.get("/auth/google/start")
def google_start(next: str = "/"):
    if not (GOOGLE_ID and GOOGLE_SECRET and SITE):
        raise HTTPException(503, "google")
    state = secrets.token_urlsafe(24)
    q = urllib.parse.urlencode({"client_id": GOOGLE_ID, "redirect_uri": f"{SITE}/api/v1/auth/google/callback", "response_type": "code",
                                "scope": "openid email profile", "state": state, "prompt": "select_account"})
    resp = RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{q}", status_code=302)
    sec = SITE.startswith("https://")
    resp.set_cookie("kront_g", state, max_age=600, httponly=True, samesite="lax", secure=sec, path="/")
    resp.set_cookie("kront_gn", urllib.parse.quote(_safe_next(next), safe=""), max_age=600, httponly=True, samesite="lax", secure=sec, path="/")
    return resp


@router.get("/auth/google/callback")
def google_callback(request: Request, code: str = "", state: str = "", error: str = "", db: Session = Depends(get_db)):
    st = request.cookies.get("kront_g", "")
    nxt = _safe_next(urllib.parse.unquote(request.cookies.get("kront_gn", "")) or "/")
    seg = nxt.split("/")[1] if nxt.count("/") >= 1 else ""
    fail = RedirectResponse(f"/{seg if seg in ('sr', 'sr-cyrl', 'ru') else 'sr'}/vhod?error=google", status_code=302)
    if error or not code or not st or not secrets.compare_digest(st, state):
        return fail
    try:
        data = urllib.parse.urlencode({"code": code, "client_id": GOOGLE_ID, "client_secret": GOOGLE_SECRET,
                                       "redirect_uri": f"{SITE}/api/v1/auth/google/callback", "grant_type": "authorization_code"}).encode()
        with urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token", data=data), timeout=15) as r:
            tok = json.load(r)
        with urllib.request.urlopen(f"https://oauth2.googleapis.com/tokeninfo?id_token={urllib.parse.quote(tok['id_token'])}", timeout=15) as r:
            info = json.load(r)
    except Exception:
        return fail
    if info.get("aud") != GOOGLE_ID or info.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        return fail
    sub, email = info.get("sub"), (info.get("email") or "").lower()
    u = db.scalar(select(m.User).where(m.User.google_sub == sub))
    if not u and email and info.get("email_verified") in (True, "true"):
        u = db.scalar(select(m.User).where(m.User.email == email))
    if not u:
        u = m.User(google_sub=sub, email=email or None, name=info.get("name") or email.split("@")[0], photo=info.get("picture", ""))
        db.add(u)
        db.flush()
        make_admin_if_first(db, u)
    else:
        u.google_sub = sub
        u.photo = u.photo or info.get("picture", "")
        u.name = u.name or info.get("name", "")
    db.commit()
    resp = RedirectResponse(nxt, status_code=302)
    resp.delete_cookie("kront_g", path="/")
    resp.delete_cookie("kront_gn", path="/")
    start_session(db, resp, request, u)
    return resp


@router.get("/me")
def me(u: m.User | None = Depends(current_user), db: Session = Depends(get_db)):
    return user_out(db, u) if u else None


@router.post("/auth/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    tok = request.cookies.get(COOKIE)
    if tok:
        db.execute(delete(m.Session).where(m.Session.token == tok))
        db.commit()
    response.delete_cookie(COOKIE, path="/")
    return {"ok": True}


# ---------------- вход через Telegram-бота ----------------

@router.post("/auth/tg/start")
def tg_start(db: Session = Depends(get_db)):
    if not (TG_TOKEN and TG_NAME):
        raise HTTPException(503, "telegram")
    tok = secrets.token_urlsafe(12).replace("-", "x").replace("_", "y")
    db.add(m.TgLogin(token=tok))
    db.commit()
    return {"token": tok, "url": f"https://t.me/{TG_NAME}?start=login_{tok}"}


@router.post("/auth/tg/check")
def tg_check(token: str, request: Request, response: Response, db: Session = Depends(get_db)):
    tl = db.get(m.TgLogin, token)
    if not tl or tl.created_at < datetime.utcnow() - timedelta(minutes=15):
        raise HTTPException(404, "expired")
    if not tl.user_id:
        return {"ok": False}
    u = db.get(m.User, tl.user_id)
    db.delete(tl)
    start_session(db, response, request, u)
    return {"ok": True, "user": user_out(db, u)}


def tg_api(method: str, **params):
    data = json.dumps(params).encode()
    req = urllib.request.Request(f"https://api.telegram.org/bot{TG_TOKEN}/{method}", data=data,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.load(r)


def tg_send(chat_id: int, text: str, url: str | None = None, button: str = ""):
    if not TG_TOKEN:
        return
    p = {"chat_id": chat_id, "text": text, "parse_mode": "HTML", "disable_web_page_preview": True}
    if url and url.startswith("https://"):
        p["reply_markup"] = {"inline_keyboard": [[{"text": button or "Kront", "url": url}]]}
    try:
        tg_api("sendMessage", **p)
    except Exception:
        pass


def _tg_handle(msg: dict):
    text = (msg.get("text") or "").strip()
    frm = msg.get("from") or {}
    chat = msg.get("chat", {}).get("id")
    ru = (frm.get("language_code") or "").startswith("ru")
    if text.startswith("/start login_"):
        tok = text.split("login_", 1)[1].strip()
        with SessionLocal() as db:
            tl = db.get(m.TgLogin, tok)
            if not tl:
                tg_send(chat, "Ссылка устарела — нажми «Войти» на сайте ещё раз." if ru else "Link je istekao — klikni „Prijavi se“ ponovo.")
                return
            u = db.scalar(select(m.User).where(m.User.tg_id == frm["id"]))
            name = " ".join(x for x in [frm.get("first_name", ""), frm.get("last_name", "")] if x).strip()
            if not u:
                u = m.User(tg_id=frm["id"], name=name or frm.get("username", ""), tg_username=frm.get("username", ""),
                           lang="ru" if ru else "sr")
                db.add(u)
                db.flush()
                make_admin_if_first(db, u)
            else:
                u.tg_username = frm.get("username", "") or u.tg_username
                if not u.name:
                    u.name = name
            tl.user_id = u.id
            db.commit()
        tg_send(chat, "Готово, ты вошёл в Kront. Вернись на сайт — страница обновится сама." if ru
                else "Gotovo, prijavljen si na Kront. Vrati se na sajt — stranica će se sama osvežiti.", SITE or None,
                "Открыть Kront" if ru else "Otvori Kront")
    elif text.startswith("/start"):
        tg_send(chat, "Это бот Kront — мастера в Белграде. Сюда приходят уведомления о заявках и сообщениях." if ru
                else "Ovo je Kront bot — majstori u Beogradu. Ovde stižu obaveštenja o zahtevima i porukama.", SITE or None, "Kront")


def _tg_loop():
    offset = 0
    while True:
        try:
            r = tg_api("getUpdates", offset=offset, timeout=25, allowed_updates=["message"])
            for upd in r.get("result", []):
                offset = upd["update_id"] + 1
                if "message" in upd:
                    _tg_handle(upd["message"])
        except Exception:
            time.sleep(5)


def start_bot():
    if TG_TOKEN:
        threading.Thread(target=_tg_loop, daemon=True).start()


def notify_user(db: Session, user_id: int | None, text: str, path: str = ""):
    if not user_id:
        return
    u = db.get(m.User, user_id)
    if u and u.tg_id:
        threading.Thread(target=tg_send, args=(u.tg_id, text, f"{SITE}{path}" if SITE else None, "Kront"), daemon=True).start()


# ---------------- вход по коду на email ----------------

class EmailIn(BaseModel):
    email: str = Field(min_length=5, max_length=200)


@router.post("/auth/email/start")
def email_start(body: EmailIn, db: Session = Depends(get_db)):
    if not SMTP["HOST"]:
        raise HTTPException(503, "email")
    email = body.email.strip().lower()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise HTTPException(422, "email")
    code = f"{secrets.randbelow(900000) + 100000}"
    db.add(m.LoginCode(email=email, code=code, expires_at=datetime.utcnow() + timedelta(minutes=10)))
    db.commit()
    msg = EmailMessage()
    msg["Subject"] = f"Kront: {code}"
    msg["From"] = SMTP["FROM"] or SMTP["USER"]
    msg["To"] = email
    msg.set_content(f"Kod za prijavu / Код для входа: {code}\n\nVaži 10 minuta / Действует 10 минут.")
    with smtplib.SMTP(SMTP["HOST"], int(SMTP["PORT"] or 587), timeout=20) as s:
        s.starttls()
        if SMTP["USER"]:
            s.login(SMTP["USER"], SMTP["PASS"])
        s.send_message(msg)
    return {"ok": True}


class CodeIn(EmailIn):
    code: str = Field(min_length=6, max_length=6)


@router.post("/auth/email/verify")
def email_verify(body: CodeIn, request: Request, response: Response, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    lc = db.scalar(select(m.LoginCode).where(m.LoginCode.email == email).order_by(m.LoginCode.id.desc()))
    if not lc or lc.expires_at < datetime.utcnow() or lc.attempts >= 5:
        raise HTTPException(400, "expired")
    if lc.code != body.code.strip():
        lc.attempts += 1
        db.commit()
        raise HTTPException(400, "wrong")
    u = db.scalar(select(m.User).where(m.User.email == email))
    if not u:
        u = m.User(email=email, name=email.split("@")[0])
        db.add(u)
        db.flush()
        make_admin_if_first(db, u)
    db.delete(lc)
    start_session(db, response, request, u)
    return {"ok": True, "user": user_out(db, u)}


# ---------------- файлы ----------------

@router.post("/files")
async def upload(file: UploadFile = File(...), u: m.User = Depends(need_user)):
    from PIL import Image, ImageOps
    raw = await file.read()
    if len(raw) > 12 * 1024 * 1024:
        raise HTTPException(413, "big")
    try:
        im = ImageOps.exif_transpose(Image.open(BytesIO(raw))).convert("RGB")  # EXIF (в т.ч. геоданные) не сохраняем
    except Exception:
        raise HTTPException(415, "image")
    im.thumbnail((1600, 1600))
    name = f"{secrets.token_hex(12)}.jpg"
    im.save(os.path.join(UPLOADS, name), "JPEG", quality=82, optimize=True)
    return {"url": f"/api/v1/files/{name}"}


@router.get("/files/{name}")
def file_get(name: str):
    if not re.fullmatch(r"[0-9a-f]{24}\.jpg", name):
        raise HTTPException(404)
    path = os.path.join(UPLOADS, name)
    if not os.path.exists(path):
        raise HTTPException(404)
    return FileResponse(path, media_type="image/jpeg", headers={"Cache-Control": "public, max-age=31536000, immutable"})


# ---------------- избранное ----------------

@router.get("/me/favorites")
def fav_list(u: m.User = Depends(need_user), db: Session = Depends(get_db)):
    ids = db.scalars(select(m.Favorite.master_id).where(m.Favorite.user_id == u.id)).all()
    return [x for x in db.scalars(select(m.Master.slug).where(m.Master.id.in_(ids)))] if ids else []


class SlugsIn(BaseModel):
    slugs: list[str] = Field(default_factory=list, max_length=200)


@router.put("/me/favorites")
def fav_set(body: SlugsIn, u: m.User = Depends(need_user), db: Session = Depends(get_db)):
    db.execute(delete(m.Favorite).where(m.Favorite.user_id == u.id))
    for ms in db.scalars(select(m.Master).where(m.Master.slug.in_(body.slugs))):
        db.add(m.Favorite(user_id=u.id, master_id=ms.id))
    db.commit()
    return {"ok": True}


# ---------------- кабинет мастера ----------------

def slugify(s: str) -> str:
    s = unicodedata.normalize("NFKD", s.lower().replace("đ", "dj"))
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:60] or "majstor"


class SvcIn(BaseModel):
    slug: str
    price_from: int = Field(ge=0, le=10_000_000)


class MasterIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    kind: str = "private"
    services: list[SvcIn] = Field(min_length=1, max_length=20)
    districts: list[str] = Field(min_length=1, max_length=20)
    about: str = Field(default="", max_length=2000)
    langs: list[str] = Field(default_factory=lambda: ["sr"])
    phone: str = Field(default="", max_length=60)
    experience_years: int = Field(default=0, ge=0, le=70)
    warranty_months: int = Field(default=0, ge=0, le=120)
    photo: str = ""
    cover: str = ""
    works: list[str] = Field(default_factory=list, max_length=60)
    lang: str = "sr"


@router.get("/me/master")
def master_get(u: m.User = Depends(need_user), db: Session = Depends(get_db)):
    ms = my_master(db, u)
    if not ms:
        return None
    return {"slug": ms.slug, "name": ms.name, "kind": ms.kind, "about": ms.about_ru or ms.about_sr, "langs": ms.langs.split(","),
            "phone": ms.phone, "experience_years": ms.experience_years, "warranty_months": ms.warranty_months,
            "photo": ms.photo, "cover": ms.cover, "works": [w.photo for w in ms.works],
            "services": [{"slug": s.category.slug, "price_from": s.price_from} for s in ms.services],
            "districts": [d.slug for d in ms.districts], "rating": ms.rating, "reviews": ms.reviews_count,
            "orders": ms.orders_count, "level": ms.level}


@router.put("/me/master")
def master_put(body: MasterIn, u: m.User = Depends(need_user), db: Session = Depends(get_db)):
    ms = my_master(db, u)
    cats = {c.slug: c for c in db.scalars(select(m.Category).where(m.Category.slug.in_([s.slug for s in body.services])))}
    dists = list(db.scalars(select(m.District).where(m.District.slug.in_(body.districts))))
    if not cats or not dists:
        raise HTTPException(422, "services/districts")
    if not ms:
        base = slugify(body.name)
        slug = base
        i = 2
        while db.scalar(select(m.Master.id).where(m.Master.slug == slug)):
            slug = f"{base}-{i}"
            i += 1
        ms = m.Master(slug=slug, user_id=u.id, level=0, rating=0, reviews_count=0, orders_count=0, reply_min=30, claimed=True)
        db.add(ms)
    ms.name = body.name.strip()
    ms.kind = body.kind if body.kind in ("private", "entrepreneur", "company") else "private"
    if body.lang == "ru":
        ms.about_ru = body.about.strip()
        ms.about_sr = ms.about_sr or body.about.strip()
    else:
        ms.about_sr = body.about.strip()
        ms.about_ru = ms.about_ru or body.about.strip()
    ms.langs = ",".join([x for x in body.langs if x in ("sr", "ru", "en")] or ["sr"])
    ms.phone = body.phone.strip()
    ms.experience_years = body.experience_years
    ms.warranty_months = body.warranty_months
    ok = lambda url: url.startswith("/api/v1/files/") or url.startswith("/demo/") or url == ""
    ms.photo = body.photo if ok(body.photo) else ms.photo
    works = [w for w in body.works if ok(w)]
    ms.cover = body.cover if ok(body.cover) and body.cover else (works[0] if works else ms.cover)
    ms.services = [m.MasterService(category_id=cats[s.slug].id, price_from=s.price_from) for s in body.services if s.slug in cats]
    ms.districts = dists
    ms.works = [m.Work(photo=w, sort=i) for i, w in enumerate(works)]
    if not u.name:
        u.name = ms.name
    db.commit()
    return {"slug": ms.slug}


def _req_out(db: Session, r: m.ServiceRequest, lang: str, extra: dict | None = None):
    c = db.get(m.Category, r.category_id) if r.category_id else None
    d = db.get(m.District, r.district_id) if r.district_id else None
    return {"id": r.id, "service": (c.name_ru if lang == "ru" else c.name_sr) if c else "", "service_slug": c.slug if c else "",
            "district": (d.name_ru if lang == "ru" else d.name_sr) if d else "", "description": r.description, "when": r.when,
            "budget": r.budget, "urgent": r.urgent, "status": r.status, "created_at": r.created_at.isoformat() + "Z", **(extra or {})}


@router.get("/me/master/requests")
def master_requests(lang: str = "sr", u: m.User = Depends(need_user), db: Session = Depends(get_db)):
    ms = my_master(db, u)
    if not ms:
        raise HTTPException(404, "master")
    rows = db.execute(select(m.RequestMatch, m.ServiceRequest).join(m.ServiceRequest, m.ServiceRequest.id == m.RequestMatch.request_id)
                      .where(m.RequestMatch.master_id == ms.id).order_by(m.RequestMatch.id.desc()).limit(100)).all()
    return [_req_out(db, r, lang, {"match": rm.status, "client": r.contact_name}) for rm, r in rows]


def _system(db: Session, conv: m.Conversation, text: str):
    db.add(m.Message(conversation_id=conv.id, sender_id=None, kind="system", body=text))
    conv.updated_at = datetime.utcnow()


def get_or_create_conv(db: Session, client_id: int, ms: m.Master) -> m.Conversation:
    conv = db.scalar(select(m.Conversation).where(m.Conversation.client_id == client_id, m.Conversation.master_id == ms.id))
    if not conv:
        conv = m.Conversation(client_id=client_id, master_id=ms.id)
        db.add(conv)
        db.flush()
    return conv


@router.post("/me/master/requests/{rid}/{action}")
def master_request_action(rid: int, action: str, u: m.User = Depends(need_user), db: Session = Depends(get_db)):
    ms = my_master(db, u)
    rm = db.scalar(select(m.RequestMatch).where(m.RequestMatch.request_id == rid, m.RequestMatch.master_id == (ms.id if ms else -1)))
    if not rm:
        raise HTTPException(404)
    r = db.get(m.ServiceRequest, rid)
    if action == "decline":
        rm.status = "declined"
        db.commit()
        return {"ok": True}
    if action != "take":
        raise HTTPException(400)
    rm.status = "taken"
    if not r.user_id:
        db.commit()
        return {"ok": True, "conversation": None, "contact": r.contact}
    conv = get_or_create_conv(db, r.user_id, ms)
    db.add(m.Message(conversation_id=conv.id, sender_id=r.user_id, kind="text", body=r.description))
    _system(db, conv, f"master_took|{ms.name}")
    db.commit()
    notify_user(db, r.user_id, f"{ms.name}: ✅ {'Мастер взял вашу заявку' if r.lang == 'ru' else 'Majstor je prihvatio vaš zahtev'}",
                f"/{'ru' if r.lang == 'ru' else 'sr'}/poruke/{conv.id}")
    return {"ok": True, "conversation": conv.id}


def match_masters(db: Session, r: m.ServiceRequest, picked: list[str]):
    q = select(m.Master).where(m.Master.hidden.is_(False))
    if picked:
        found = list(db.scalars(q.where(m.Master.slug.in_(picked))))[:3]
    else:
        q = q.where(m.Master.services.any(m.MasterService.category_id == r.category_id)) if r.category_id else q
        q = q.where(m.Master.districts.any(m.District.id == r.district_id)) if r.district_id else q
        found = sorted(db.scalars(q), key=lambda x: (x.level, x.rating, x.online), reverse=True)[:3]
    for ms in found:
        db.add(m.RequestMatch(request_id=r.id, master_id=ms.id))
        if ms.user_id:
            notify_user(db, ms.user_id, f"🔔 {'Новая заявка' if r.lang == 'ru' else 'Novi zahtev'}: {r.description[:120]}",
                        f"/{'ru' if r.lang == 'ru' else 'sr'}/kabinet")


@router.get("/me/requests")
def my_requests(lang: str = "sr", u: m.User = Depends(need_user), db: Session = Depends(get_db)):
    out = []
    for r in db.scalars(select(m.ServiceRequest).where(m.ServiceRequest.user_id == u.id).order_by(m.ServiceRequest.id.desc()).limit(50)):
        ms = [{"slug": x.slug, "name": x.name, "photo": x.photo, "status": rm.status} for rm, x in db.execute(
            select(m.RequestMatch, m.Master).join(m.Master, m.Master.id == m.RequestMatch.master_id).where(m.RequestMatch.request_id == r.id)).all()]
        out.append(_req_out(db, r, lang, {"masters": ms}))
    return out


# ---------------- чат и заказы ----------------

def conv_access(db: Session, cid: int, u: m.User):
    conv = db.get(m.Conversation, cid)
    if not conv:
        raise HTTPException(404)
    ms = db.get(m.Master, conv.master_id)
    side = "client" if conv.client_id == u.id else "master" if ms.user_id == u.id else "admin" if u.role == "admin" else None
    if not side:
        raise HTTPException(403)
    return conv, ms, side


def order_out(o: m.Order | None):
    if not o:
        return None
    return {"id": o.id, "title": o.title, "details": o.details, "price": o.price, "visit": o.visit, "final_price": o.final_price,
            "status": o.status, "reviewed": o.reviewed}


@router.get("/me/conversations")
def conversations(u: m.User = Depends(need_user), db: Session = Depends(get_db)):
    ms = my_master(db, u)
    q = select(m.Conversation).where(or_(m.Conversation.client_id == u.id, m.Conversation.master_id == (ms.id if ms else -1)))
    out = []
    for c in db.scalars(q.order_by(m.Conversation.updated_at.desc()).limit(100)):
        mm = db.get(m.Master, c.master_id)
        cl = db.get(m.User, c.client_id)
        side = "client" if c.client_id == u.id else "master"
        last = db.scalar(select(m.Message).where(m.Message.conversation_id == c.id).order_by(m.Message.id.desc()))
        read_at = c.client_read_at if side == "client" else c.master_read_at
        unread = db.scalar(select(func.count(m.Message.id)).where(m.Message.conversation_id == c.id, m.Message.created_at > read_at,
                                                                  or_(m.Message.sender_id.is_(None), m.Message.sender_id != u.id)))
        other = {"name": mm.name, "photo": mm.photo, "slug": mm.slug} if side == "client" else {"name": cl.name or "Klijent", "photo": cl.photo, "slug": None}
        out.append({"id": c.id, "side": side, "other": other, "unread": unread,
                    "last": {"kind": last.kind, "body": last.body[:120], "at": last.created_at.isoformat() + "Z"} if last else None})
    return out


@router.get("/me/badges")
def badges(u: m.User | None = Depends(current_user), db: Session = Depends(get_db)):
    if not u:
        return {"messages": 0, "requests": 0}
    total = sum(c["unread"] for c in conversations(u, db))
    ms = my_master(db, u)
    pend = db.scalar(select(func.count(m.RequestMatch.id)).where(m.RequestMatch.master_id == ms.id, m.RequestMatch.status == "pending")) if ms else 0
    return {"messages": total, "requests": pend}


@router.get("/conversations/{cid}")
def conversation(cid: int, after: int = 0, u: m.User = Depends(need_user), db: Session = Depends(get_db)):
    conv, ms, side = conv_access(db, cid, u)
    msgs = db.scalars(select(m.Message).where(m.Message.conversation_id == cid, m.Message.id > after).order_by(m.Message.id).limit(300)).all()
    if side == "client":
        conv.client_read_at = datetime.utcnow()
    elif side == "master":
        conv.master_read_at = datetime.utcnow()
    db.commit()
    cl = db.get(m.User, conv.client_id)
    orders = {o.id: o for o in db.scalars(select(m.Order).where(m.Order.conversation_id == cid))}
    other_read = conv.master_read_at if side == "client" else conv.client_read_at
    return {"id": cid, "side": side,
            "master": {"slug": ms.slug, "name": ms.name, "photo": ms.photo, "phone": ms.phone if any(o.status in ("agreed", "done", "confirmed") for o in orders.values()) else ""},
            "client": {"name": cl.name or "Klijent", "photo": cl.photo},
            "me": u.id, "other_read_at": other_read.isoformat() + "Z",
            "messages": [{"id": x.id, "kind": x.kind, "body": x.body, "mine": x.sender_id == u.id, "at": x.created_at.isoformat() + "Z",
                          "order": order_out(orders.get(x.order_id)) if x.order_id else None} for x in msgs],
            "orders": [order_out(o) for o in orders.values()]}


class MsgIn(BaseModel):
    body: str = Field(min_length=1, max_length=4000)
    kind: str = "text"


@router.post("/conversations/{cid}/messages")
def send(cid: int, body: MsgIn, u: m.User = Depends(need_user), db: Session = Depends(get_db)):
    conv, ms, side = conv_access(db, cid, u)
    kind = "photo" if body.kind == "photo" and body.body.startswith("/api/v1/files/") else "text"
    db.add(m.Message(conversation_id=cid, sender_id=u.id, kind=kind, body=body.body.strip()))
    conv.updated_at = datetime.utcnow()
    db.commit()
    to = ms.user_id if side == "client" else conv.client_id
    notify_user(db, to, f"💬 {u.name or 'Kront'}: {body.body[:200] if kind == 'text' else '📷'}", f"/sr/poruke/{cid}")
    return {"ok": True}


@router.post("/masters/{slug}/conversation")
def open_conv(slug: str, u: m.User = Depends(need_user), db: Session = Depends(get_db)):
    ms = db.scalar(select(m.Master).where(m.Master.slug == slug))
    if not ms:
        raise HTTPException(404)
    if ms.user_id == u.id:
        raise HTTPException(400, "self")
    conv = get_or_create_conv(db, u.id, ms)
    db.commit()
    return {"id": conv.id}


class OfferIn(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    details: str = Field(default="", max_length=2000)
    price: int = Field(ge=0, le=100_000_000)
    visit: str = Field(default="", max_length=40)


@router.post("/conversations/{cid}/offer")
def offer(cid: int, body: OfferIn, u: m.User = Depends(need_user), db: Session = Depends(get_db)):
    conv, ms, side = conv_access(db, cid, u)
    if side != "master":
        raise HTTPException(403)
    o = m.Order(conversation_id=cid, title=body.title.strip(), details=body.details.strip(), price=body.price, visit=body.visit)
    db.add(o)
    db.flush()
    db.add(m.Message(conversation_id=cid, sender_id=u.id, kind="order", order_id=o.id))
    conv.updated_at = datetime.utcnow()
    db.commit()
    notify_user(db, conv.client_id, f"📄 {ms.name}: {o.title} — {o.price} RSD", f"/sr/poruke/{cid}")
    return {"id": o.id}


class OrderAct(BaseModel):
    final_price: int = 0


@router.post("/orders/{oid}/act/{action}")
def order_action(oid: int, action: str, body: OrderAct | None = None, u: m.User = Depends(need_user), db: Session = Depends(get_db)):
    o = db.get(m.Order, oid)
    if not o:
        raise HTTPException(404)
    conv, ms, side = conv_access(db, o.conversation_id, u)
    allowed = {("accept", "client", "offer"): "agreed", ("decline", "client", "offer"): "canceled",
               ("cancel", "master", "offer"): "canceled", ("cancel", "client", "agreed"): "canceled", ("cancel", "master", "agreed"): "canceled",
               ("done", "master", "agreed"): "done", ("confirm", "client", "done"): "confirmed"}
    new = allowed.get((action, side, o.status))
    if not new:
        raise HTTPException(409, "status")
    o.status = new
    o.updated_at = datetime.utcnow()
    if action == "done":
        o.final_price = (body.final_price if body and body.final_price else o.price)
    if new == "confirmed":
        ms.orders_count += 1
    _system(db, conv, f"order_{new}|{o.title}")
    db.commit()
    to = ms.user_id if side == "client" else conv.client_id
    notify_user(db, to, f"Kront: {o.title} → {new}", f"/sr/poruke/{conv.id}")
    return order_out(o)


class ReviewIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    quality: int = Field(ge=1, le=5)
    punctuality: int = Field(ge=1, le=5)
    price_fair: int = Field(ge=1, le=5)
    tags: list[str] = Field(default_factory=list, max_length=8)
    text: str = Field(default="", max_length=2000)
    lang: str = "sr"


@router.post("/orders/{oid}/review")
def review(oid: int, body: ReviewIn, u: m.User = Depends(need_user), db: Session = Depends(get_db)):
    o = db.get(m.Order, oid)
    if not o:
        raise HTTPException(404)
    conv, ms, side = conv_access(db, o.conversation_id, u)
    if side != "client" or o.status != "confirmed" or o.reviewed:
        raise HTTPException(409)
    db.add(m.Review(master_id=ms.id, author=(u.name or "Klijent").split(" ")[0], rating=body.rating, quality=body.quality,
                    punctuality=body.punctuality, price_fair=body.price_fair, tags=",".join(t[:40] for t in body.tags),
                    text=body.text.strip(), lang=body.lang, service=o.title, order_id=o.id, user_id=u.id))
    o.reviewed = True
    db.flush()
    stats = db.execute(select(func.count(m.Review.id), func.avg(m.Review.rating)).where(m.Review.master_id == ms.id)).one()
    ms.reviews_count = stats[0]
    ms.rating = round(float(stats[1] or 0), 2)
    _system(db, conv, "review_left|")
    db.commit()
    return {"ok": True}


@router.get("/me/master/reviews")
def my_reviews(u: m.User = Depends(need_user), db: Session = Depends(get_db)):
    ms = my_master(db, u)
    if not ms:
        return []
    return [{"author": r.author, "rating": r.rating, "text": r.text, "service": r.service, "tags": [t for t in r.tags.split(",") if t],
             "date": r.created_at.date().isoformat()} for r in db.scalars(select(m.Review).where(m.Review.master_id == ms.id).order_by(m.Review.id.desc()))]


# ---------------- админка ----------------

@router.get("/admin/overview")
def admin_overview(a: m.User = Depends(need_admin), db: Session = Depends(get_db)):
    cnt = lambda model, *w: db.scalar(select(func.count()).select_from(model).where(*w)) or 0
    return {
        "stats": {"users": cnt(m.User), "masters": cnt(m.Master, m.Master.demo.is_(False)), "demo": cnt(m.Master, m.Master.demo.is_(True)),
                  "requests": cnt(m.ServiceRequest), "orders": cnt(m.Order), "confirmed": cnt(m.Order, m.Order.status == "confirmed"),
                  "reviews": cnt(m.Review), "leads": cnt(m.MasterLead)},
        "requests": [{"id": r.id, "description": r.description[:200], "contact": f"{r.contact_name} · {r.contact}", "status": r.status,
                      "at": r.created_at.isoformat() + "Z", "masters": r.masters}
                     for r in db.scalars(select(m.ServiceRequest).order_by(m.ServiceRequest.id.desc()).limit(50))],
        "leads": [{"id": x.id, "name": x.name, "contact": x.contact, "service": x.service, "district": x.district, "at": x.created_at.isoformat() + "Z"}
                  for x in db.scalars(select(m.MasterLead).order_by(m.MasterLead.id.desc()).limit(100))],
        "masters": [{"id": x.id, "slug": x.slug, "name": x.name, "demo": x.demo, "hidden": x.hidden, "level": x.level, "rating": x.rating,
                     "reviews": x.reviews_count, "user": bool(x.user_id)}
                    for x in db.scalars(select(m.Master).order_by(m.Master.id.desc()).limit(300))],
        "reviews": [{"id": r.id, "master_id": r.master_id, "author": r.author, "rating": r.rating, "text": r.text[:300]}
                    for r in db.scalars(select(m.Review).order_by(m.Review.id.desc()).limit(100))],
        "users": [{"id": x.id, "name": x.name, "tg": x.tg_username, "email": x.email, "role": x.role, "at": x.created_at.isoformat() + "Z"}
                  for x in db.scalars(select(m.User).order_by(m.User.id.desc()).limit(100))],
    }


class AdminMasterIn(BaseModel):
    hidden: bool | None = None
    level: int | None = Field(default=None, ge=0, le=3)


@router.patch("/admin/masters/{mid}")
def admin_master(mid: int, body: AdminMasterIn, a: m.User = Depends(need_admin), db: Session = Depends(get_db)):
    ms = db.get(m.Master, mid)
    if not ms:
        raise HTTPException(404)
    if body.hidden is not None:
        ms.hidden = body.hidden
    if body.level is not None:
        ms.level = body.level
    db.commit()
    return {"ok": True}


@router.delete("/admin/reviews/{rid}")
def admin_review_del(rid: int, a: m.User = Depends(need_admin), db: Session = Depends(get_db)):
    r = db.get(m.Review, rid)
    if r:
        mid = r.master_id
        db.delete(r)
        db.flush()
        ms = db.get(m.Master, mid)
        stats = db.execute(select(func.count(m.Review.id), func.avg(m.Review.rating)).where(m.Review.master_id == mid)).one()
        ms.reviews_count, ms.rating = stats[0], round(float(stats[1] or 0), 2)
        db.commit()
    return {"ok": True}


@router.delete("/admin/leads/{lid}")
def admin_lead_del(lid: int, a: m.User = Depends(need_admin), db: Session = Depends(get_db)):
    db.execute(delete(m.MasterLead).where(m.MasterLead.id == lid))
    db.commit()
    return {"ok": True}


@router.post("/admin/demo/delete")
def admin_demo_delete(a: m.User = Depends(need_admin), db: Session = Depends(get_db)):
    ids = list(db.scalars(select(m.Master.id).where(m.Master.demo.is_(True))))
    if ids:
        db.execute(delete(m.Review).where(m.Review.master_id.in_(ids)))
        db.execute(delete(m.RequestMatch).where(m.RequestMatch.master_id.in_(ids)))
        db.execute(delete(m.Favorite).where(m.Favorite.master_id.in_(ids)))
        for ms in db.scalars(select(m.Master).where(m.Master.id.in_(ids))):
            db.delete(ms)
    open(os.path.join(UPLOADS, ".no_demo"), "w").close()
    db.commit()
    return {"deleted": len(ids)}
