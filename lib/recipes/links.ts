// Picks the written-recipe links out of a YouTube description (most have dozens of shop and social links).

// Never a recipe page: shopping, gear, social, music, and YouTube itself.
const SKIP_HOSTS =
  /(^|\.)(amzn\.to|amazon\.com|geni\.us|youtube\.com|youtu\.be|instagram\.com|facebook\.com|tiktok\.com|twitter\.com|x\.com|threads\.net|pinterest\.com|linkedin\.com|patreon\.com|ko-fi\.com|spotify\.com|epidemicsound\.com|discord\.gg|linktr\.ee)$/i;
// Sponsor lines mention "recipe" too ("this recipe… Go to seed.com/brian and use code…").
const SPONSOR = /\b(use code|promo|discount|go to)\b|sponsor|% off/i;
// Blog home pages, freebie packs, and category pages: not one recipe.
const NOT_ONE_RECIPE = /^(recipes?|free-recipes?)$/i;
const LISTING = /\/(category|tag)\//i;

const URL_PATTERN = /https?:\/\/[^\s<>"()]+/g;

/** Recipe links in the order worth trying: addresses that say "recipe" first, then links on a line that does. */
export function recipeLinks(description: string): string[] {
  const strong: string[] = [];
  const weak: string[] = [];
  for (const line of description.split("\n")) {
    if (SPONSOR.test(line)) continue;
    for (const match of line.matchAll(URL_PATTERN)) {
      const link = match[0].replace(/[.,;:!?'’]+$/, "");
      let url: URL;
      try {
        url = new URL(link);
      } catch {
        continue;
      }
      if (SKIP_HOSTS.test(url.hostname)) continue;
      const segments = url.pathname.split("/").filter(Boolean);
      if (segments.length === 0 || NOT_ONE_RECIPE.test(segments.at(-1)!) || LISTING.test(url.pathname)) continue;
      if (/recipe/i.test(url.pathname)) strong.push(link);
      // "Recipe: <link>" counts; a paragraph that said "recipe" 200 characters earlier doesn't.
      else if (/recipe/i.test(line.slice(Math.max(0, match.index! - 40), match.index))) weak.push(link);
    }
  }
  return [...new Set([...strong, ...weak])];
}
