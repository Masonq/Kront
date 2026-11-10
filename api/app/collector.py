"""Сборщик мастеров из открытых Telegram-чатов (раздел 19 ТЗ).

Запуск: python -m app.collector         — работа (контейнер collector)
        python -m app.collector login   — один раз: вход в аккаунт Telegram, печатает TG_SESSION для .env
Нужны: TG_API_ID, TG_API_HASH (my.telegram.org), TG_SESSION и ключ ИИ (AI_API_KEY) для разбора объявлений.
"""
import asyncio
import json
import os
import random
import re
import sys
import time
from datetime import datetime, timedelta, timezone

API_ID = int(os.getenv("TG_API_ID", "0") or 0)
API_HASH = os.getenv("TG_API_HASH", "")
SESSION = os.getenv("TG_SESSION", "")
SITE = os.getenv("SITE_URL", "")
INVITES_PER_DAY = int(os.getenv("TG_INVITES_PER_DAY", "20"))
NO_WORDS = {"нет", "не", "ne", "no", "nemoj", "не надо", "удалите", "obrišite", "obrisite"}


def log(*a):
    print(datetime.utcnow().strftime("%H:%M:%S"), *a, flush=True)


async def login():
    from telethon import TelegramClient
    from telethon.sessions import StringSession
    async with TelegramClient(StringSession(), API_ID, API_HASH) as c:
        print("\nTG_SESSION=" + c.session.save())


def extract(text: str, cats: dict, dists: dict) -> dict | None:
    from . import ai
    sys_p = ("You read a message from a public Telegram chat in Belgrade. Decide if it is an ADVERTISEMENT BY A SERVICE PROVIDER offering their own services "
             "(not a client looking for someone, not a discussion, not a forwarded ad). Return JSON: {\"offer\": bool, \"name\": str, \"phone\": str, "
             "\"services\": [slugs], \"districts\": [slugs], \"langs\": [\"sr\"|\"ru\"|\"en\"], \"price_from\": int}. "
             "Use ONLY slugs from these lists. Services: " + json.dumps(cats, ensure_ascii=False) + ". Districts: " + json.dumps(dists, ensure_ascii=False) +
             ". If unsure about a field, leave it empty. price_from in RSD, 0 if not stated.")
    try:
        d = json.loads(ai.chat(sys_p, text[:2500], json_mode=True, max_tokens=400))
    except Exception as e:
        log("ai error", e)
        return None
    if not d.get("offer"):
        return None
    d["services"] = [s for s in d.get("services", []) if s in cats][:10]
    d["districts"] = [s for s in d.get("districts", []) if s in dists][:12]
    return d if d["services"] else None


def save_master(db, m, d: dict, username: str, src_url: str, text: str):
    from sqlalchemy import select
    from .account import slugify
    from .extra import new_claim_token
    phone = re.sub(r"[^\d+]", "", d.get("phone") or "")[:20]
    keys = [k for k in [username.lower(), phone] if k]
    if not keys or any(db.scalar(select(m.TgStop.id).where(m.TgStop.key == k)) for k in keys):
        return False
    ex = None
    if username:
        ex = db.scalar(select(m.Master).where(m.Master.tg_username == username))
    if not ex and phone:
        ex = db.scalar(select(m.Master).where(m.Master.phone == phone, m.Master.claimed.is_(False)))
    cats = {c.slug: c for c in db.scalars(select(m.Category).where(m.Category.slug.in_(d["services"])))}
    dists = list(db.scalars(select(m.District).where(m.District.slug.in_(d["districts"] or ["vracar"]))))
    if ex:
        if ex.claimed:
            return False
        have = {s.category.slug for s in ex.services}
        for slug, c in cats.items():
            if slug not in have:
                ex.services.append(m.MasterService(category_id=c.id, price_from=int(d.get("price_from") or 0)))
        ex.districts = list({x.id: x for x in [*ex.districts, *dists]}.values())
        db.commit()
        return False
    name = (d.get("name") or username or "Majstor").strip()[:120]
    base = slugify(name)
    slug, i = base, 2
    while db.scalar(select(m.Master.id).where(m.Master.slug == slug)):
        slug, i = f"{base}-{i}", i + 1
    ms = m.Master(slug=slug, name=name, claimed=False, demo=False, level=0, rating=0, reviews_count=0, orders_count=0, reply_min=60,
                  langs=",".join(d.get("langs") or ["sr"]), phone=phone, tg_username=username, source_url=src_url,
                  claim_token=new_claim_token(), about_sr=text[:600], about_ru=text[:600])
    ms.services = [m.MasterService(category_id=c.id, price_from=int(d.get("price_from") or 0)) for c in cats.values()]
    ms.districts = dists
    db.add(ms)
    db.commit()
    return True


async def run():
    from telethon import TelegramClient, events
    from telethon.sessions import StringSession
    from sqlalchemy import select
    from . import models as m, ai
    from .db import SessionLocal
    from .seed import run as seed_run
    seed_run()
    if not (API_ID and API_HASH and SESSION):
        log("сборщик выключен: нет TG_API_ID / TG_API_HASH / TG_SESSION")
        while True:
            await asyncio.sleep(3600)
    client = TelegramClient(StringSession(SESSION), API_ID, API_HASH)
    await client.start()
    log("сборщик запущен")

    @client.on(events.NewMessage(incoming=True))
    async def on_dm(ev):
        if not ev.is_private:
            return
        sender = await ev.get_sender()
        uname = (getattr(sender, "username", "") or "")
        if not uname:
            return
        with SessionLocal() as db:
            ms = db.scalar(select(m.Master).where(m.Master.tg_username == uname, m.Master.claimed.is_(False)))
            if not ms or ms.invite_state not in ("asked", "linked"):
                return
            txt = (ev.raw_text or "").strip().lower()
            ru = bool(re.search(r"[а-яё]", txt)) and not re.search(r"[ђћџљњј]", txt)
            if txt in NO_WORDS or txt.startswith(("нет", "ne ")):
                for k in [uname.lower(), ms.phone]:
                    if k and not db.scalar(select(m.TgStop).where(m.TgStop.key == k)):
                        db.add(m.TgStop(key=k))
                db.delete(ms)
                db.commit()
                await ev.reply("Удалили ваши данные. Больше не напишем." if ru else "Obrisali smo vaše podatke. Nećemo vam više pisati.")
                return
            if ms.invite_state == "asked":
                lang = "ru" if ru else "sr"
                await ev.reply((f"Вот ссылка — войдите через Google и профиль станет вашим: {SITE}/{lang}/preuzmi/{ms.claim_token}" if ru
                                else f"Evo linka — prijavite se preko Google-a i profil postaje vaš: {SITE}/{lang}/preuzmi/{ms.claim_token}"))
                ms.invite_state = "linked"
                db.commit()

    async def collect():
        while True:
            if not ai.enabled:
                log("нет AI_API_KEY — объявления не разбираются")
                await asyncio.sleep(600)
                continue
            with SessionLocal() as db:
                cats = {c.slug: f"{c.name_ru} / {c.name_sr}" for c in db.scalars(select(m.Category).where(m.Category.parent_id.isnot(None)))}
                dists = {d.slug: d.name_sr for d in db.scalars(select(m.District))}
                for src in db.scalars(select(m.TgSource).where(m.TgSource.enabled.is_(True))):
                    try:
                        kw = {"min_id": src.last_msg_id} if src.last_msg_id else {"offset_date": datetime.now(timezone.utc) - timedelta(days=90)}
                        n = 0
                        async for msg in client.iter_messages(src.handle, reverse=True, limit=400, **kw):
                            src.last_msg_id = max(src.last_msg_id, msg.id)
                            text = msg.raw_text or ""
                            if len(text) < 40 or msg.fwd_from:
                                continue
                            sender = await msg.get_sender()
                            if not sender or getattr(sender, "bot", False) or not hasattr(sender, "first_name"):
                                continue
                            d = extract(text, cats, dists)
                            if d and save_master(db, m, d, getattr(sender, "username", "") or "", f"https://t.me/{src.handle}/{msg.id}", text):
                                n += 1
                        src.found += n
                        src.error = ""
                        log(src.handle, "+", n)
                    except Exception as e:
                        src.error = str(e)[:300]
                        log(src.handle, "error", e)
                    src.checked_at = datetime.utcnow()
                    db.commit()
            await asyncio.sleep(600)

    async def invite():
        sent_today, day = 0, datetime.utcnow().date()
        while True:
            if datetime.utcnow().date() != day:
                sent_today, day = 0, datetime.utcnow().date()
            if sent_today < INVITES_PER_DAY and 8 <= (datetime.utcnow().hour + 1) % 24 <= 20:
                with SessionLocal() as db:
                    ms = db.scalar(select(m.Master).where(m.Master.claimed.is_(False), m.Master.hidden.is_(False), m.Master.invite_state == "",
                                                          m.Master.tg_username != "").order_by(m.Master.id))
                    if ms:
                        ru = bool(re.search(r"[а-яё]", (ms.about_ru or "").lower()))
                        svc = ms.services[0].category.name_ru if (ru and ms.services) else (ms.services[0].category.name_sr if ms.services else "")
                        text = (f"Здравствуйте! Ваше объявление ({svc}) мы добавили в бесплатный каталог мастеров Kront в Белграде. "
                                "Прислать ссылку, чтобы вы могли забрать профиль, добавить цены и фото? "
                                "Если не хотите быть в каталоге — ответьте «нет», и мы удалим данные." if ru else
                                f"Zdravo! Vaš oglas ({svc}) smo dodali u besplatan katalog majstora Kront u Beogradu. "
                                "Da vam pošaljemo link da preuzmete profil, dodate cene i fotografije? "
                                "Ako ne želite da budete u katalogu — odgovorite „ne“ i obrisaćemo podatke.")
                        try:
                            await client.send_message(ms.tg_username, text)
                            ms.invite_state = "asked"
                            sent_today += 1
                            log("invite", ms.tg_username)
                        except Exception as e:
                            ms.invite_state = "failed"
                            log("invite error", ms.tg_username, e)
                        db.commit()
            await asyncio.sleep(random.randint(180, 600))

    await asyncio.gather(collect(), invite(), client.run_until_disconnected())


if __name__ == "__main__":
    asyncio.run(login() if sys.argv[1:] == ["login"] else run())
