import type { Metadata } from "next";
import HeroCard from "@/components/HeroCard";
import Icon from "@/components/Icon";
import LeadForm from "@/components/LeadForm";
import { api } from "@/lib/api";
import { dict, isLang, type Lang } from "@/lib/i18n";
import { alternates } from "@/lib/seo";

type P = { params: Promise<{ lang: string }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const t = dict(lang);
  return { title: t.becomeTitle, description: t.becomeText, alternates: alternates(lang, "postani-majstor") };
}
const ICONS = ["user", "msg", "shield"];
export default async function Page({ params }: P) {
  const lang = (await params).lang as Lang; const t = dict(lang);
  const districts = (await api.districts(lang)) || [];
  return (
    <>
      <HeroCard photo="/demo/w-bw2.jpg" title="kront" sub={t.becomeSub} text={t.becomeTitle} />
      <div className="sheet">
        <div className="benefits">
          {t.benefits.map((b, i) => (
            <div key={b} className="benefit"><span className="ic"><Icon name={ICONS[i]} /></span><span>{b}</span></div>
          ))}
        </div>
        <div style={{ marginTop: 28 }}><LeadForm lang={lang} districts={districts} /></div>
      </div>
    </>
  );
}
