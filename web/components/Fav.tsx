"use client";
import Icon from "./Icon";
import { FAV, EMPTY_STR, useStored, write } from "@/lib/local";

export default function FavButton({ slug, label, className = "fav" }: { slug: string; label: string; className?: string }) {
  const fav = useStored<string[]>(FAV, EMPTY_STR);
  const on = fav.includes(slug);
  return (
    <button type="button" className={className} aria-label={label} aria-pressed={on}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); write(FAV, on ? fav.filter((x) => x !== slug) : [...fav, slug]); }}>
      <Icon name="heart" size={18} fill={on} />
    </button>
  );
}
