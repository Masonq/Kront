from sqlalchemy import select, func
from .db import SessionLocal, engine, Base
from . import models as m
from .seed_data import SECTIONS, DISTRICTS, MASTERS, REVIEWS


def seed_catalog(db):
    if db.scalar(select(func.count(m.Category.id))):
        return
    for i, (slug, ru, sr, pru, psr, syn, icon, kids) in enumerate(SECTIONS):
        sec = m.Category(slug=slug, name_ru=ru, name_sr=sr, plural_ru=pru, plural_sr=psr, synonyms=syn, icon=icon, sort=i)
        db.add(sec)
        db.flush()
        for j, (cs, cru, csr, cpru, cpsr, csyn, cicon, unit, urgent) in enumerate(kids):
            db.add(m.Category(parent_id=sec.id, slug=cs, name_ru=cru, name_sr=csr, plural_ru=cpru, plural_sr=cpsr,
                              synonyms=csyn, icon=cicon, unit=unit, urgent=urgent, sort=j))
    for i, (slug, ru, sr, lru, lsr) in enumerate(DISTRICTS):
        db.add(m.District(slug=slug, name_ru=ru, name_sr=sr, loc_ru=lru, loc_sr=lsr, sort=i))
    db.commit()


def seed_demo(db):
    if db.scalar(select(func.count(m.Master.id))):
        return
    cats = {c.slug: c for c in db.scalars(select(m.Category))}
    dists = {d.slug: d for d in db.scalars(select(m.District))}
    for d in MASTERS:
        ms = m.Master(slug=d["slug"], name=d["name"], kind=d["kind"], level=d["level"], rating=d["rating"],
                      reviews_count=d["reviews"], orders_count=d["orders"], reply_min=d["reply"], langs=d["langs"],
                      experience_years=d["exp"], warranty_months=d["warranty"], online=d["online"], urgent=d["urgent"],
                      about_ru=d["about_ru"], about_sr=d["about_sr"], photo=d["photo"], cover=d["cover"], demo=True)
        ms.services = [m.MasterService(category_id=cats[s].id, price_from=p) for s, p in d["services"]]
        ms.districts = [dists[x] for x in d["districts"]]
        ms.works = [m.Work(photo=p, sort=i) for i, p in enumerate(d["works"])]
        db.add(ms)
    db.flush()
    by = {x.slug: x for x in db.scalars(select(m.Master))}
    for slug, author, rating, lang, service, text, tags in REVIEWS:
        db.add(m.Review(master_id=by[slug].id, author=author, rating=rating, lang=lang, service=service, text=text, tags=tags))
    db.commit()


def run():
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed_catalog(db)
        seed_demo(db)


if __name__ == "__main__":
    run()
