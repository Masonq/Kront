"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "./Icon";
import { apiLang, tx, type Lang } from "@/lib/i18n";
import { d2 } from "@/lib/i18n2";
import { api, uploadPhoto, refreshMe, setMode } from "@/lib/me";

type Sec = { slug: string; name: string; children: { slug: string; name: string }[] };
type Dist = { slug: string; name: string };
type MForm = { name: string; kind: string; services: { slug: string; price_from: number }[]; districts: string[]; about: string; langs: string[];
  phone: string; experience_years: number; warranty_months: number; photo: string; cover: string; works: string[] };
const EMPTY: MForm = { name: "", kind: "private", services: [], districts: [], about: "", langs: ["sr"], phone: "", experience_years: 0, warranty_months: 0, photo: "", cover: "", works: [] };

export default function MasterForm({ lang, sections, districts, initial, defaultName }: { lang: Lang; sections: Sec[]; districts: Dist[]; initial: MForm | null; defaultName: string }) {
  const t = d2(lang);
  const router = useRouter();
  const edit = !!initial;
  const [f, setF] = useState<MForm>(initial || { ...EMPTY, name: defaultName });
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState<string | null>(sections[0]?.slug || null);
  const [busy, setBusy] = useState(false);
  const [up, setUp] = useState(0);
  const [msg, setMsg] = useState("");
  const [slug, setSlug] = useState<string | null>(null);
  const names = Object.fromEntries(sections.flatMap((s) => s.children.map((c) => [c.slug, c.name])));
  const set = <K extends keyof MForm>(k: K, v: MForm[K]) => setF((x) => ({ ...x, [k]: v }));
  useEffect(() => { setMsg(""); }, [step]);

  const toggleSvc = (slug: string) => set("services", f.services.some((s) => s.slug === slug) ? f.services.filter((s) => s.slug !== slug) : f.services.length >= 20 ? f.services : [...f.services, { slug, price_from: 0 }]);
  const toggle = (k: "districts" | "langs", v: string) => set(k, f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v]);
  const okStep = [f.name.trim().length >= 2 && f.services.length > 0, f.districts.length > 0, true, true, true];

  const onFiles = async (files: FileList | null, target: "photo" | "works") => {
    if (!files?.length) return;
    setUp((n) => n + files.length);
    for (const file of Array.from(files)) {
      try {
        const url = await uploadPhoto(file);
        setF((x) => target === "photo" ? { ...x, photo: url } : { ...x, works: [...x.works, url].slice(0, 60) });
      } catch { setMsg(t.err); }
      setUp((n) => n - 1);
    }
  };

  const save = async () => {
    setBusy(true); setMsg("");
    try {
      const r = await api<{ slug: string }>("/api/v1/me/master", { method: "PUT", body: { ...f, lang: apiLang(lang) } });
      setSlug(r.slug); setMsg(t.saved); setMode("master"); await refreshMe();
      if (!edit) router.push(`/${lang}/kabinet`);
      router.refresh();
    } catch { setMsg(t.err); }
    setBusy(false);
  };

  return (
    <div className="req-grid one">
      <div className="form">
        <div className="steps-pills" role="list">
          {t.obSteps.map((s, i) => (
            <button key={s} type="button" role="listitem" className={`chip${i === step ? " on" : ""}`} aria-current={i === step ? "step" : undefined}
              disabled={!edit && i > step && !okStep.slice(0, i).every(Boolean)} onClick={() => setStep(i)}>
              <span className="n">{i < step && okStep[i] ? <Icon name="check" size={12} stroke={3} /> : i + 1}</span>{s}
            </button>
          ))}
        </div>

        {step === 0 && (<>
          <div className="two">
            <label>{t.obName}<input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" /></label>
            <label>{t.obKind}
              <select value={f.kind} onChange={(e) => set("kind", e.target.value)}>
                {Object.entries(t.kinds).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
          </div>
          <fieldset className="fs"><legend>{t.obServices} · {f.services.length}/20</legend>
            <div className="svc-pick">
              {sections.map((s) => {
                const n = s.children.filter((c) => f.services.some((x) => x.slug === c.slug)).length;
                return (
                  <div key={s.slug} className={`svc-group${open === s.slug ? " open" : ""}`}>
                    <button type="button" className="svc-head" onClick={() => setOpen(open === s.slug ? null : s.slug)} aria-expanded={open === s.slug}>
                      <span>{tx(lang, s.name)}</span>{n > 0 && <span className="count-pill">{n}</span>}<Icon name="down" size={16} stroke={2} />
                    </button>
                    {open === s.slug && <div className="chips">{s.children.map((c) => {
                      const on = f.services.some((x) => x.slug === c.slug);
                      return <button key={c.slug} type="button" className={`chip${on ? " on" : ""}`} aria-pressed={on} onClick={() => toggleSvc(c.slug)}>{tx(lang, c.name)}{on && <Icon name="check" size={13} stroke={3} />}</button>;
                    })}</div>}
                  </div>
                );
              })}
            </div>
          </fieldset>
        </>)}

        {step === 1 && (
          <fieldset className="fs"><legend>{t.obDistricts}</legend>
            <div className="chips">{districts.map((d) => {
              const on = f.districts.includes(d.slug);
              return <button key={d.slug} type="button" className={`chip${on ? " on" : ""}`} aria-pressed={on} onClick={() => toggle("districts", d.slug)}>{tx(lang, d.name)}</button>;
            })}</div>
          </fieldset>
        )}

        {step === 2 && (
          <div className="price-list">
            {f.services.map((s) => (
              <label key={s.slug} className="price-row"><span>{tx(lang, names[s.slug] || s.slug)}</span>
                <span className="price-in"><input className="input" inputMode="numeric" value={s.price_from || ""} placeholder="0"
                  onChange={(e) => set("services", f.services.map((x) => x.slug === s.slug ? { ...x, price_from: Number(e.target.value.replace(/\D/g, "")) || 0 } : x))} /><small>RSD</small></span>
              </label>
            ))}
          </div>
        )}

        {step === 3 && (<>
          <div className="photo-row">
            <label className="ava-up" aria-label={t.obPhoto}>
              {f.photo ? <img src={f.photo} alt="" /> : <Icon name="user" size={28} />}
              <input type="file" accept="image/*" onChange={(e) => onFiles(e.target.files, "photo")} hidden />
              <span className="ava-plus"><Icon name="plus" size={14} stroke={3} /></span>
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><b>{t.obPhoto}</b>{up > 0 && <span className="muted">{t.uploading}</span>}</div>
          </div>
          <fieldset className="fs"><legend>{t.obWorks}</legend>
            <div className="works-up">
              {f.works.map((w) => (
                <div key={w} className="wu"><img src={w} alt="" />
                  <button type="button" className="wu-x" aria-label="×" onClick={() => set("works", f.works.filter((x) => x !== w))}><Icon name="close" size={14} stroke={2.6} /></button></div>
              ))}
              <label className="wu add"><Icon name="plus" size={22} stroke={2} /><span>{t.addPhoto}</span>
                <input type="file" accept="image/*" multiple onChange={(e) => onFiles(e.target.files, "works")} hidden /></label>
            </div>
          </fieldset>
          <label>{t.obAbout}<textarea className="textarea" value={f.about} onChange={(e) => set("about", e.target.value)} placeholder={t.obAboutPh} maxLength={2000} /></label>
          <div className="two">
            <label>{t.obExp}<input className="input" inputMode="numeric" value={f.experience_years || ""} onChange={(e) => set("experience_years", Math.min(70, Number(e.target.value.replace(/\D/g, "")) || 0))} /></label>
            <label>{t.obWarranty}<input className="input" inputMode="numeric" value={f.warranty_months || ""} onChange={(e) => set("warranty_months", Math.min(120, Number(e.target.value.replace(/\D/g, "")) || 0))} /></label>
          </div>
          <fieldset className="fs"><legend>{t.obLangs}</legend>
            <div className="chips">{[["sr", "Srpski"], ["ru", "Русский"], ["en", "English"]].map(([k, v]) => (
              <button key={k} type="button" className={`chip${f.langs.includes(k) ? " on" : ""}`} aria-pressed={f.langs.includes(k)} onClick={() => toggle("langs", k)}>{v}</button>
            ))}</div>
          </fieldset>
        </>)}

        {step === 4 && (
          <label>{t.obPhone}<input className="input" type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+381…" autoComplete="tel" /></label>
        )}

        <div className="form-actions">
          {step > 0 ? <button type="button" className="btn ghost" onClick={() => setStep(step - 1)}><Icon name="left" size={18} stroke={2} />{d2(lang).obSteps[step - 1]}</button> : <span />}
          <span className="actions-right">
            {msg && <span className={msg === t.saved ? "ok-msg" : "err"}>{msg}</span>}
            {slug && edit && <Link href={`/${lang}/majstor/${slug}`} className="btn ghost">{t.viewProfile}</Link>}
            {step < 4 && !edit ? (
              <button type="button" className="btn lg" disabled={!okStep[step]} onClick={() => setStep(step + 1)}>{t.obSteps[step + 1]}<Icon name="right" size={18} stroke={2} /></button>
            ) : (
              <button type="button" className="btn lg" disabled={busy || up > 0 || !okStep[0] || !okStep[1]} onClick={save}>{edit ? t.save : t.publish}</button>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
