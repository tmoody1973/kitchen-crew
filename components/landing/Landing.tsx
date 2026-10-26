import Image from "next/image";
import Link from "next/link";
import { ArrowDown, Play } from "lucide-react";
import TallyStall from "./TallyStall";

// Swap in the demo video link once it's published (6-ship). Until then the main button walks the stalls instead.
const DEMO_VIDEO_URL: string | null = null;
const GITHUB_URL = "https://github.com/tmoody1973/kitchen-crew";

function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

function Actions() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {DEMO_VIDEO_URL ? (
        <a href={DEMO_VIDEO_URL} target="_blank" rel="noopener noreferrer" className="btn-press text-lg">
          <Play size={20} strokeWidth={3} aria-hidden /> Watch the demo
        </a>
      ) : (
        <a href="#stalls" className="btn-press text-lg">
          <ArrowDown size={20} strokeWidth={3} aria-hidden /> See how it works
        </a>
      )}
      <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="btn-crate">
        <GitHubMark /> See the code on GitHub
      </a>
    </div>
  );
}

/** A painted stall sign: the section's heading, hung over its stall. */
function StallSign({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="stall-sign font-sign self-start text-2xl sm:text-3xl">
      {children}
    </h2>
  );
}

function PhoneShot({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="mx-auto w-full max-w-[19rem] rounded-[2.4rem] border-[9px] border-slate bg-slate shadow-[0_24px_40px_-24px_rgb(29_36_31/0.55)]">
      <Image src={src} alt={alt} width={780} height={1688} sizes="(min-width: 1024px) 19rem, 80vw" className="rounded-[1.7rem]" />
    </div>
  );
}

function LaptopShot({ src, alt, height }: { src: string; alt: string; height: number }) {
  return (
    <div className="w-full">
      {/* Framed in the stall's crate wood, like the tally board, on a counter edge */}
      <div className="rounded-t-[18px] border-[6px] border-b-0 border-crate bg-crate shadow-[0_24px_40px_-24px_rgb(29_36_31/0.55)]">
        <Image src={src} alt={alt} width={1600} height={height} sizes="(min-width: 1024px) 44rem, 92vw" className="rounded-t-xl" />
      </div>
      <div className="mx-[-3%] h-3.5 rounded-b-lg bg-crate" aria-hidden="true" />
    </div>
  );
}

function Facts({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col">
      {items.map((t) => (
        <li key={t} className="row-rule py-2.5 font-bold">
          {t}
        </li>
      ))}
    </ul>
  );
}

const bleed = "mx-[calc(50%-50vw)] px-4 sm:px-8";
const inner = "mx-auto w-full max-w-6xl";

/** One stall in the market: a narrow awning edge, its sign hanging from it, then what the stall sells. */
function Stall({ id, title, tone, children }: { id: string; title: string; tone: string; children: React.ReactNode }) {
  return (
    <section className={`${bleed} ${tone}`} aria-labelledby={id}>
      <div className="awning -mx-4 h-5 sm:-mx-8" aria-hidden="true" />
      <div className={`${inner} flex flex-col gap-8 pb-16 lg:gap-10 lg:pb-24`}>
        <StallSign id={id}>{title}</StallSign>
        {children}
      </div>
    </section>
  );
}

// The signed-out front door: a market you walk, one stall per part of the week.
export default function Landing() {
  return (
    <div className="-mt-4 lg:-mt-6">
      {/* The market awning and sign */}
      <div className={`${bleed} awning h-7 sm:h-9`} aria-hidden="true" />
      <header className={bleed}>
        <div className={`${inner} flex items-center justify-between gap-4 py-4`}>
          <span className="font-sign text-3xl text-tomato sm:text-4xl">Mise</span>
          <nav className="flex items-center gap-4 text-sm font-extrabold" aria-label="Site">
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:underline">
              <GitHubMark /> GitHub
            </a>
            <Link href="/plan" className="rounded-full border-2 border-ink px-3 py-1 hover:bg-line">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      {/* First viewport: the promise on the left, the tally stall proving it on the right */}
      <section className={bleed} aria-labelledby="promise">
        <div className={`${inner} grid gap-10 pb-16 pt-6 lg:grid-cols-12 lg:items-center lg:gap-12 lg:pb-24 lg:pt-10`}>
          <div className="flex flex-col gap-6 lg:col-span-7">
            <h1 id="promise" className="font-sign text-[2.75rem] leading-[0.98] sm:text-6xl lg:text-7xl">
              Stay under budget. <span className="whitespace-nowrap text-tomato">Eat well.</span>
            </h1>
            <p className="max-w-[34rem] text-lg font-bold text-ink-soft sm:text-xl">
              Mise plans your family&apos;s dinners in a chat, prices every ingredient at your own Pick &apos;n Save or Metro
              Market, turns the plan into a shopping list, and keeps a live tally while you shop.
            </p>
            <Actions />
            <p className="hidden text-sm font-bold text-ink-soft lg:block">
              A hackathon project built for one Milwaukee family&apos;s kitchen. Sign-in is for the household.
            </p>
          </div>
          <div className="flex flex-col gap-3 lg:col-span-5">
            <StallSign>The tally</StallSign>
            <TallyStall />
          </div>
        </div>
      </section>

      {/* The stalls */}
      <div id="stalls" className="scroll-mt-4">
        <Stall id="stall-crew" title="Plan with the crew" tone="bg-white">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-5">
              <PhoneShot src="/landing/crew-phone.webp" alt="The crew's plan card: three dinners priced at Pick 'n Save, pantry chips, a 'Fits your budget' stamp, and Use this plan." />
            </div>
            <div className="flex flex-col gap-5 lg:col-span-7">
              <p className="max-w-[36rem] text-xl font-bold">
                Ask for dinners the way you&apos;d text a friend. The crew plans with your saved recipes and pantry, sizes every
                dinner for your household, and prices each ingredient at your store before you commit.
              </p>
              <Facts
                items={[
                  "Real Kroger prices for whole packages, not per-ounce guesses.",
                  "Out of soy sauce? Tap its pantry chip and it gets priced.",
                  "Use the plan, or add it to what's already on the week.",
                ]}
              />
            </div>
          </div>
        </Stall>

        <Stall id="stall-board" title="See the week" tone="bg-ground">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="flex flex-col gap-5 lg:col-span-4">
              <p className="text-xl font-bold">
                Dinners land on a week board. Move Tuesday to Friday or push one to next week, and the shopping list rebuilds
                itself.
              </p>
              <Facts
                items={[
                  "One week or two, each with its own budget and list.",
                  "An Ideas column for dinners that don't have a day yet.",
                  "On a phone, swipe through the week one day at a time.",
                ]}
              />
            </div>
            <div className="lg:col-span-8">
              <div className="lg:hidden">
                <PhoneShot src="/landing/week-phone.webp" alt="The week board on a phone: a day strip, then Sunday with Creamy Miso Chicken as a photo card." />
              </div>
              <div className="hidden lg:block">
                <LaptopShot src="/landing/week-laptop-v2.webp" height={772} alt="The week board on a laptop: Din Tai Fung Green Beans waiting in Ideas, then Sunday, Monday, and Tuesday with Creamy Miso Chicken, Ground Beef Bulgogi Spaghetti, and Peruvian Chicken as photo cards." />
              </div>
            </div>
          </div>
        </Stall>

        <Stall id="stall-list" title="Shop with the tally" tone="bg-white">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-5">
              <PhoneShot src="/landing/list-phone-v2.webp" alt="The shopping list on a phone: the tally board at $24.56 of $225, the store picker, Compare stores, Scan, Send to Instacart, and a paid row marked 'Nice! $0.30 under the $3.99 estimate'." />
            </div>
            <div className="flex flex-col gap-5 lg:col-span-7">
              <p className="max-w-[36rem] text-xl font-bold">
                Every row shows the shelf price. Type what you actually paid and the row turns green or orange, and says so in
                words, while the tally at the top keeps score.
              </p>
              <Facts
                items={[
                  "Compare your list at two stores, side by side.",
                  "Scan a barcode to add an item, or read a deli sticker's price.",
                  "Send everything still unpaid to Instacart.",
                ]}
              />
            </div>
          </div>
        </Stall>

        <Stall id="stall-shelf" title="Cook what you love" tone="bg-ground">
          <div className="grid gap-5 lg:grid-cols-12 lg:items-end lg:gap-14">
            <p className="max-w-[38rem] text-xl font-bold lg:col-span-7">
              Sync your YouTube recipe playlist. The first time you open a recipe, Mise reads the written version the channel
              links, or the video itself, then tags it so you can search by mood.
            </p>
            <div className="lg:col-span-5">
              <Facts
                items={[
                  "Ingredients scale to your household, in US or metric.",
                  "Tags like quick, spicy, and comfort, added for you.",
                  "Send any recipe to Instacart at the servings you need.",
                ]}
              />
            </div>
          </div>
          <div className="grid items-end gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-4">
              <PhoneShot src="/landing/recipes-phone.webp" alt="My Recipes on a phone: Sync my playlist, a search box, tag chips, and recipe rows with photos and tags." />
            </div>
            <div className="lg:col-span-8">
              <div className="lg:hidden">
                <PhoneShot src="/landing/recipe-phone.webp" alt="Creamy Miso Chicken on a phone: photo, tags, time, servings, and ingredients with a US or Metric toggle." />
              </div>
              <div className="hidden lg:block">
                <LaptopShot src="/landing/recipe-laptop.webp" height={1000} alt="A recipe on a laptop: Creamy Miso Chicken with its photo and tags, ingredients scaled to 3½ servings, and numbered steps." />
              </div>
            </div>
          </div>
        </Stall>
      </div>

      {/* A quiet passage: why the totals can be trusted */}
      <section className={`${bleed} bg-slate py-16 text-chalk lg:py-20`} aria-labelledby="money">
        <div className={`${inner} grid gap-8 lg:grid-cols-12 lg:gap-14`}>
          <h2 id="money" className="font-sign text-3xl leading-tight text-tag sm:text-4xl lg:col-span-5">
            The money math is plain code, never the AI.
          </h2>
          <ul className="flex flex-col gap-4 text-lg font-bold lg:col-span-7">
            <li>Totals come from real store prices and simple arithmetic you can read in the repo.</li>
            <li>The crew picks dinners and products. It never adds up your bill.</li>
            <li>Green means under the estimate and orange means over, always with words beside the color.</li>
          </ul>
        </div>
      </section>

      {/* The close */}
      <section className={bleed} aria-labelledby="close">
        <div className={`${inner} flex flex-col items-start gap-6 py-16 lg:py-24`}>
          <h2 id="close" className="font-sign text-4xl leading-none sm:text-6xl">
            This week, <span className="whitespace-nowrap text-tomato">stay under.</span>
          </h2>
          <Actions />
        </div>
      </section>
      <div className={`${bleed} awning h-5`} aria-hidden="true" />
      <footer className={bleed}>
        <p className={`${inner} py-6 text-sm font-bold text-ink-soft`}>
          Mise · built with Next.js, Convex, Clerk, Claude, and the Kroger API · a Devpost hackathon project
        </p>
      </footer>
    </div>
  );
}
