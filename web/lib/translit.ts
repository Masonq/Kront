// Сербская латиница → кириллица (диграфы lj, nj, dž обрабатываются первыми)
const DIGRAPHS: [RegExp, string][] = [
  [/Lj/g, "Љ"], [/LJ/g, "Љ"], [/lj/g, "љ"],
  [/Nj/g, "Њ"], [/NJ/g, "Њ"], [/nj/g, "њ"],
  [/Dž/g, "Џ"], [/DŽ/g, "Џ"], [/dž/g, "џ"],
];
const MAP: Record<string, string> = {
  a: "а", b: "б", c: "ц", č: "ч", ć: "ћ", d: "д", đ: "ђ", e: "е", f: "ф", g: "г", h: "х", i: "и", j: "ј", k: "к", l: "л",
  m: "м", n: "н", o: "о", p: "п", r: "р", s: "с", š: "ш", t: "т", u: "у", v: "в", z: "з", ž: "ж",
};

export function toCyr(input: string): string {
  // не трогаем бренд, ссылки и единицы измерения
  return input
    .split(/(Kront|kront|RSD|https?:\/\/\S+|⌘K)/g)
    .map((part, i) => {
      if (i % 2 === 1) return part;
      let s = part;
      for (const [re, rep] of DIGRAPHS) s = s.replace(re, rep);
      return s.replace(/[A-Za-zčćđšžČĆĐŠŽ]/g, (ch) => {
        const low = ch.toLowerCase();
        const c = MAP[low];
        if (!c) return ch;
        return ch === low ? c : c.toUpperCase();
      });
    })
    .join("");
}
