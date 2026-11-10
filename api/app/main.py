import re
import unicodedata
from fastapi import FastAPI, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, or_
from sqlalchemy.orm import Session
from .db import get_db
from . import models as m
from .seed import run as seed_run

app = FastAPI(title="Kront API", version="0.1.0", docs_url="/api/docs", openapi_url="/api/openapi.json")

CYR = {"а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "ђ": "dj", "е": "e", "ж": "z", "з": "z", "и": "i", "ј": "j", "к": "k",
       "л": "l", "љ": "lj", "м": "m", "н": "n", "њ": "nj", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "ћ": "c", "у": "u",
       "ф": "f", "х": "h", "ц": "c", "ч": "c", "џ": "dz", "ш": "s", "й": "j", "ё": "e", "ы": "y", "э": "e", "ю": "ju", "я": "ja",
       "щ": "s", "ъ": "", "ь": ""}


def norm(s: str) -> str:
    s = (s or "").lower().replace("đ", "dj")
    s = unicodedata.normalize("NFKD", s)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    return s


def norm_lat(s: str) -> str:
    return "".join(CYR.get(ch, ch) for ch in norm(s))


@app.on_event("startup")
def _startup():
    seed_run()
    from .db import SessionLocal
    with SessionLocal() as db:
        for c in db.scalars(select(m.Category).where(m.Category.parent_id.is_(None))):
            SECTION_IDS[c.slug] = c.id


def loc(obj, field: str, lang: str) -> str:
    return getattr(obj, f"{field}_ru") if lang == "ru" else getattr(obj, f"{field}_sr")


def cat_out(c: m.Category, lang: str):
    return {"id": c.id, "slug": c.slug, "name": loc(c, "name", lang), "plural": loc(c, "plural", lang), "icon": c.icon,
            "unit": c.unit, "urgent": c.urgent, "parent_id": c.parent_id}


def dist_out(d: m.District, lang: str):
    return {"slug": d.slug, "name": loc(d, "name", lang), "loc": loc(d, "loc", lang)}


SECTION_IDS: dict[str, int] = {}


def master_card(ms: m.Master, lang: str, service_slug: str | None = None):
    svc = ms.services
    main = next((s for s in svc if service_slug and (s.category.slug == service_slug or (s.category.parent_id and s.category.parent_id == SECTION_IDS.get(service_slug)))), svc[0] if svc else None)
    prices = [s.price_from for s in svc if s.price_from]
    return {
        "slug": ms.slug, "name": ms.name, "kind": ms.kind, "photo": ms.photo, "cover": ms.cover, "level": ms.level,
        "rating": ms.rating, "reviews": ms.reviews_count, "orders": ms.orders_count, "reply_min": ms.reply_min,
        "langs": ms.langs.split(","), "online": ms.online, "urgent": ms.urgent, "demo": ms.demo,
        "services": [loc(s.category, "name", lang) for s in svc],
        "price_from": (main.price_from if main else (min(prices) if prices else 0)),
        "districts": [loc(d, "name", lang) for d in ms.districts],
        "works": [w.photo for w in ms.works],
    }


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/v1/catalog")
def catalog(lang: str = "sr", db: Session = Depends(get_db)):
    rows = db.scalars(select(m.Category).order_by(m.Category.sort)).all()
    by_cat: dict[int, set[int]] = {}
    for s in db.scalars(select(m.MasterService)):
        by_cat.setdefault(s.category_id, set()).add(s.master_id)
    counts = {k: len(v) for k, v in by_cat.items()}
    sections = []
    for sec in [r for r in rows if r.parent_id is None]:
        kids = [r for r in rows if r.parent_id == sec.id]
        SECTION_IDS[sec.slug] = sec.id
        uniq = set().union(*[by_cat.get(k.id, set()) for k in kids]) if kids else set()
        sections.append({**cat_out(sec, lang), "count": len(uniq),
                         "children": [{**cat_out(k, lang), "count": counts.get(k.id, 0)} for k in kids]})
    return sections


@app.get("/api/v1/districts")
def districts(lang: str = "sr", db: Session = Depends(get_db)):
    return [dist_out(d, lang) for d in db.scalars(select(m.District).order_by(m.District.sort))]


@app.get("/api/v1/category/{slug}")
def category(slug: str, lang: str = "sr", db: Session = Depends(get_db)):
    c = db.scalar(select(m.Category).where(m.Category.slug == slug))
    if not c:
        raise HTTPException(404)
    parent = db.get(m.Category, c.parent_id) if c.parent_id else None
    kids = db.scalars(select(m.Category).where(m.Category.parent_id == c.id).order_by(m.Category.sort)).all()
    return {**cat_out(c, lang), "parent": cat_out(parent, lang) if parent else None,
            "children": [cat_out(k, lang) for k in kids]}


@app.get("/api/v1/masters")
def masters(lang: str = "sr", service: str | None = None, district: str | None = None, verified: bool = False,
            speaks: str | None = None, online: bool = False, urgent: bool = False, rating: float = 0,
            sort: str = "recommended", limit: int = Query(30, le=100), slugs: str | None = None,
            db: Session = Depends(get_db)):
    q = select(m.Master)
    if slugs:
        wanted = [x for x in slugs.split(",") if x][:50]
        q = q.where(m.Master.slug.in_(wanted))
    cat_ids = []
    if service:
        c = db.scalar(select(m.Category).where(m.Category.slug == service))
        if not c:
            raise HTTPException(404, "service")
        cat_ids = [c.id] + list(db.scalars(select(m.Category.id).where(m.Category.parent_id == c.id)))
        q = q.where(m.Master.services.any(m.MasterService.category_id.in_(cat_ids)))
    if district:
        q = q.where(m.Master.districts.any(m.District.slug == district))
    if verified:
        q = q.where(m.Master.level >= 1)
    if speaks:
        q = q.where(m.Master.langs.like(f"%{speaks}%"))
    if online:
        q = q.where(m.Master.online.is_(True))
    if urgent:
        q = q.where(m.Master.urgent.is_(True))
    if rating:
        q = q.where(m.Master.rating >= rating)
    items = list(db.scalars(q))

    def score(x: m.Master):
        # байесовский рейтинг + верификация + скорость ответа + онлайн
        C, M = 4.5, 20
        bayes = (C * M + x.rating * x.reviews_count) / (M + x.reviews_count)
        return bayes * 10 + x.level * 2 + (3 if x.online else 0) - min(x.reply_min, 60) / 20
    if sort == "rating":
        items.sort(key=lambda x: (x.rating, x.reviews_count), reverse=True)
    elif sort == "price":
        items.sort(key=lambda x: min([s.price_from for s in x.services] or [0]))
    else:
        items.sort(key=score, reverse=True)
    svc_slug = service
    return {"total": len(items), "online": sum(1 for x in items if x.online),
            "items": [master_card(x, lang, svc_slug) for x in items[:limit]]}


@app.get("/api/v1/masters/{slug}")
def master(slug: str, lang: str = "sr", db: Session = Depends(get_db)):
    ms = db.scalar(select(m.Master).where(m.Master.slug == slug))
    if not ms:
        raise HTTPException(404)
    reviews = db.scalars(select(m.Review).where(m.Review.master_id == ms.id).order_by(m.Review.created_at.desc())).all()
    return {**master_card(ms, lang), "about": ms.about_ru if lang == "ru" else ms.about_sr,
            "experience_years": ms.experience_years, "warranty_months": ms.warranty_months, "claimed": ms.claimed,
            "service_list": [{"slug": s.category.slug, "name": loc(s.category, "name", lang), "price_from": s.price_from,
                              "unit": s.category.unit} for s in ms.services],
            "district_list": [dist_out(d, lang) for d in ms.districts],
            "review_list": [{"author": r.author, "rating": r.rating, "text": r.text, "service": r.service,
                         "tags": [t for t in r.tags.split(",") if t], "date": r.created_at.date().isoformat(), "lang": r.lang}
                        for r in reviews]}


@app.get("/api/v1/search")
def search(q: str, lang: str = "sr", db: Session = Depends(get_db)):
    nq = norm_lat(q).strip()
    if len(nq) < 2:
        return {"categories": [], "masters": []}
    words = [w for w in re.split(r"\s+", nq) if len(w) > 1]
    hits = []
    for c in db.scalars(select(m.Category)):
        hay = norm_lat(" ".join([c.name_ru, c.name_sr, c.plural_ru, c.plural_sr, c.synonyms, c.slug]))
        sc = sum(3 if f" {w}" in f" {hay}" else (1 if len(w) >= 4 and f" {w[:4]}" in f" {hay}" else 0) for w in words)
        if sc:
            hits.append((sc + (1 if c.parent_id else 0), c))
    hits.sort(key=lambda t: t[0], reverse=True)
    masters_ = [x for x in db.scalars(select(m.Master)) if all(w in norm_lat(x.name) for w in words)]
    return {"categories": [cat_out(c, lang) for _, c in hits[:6]],
            "masters": [master_card(x, lang) for x in masters_[:4]]}


class RequestIn(BaseModel):
    service: str | None = None
    district: str | None = None
    master: str | None = None
    masters: list[str] = Field(default_factory=list, max_length=3)
    description: str = Field(min_length=10, max_length=3000)
    when: str = "asap"
    budget: str = ""
    contact_name: str = Field(min_length=2, max_length=80)
    contact: str = Field(min_length=5, max_length=120)
    lang: str = "sr"
    urgent: bool = False


@app.post("/api/v1/requests", status_code=201)
def create_request(body: RequestIn, db: Session = Depends(get_db)):
    c = db.scalar(select(m.Category).where(m.Category.slug == body.service)) if body.service else None
    d = db.scalar(select(m.District).where(m.District.slug == body.district)) if body.district else None
    ms = db.scalar(select(m.Master).where(m.Master.slug == body.master)) if body.master else None
    picked = [x for x in body.masters if db.scalar(select(m.Master.id).where(m.Master.slug == x))]
    r = m.ServiceRequest(category_id=c.id if c else None, district_id=d.id if d else None, master_id=ms.id if ms else None,
                         masters=",".join(picked),
                         description=body.description.strip(), when=body.when, budget=body.budget,
                         contact_name=body.contact_name.strip(), contact=body.contact.strip(), lang=body.lang, urgent=body.urgent)
    db.add(r)
    db.commit()
    return {"id": r.id, "status": r.status}


@app.get("/api/v1/sitemap")
def sitemap(db: Session = Depends(get_db)):
    cats = db.scalars(select(m.Category)).all()
    dists = db.scalars(select(m.District)).all()
    mas = db.scalars(select(m.Master.slug)).all()
    pairs = set()
    for s in db.scalars(select(m.MasterService)):
        for d in s.category and db.get(m.Master, s.master_id).districts:
            pairs.add((s.category.slug, d.slug))
    return {"categories": [c.slug for c in cats], "districts": [d.slug for d in dists], "masters": list(mas),
            "pairs": sorted(pairs)}


class LeadIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    contact: str = Field(min_length=5, max_length=120)
    service: str = Field(default="", max_length=200)
    district: str = Field(default="", max_length=80)
    lang: str = "sr"


@app.post("/api/v1/master-leads", status_code=201)
def master_lead(body: LeadIn, db: Session = Depends(get_db)):
    lead = m.MasterLead(name=body.name.strip(), contact=body.contact.strip(), service=body.service.strip(),
                        district=body.district, lang=body.lang)
    db.add(lead)
    db.commit()
    return {"id": lead.id}
