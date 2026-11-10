// Фото разделов (CC0, stocksnap.io). Нет фото — плитка с иконкой на песочном фоне.
const WITH_PHOTO = new Set([
  "remont", "vodoinstalacije", "elektrika", "klima-i-aparati", "brave-i-sigurnost", "ciscenje", "selidbe", "auto",
  "deca-i-nega", "casovi", "racunari", "ljubimci", "basta", "dogadjaji", "dokumenti",
]);
export function sectionPhoto(slug?: string | null): string | null {
  return slug && WITH_PHOTO.has(slug) ? `/sec/${slug}.jpg` : null;
}
