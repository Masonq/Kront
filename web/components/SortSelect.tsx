"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export default function SortSelect({ labels, value }: { labels: Record<string, string>; value: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const path = usePathname();
  return (
    <select className="select" aria-label="Sort" value={value} onChange={(e) => {
      const p = new URLSearchParams(sp.toString());
      if (e.target.value === "recommended") p.delete("sort"); else p.set("sort", e.target.value);
      router.push(`${path}${p.size ? "?" + p : ""}`);
    }}>
      {Object.entries(labels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
    </select>
  );
}
