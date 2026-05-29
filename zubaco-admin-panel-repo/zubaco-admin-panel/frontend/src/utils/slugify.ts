export function slugifyGameName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, "-");
}
