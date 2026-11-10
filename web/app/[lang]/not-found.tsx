import HeroCard from "@/components/HeroCard";
import { dict } from "@/lib/i18n";
export default function NotFound() {
  const t = dict("sr");
  return <HeroCard tall photo="/sec/brave-i-sigurnost.jpg" title="404" sub={t.notFound} text={t.nfText} cta={t.toHome} href="/" />;
}
