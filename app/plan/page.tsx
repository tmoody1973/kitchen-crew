"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import TallyHeader from "@/components/TallyHeader";
import ChatMenu from "@/components/ChatMenu";
import WeekRail from "@/components/WeekRail";
import PlanResult from "@/components/cards/PlanResult";
import BudgetCard, { type BudgetSuggestion } from "@/components/cards/BudgetCard";
import RecipeCard, { type RecipeImport } from "@/components/cards/RecipeCard";
import SalesCard, { type SalesResult } from "@/components/cards/SalesCard";
import RecipeSearchCard, { type RecipeSearch } from "@/components/cards/RecipeSearchCard";
import FoodHelpCard, { type FoodHelpResult } from "@/components/FoodHelpCard";
import PricingProgress from "@/components/cards/PricingProgress";
import type { PlanToolOutput } from "@/lib/meal-plan";
import { ArrowUp, BadgePercent, BookOpen, Calculator, NotebookPen, Search, Store } from "lucide-react";

/** A quiet working line while a tool runs. */
function Working({ icon: Icon, children }: { icon: typeof BookOpen; children: React.ReactNode }) {
  return (
    <p className="crate flex animate-pulse items-center gap-2 px-4 py-2 font-bold text-ink-soft">
      <Icon size={18} strokeWidth={2.5} aria-hidden /> {children}
    </p>
  );
}

const SUGGESTIONS = ["What should we cook this week?", "Plan 3 days from my saved recipes", "Something cheap and cozy for 2 nights", "What's on sale in my recipes?"];

type Removed = Record<string, number[]>; // plan card (tool call id) → removed dinner indexes

// Which chat to show: ?chat=<id>, a fresh one (?new=1 or ?ask=budget), or your most recent.
export default function PlanPage() {
  const [params, setParams] = useState<URLSearchParams | null>(null);
  useEffect(() => setParams(new URLSearchParams(window.location.search)), []);
  const chats = useQuery(api.chats.list);

  // Decide once when the page opens, so a chat saving for the first time doesn't swap the view mid-conversation.
  const [chatId, setChatId] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (chatId !== undefined || !params || chats === undefined) return;
    const wantsNew = params.has("new") || params.get("ask") === "budget";
    setChatId(params.get("chat") ?? (wantsNew ? null : (chats[0]?._id ?? null)));
  }, [chatId, params, chats]);
  const chat = useQuery(api.chats.get, chatId ? { id: chatId } : "skip");

  if (!params || chatId === undefined || (chatId && chat === undefined)) return null;

  const saved = chatId && chat ? chat : null;
  return (
    <ChatView
      key={saved?._id ?? "new"}
      chatId={saved?._id}
      initialMessages={saved ? (JSON.parse(saved.messagesJson) as UIMessage[]) : []}
      initialRemoved={saved ? (JSON.parse(saved.removedJson) as Removed) : {}}
      askBudget={params.get("ask") === "budget"}
    />
  );
}

function ChatView({
  chatId,
  initialMessages,
  initialRemoved,
  askBudget,
}: {
  chatId?: string;
  initialMessages: UIMessage[];
  initialRemoved: Removed;
  askBudget: boolean;
}) {
  const router = useRouter();
  const saveChat = useMutation(api.chats.save);
  const { messages, sendMessage, status, error, regenerate } = useChat({ id: chatId, messages: initialMessages });
  const [input, setInput] = useState("");
  const [removedByPlan, setRemovedByPlan] = useState<Removed>(initialRemoved);
  const savedId = useRef(chatId);
  const askedBudget = useRef(false);
  const bottom = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" }); // braces: newer browsers return a Promise here
  }, [messages, status]);

  // "Let the crew help" on Budget Setup opens /plan?ask=budget and starts the budget conversation.
  useEffect(() => {
    if (!askBudget || askedBudget.current || messages.length > 0) return;
    askedBudget.current = true;
    sendMessage({ text: "Can you help me figure out a weekly grocery budget for my family?" });
  }, [askBudget, messages.length, sendMessage]);

  // Save after each crew reply (and when dinners are removed), so you can leave and come back.
  useEffect(() => {
    if (status !== "ready" || messages.length === 0) return;
    const firstText = messages[0].parts.find((p) => p.type === "text");
    const title = firstText && "text" in firstText ? firstText.text : "New chat";
    saveChat({
      id: savedId.current,
      title,
      messagesJson: JSON.stringify(messages),
      removedJson: JSON.stringify(removedByPlan),
    })
      .then((id) => {
        if (savedId.current !== id) {
          savedId.current = id;
          router.replace(`/plan?chat=${id}`); // a reload or the back button returns to this chat
        }
      })
      .catch((err) => console.error("Couldn't save the chat:", err));
  }, [status, messages, removedByPlan, saveChat, router]);

  function latestPlanRemovals(): string[] {
    const planParts = messages.flatMap((m) => m.parts.filter((p) => p.type === "tool-proposeMealPlan"));
    const latest = planParts[planParts.length - 1];
    if (!latest || latest.type !== "tool-proposeMealPlan" || latest.state !== "output-available") return [];
    const out = latest.output as PlanToolOutput;
    if (out.progress || out.needsStore) return [];
    return (removedByPlan[latest.toolCallId] ?? []).map((i) => `${out.plan.meals[i]?.day}: ${out.plan.meals[i]?.name}`);
  }

  function send(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    sendMessage({ text: input.trim() }, { body: { removedMeals: latestPlanRemovals() } });
    setInput("");
  }

  return (
    // Laptop: the chat on the left, the tally and this week's dinners pinned on the right. Phone: tally on top, then the chat.
    <div className="flex flex-col gap-4 pb-28 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8">
      <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:col-start-2 lg:row-start-1">
        <TallyHeader />
        <WeekRail />
      </aside>
      <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-start-1">
      <ChatMenu currentId={savedId.current} />

      {messages.length === 0 && (
        <div className="flex flex-col gap-3">
          <p className="crate p-4 font-bold">
            Hey! I&apos;m your kitchen crew. Ask what to cook, paste a recipe link, or have me plan from your saved
            recipes. I&apos;ll price every dinner at your store.
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => sendMessage({ text: s })}
                className="rounded-full border-2 border-ink bg-white px-3 py-1.5 text-sm font-extrabold hover:bg-tag"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {messages.map((message) => (
        <div key={message.id} className={`flex flex-col gap-2 ${message.role === "user" ? "items-end" : "items-start"}`}>
          {message.parts.map((part, i) => {
            if (part.type === "text") {
              return (
                <p
                  key={i}
                  className={`max-w-[85%] whitespace-pre-wrap px-4 py-2.5 font-bold leading-snug ${
                    message.role === "user"
                      ? "rounded-2xl rounded-br-md bg-ink text-chalk"
                      : "crate rounded-bl-md text-ink"
                  }`}
                >
                  {part.text}
                </p>
              );
            }
            if (part.type === "tool-proposeMealPlan") {
              if (part.state === "output-error") {
                return (
                  <p key={i} className="crate px-4 py-2 font-bold text-ink-soft">
                    Let&apos;s try that plan again…
                  </p>
                );
              }
              if (part.state !== "output-available") {
                return (
                  <Working key={i} icon={NotebookPen}>
                    Writing up your dinners…
                  </Working>
                );
              }
              const out = part.output as PlanToolOutput;
              if (out.progress) {
                return <PricingProgress key={i} done={out.done} total={out.total} current={out.current} storeName={out.storeName} />;
              }
              if (out.needsStore) {
                return (
                  <Link key={i} href="/list" className="btn-press">
                    <Store size={18} aria-hidden /> Pick your store on the List, then ask again
                  </Link>
                );
              }
              return (
                <PlanResult
                  key={i}
                  priced={out}
                  storeName={out.storeName}
                  initialRemoved={removedByPlan[part.toolCallId]}
                  onRemovedChange={(indexes) => setRemovedByPlan((prev) => ({ ...prev, [part.toolCallId]: indexes }))}
                />
              );
            }
            if (part.type === "tool-importRecipe") {
              if (part.state === "output-available") return <RecipeCard key={i} data={part.output as RecipeImport} />;
              if (part.state === "output-error") return null;
              return (
                <Working key={i} icon={BookOpen}>
                  Reading the recipe…
                </Working>
              );
            }
            if (part.type === "tool-findFoodHelp") {
              if (part.state === "output-available") return <FoodHelpCard key={i} data={part.output as FoodHelpResult} />;
              if (part.state === "output-error") return null;
              return (
                <Working key={i} icon={Search}>
                  Finding food help near you…
                </Working>
              );
            }
            if (part.type === "tool-searchRecipes") {
              if (part.state === "output-available") return <RecipeSearchCard key={i} data={part.output as RecipeSearch} />;
              if (part.state === "output-error") return null;
              return (
                <Working key={i} icon={Search}>
                  Searching the web for recipes…
                </Working>
              );
            }
            if (part.type === "tool-findSales") {
              if (part.state === "output-available") return <SalesCard key={i} data={part.output as SalesResult} />;
              if (part.state === "output-error") return null;
              return (
                <Working key={i} icon={BadgePercent}>
                  Checking this week&apos;s sales…
                </Working>
              );
            }
            if (part.type === "tool-suggestBudget") {
              if (part.state === "output-available") {
                return <BudgetCard key={i} suggestion={part.output as BudgetSuggestion} />;
              }
              if (part.state === "output-error") return null;
              return (
                <Working key={i} icon={Calculator}>
                  Crunching USDA numbers…
                </Working>
              );
            }
            return null;
          })}
        </div>
      ))}

      {status === "submitted" && <p className="animate-pulse font-bold text-ink-soft">The crew is thinking…</p>}
      {error && (
        <div className="crate flex items-center gap-3 border-tomato p-3 font-bold text-tomato-dark" role="alert">
          Couldn&apos;t reach the crew.
          <button onClick={() => regenerate()} className="btn-crate ml-auto px-3 py-1.5 text-sm">
            Try again
          </button>
        </div>
      )}
      <div ref={bottom} />
      </div>

      <form onSubmit={send} className="fixed inset-x-0 bottom-0 z-10 border-t-2 border-line bg-ground/95 py-3 backdrop-blur-sm">
        {/* Laptop: lines up under the chat column (page padding + rail + gap kept clear on the right). */}
        <div className="mx-auto flex max-w-xl gap-2 px-3 lg:max-w-6xl lg:pl-8 lg:pr-[24rem]">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the crew, or paste a link"
            maxLength={2000}
            enterKeyHint="send"
            aria-label="Message the crew"
            className="field min-w-0 flex-1 rounded-2xl px-4 py-3 text-base"
          />
          <button disabled={busy || !input.trim()} className="btn-press px-4" aria-label="Send">
            <ArrowUp size={22} strokeWidth={3} aria-hidden />
          </button>
        </div>
      </form>
    </div>
  );
}
