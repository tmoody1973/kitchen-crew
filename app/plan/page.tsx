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
import PlanResult from "@/components/cards/PlanResult";
import BudgetCard, { type BudgetSuggestion } from "@/components/cards/BudgetCard";
import RecipeCard, { type RecipeImport } from "@/components/cards/RecipeCard";
import PricingProgress from "@/components/cards/PricingProgress";
import type { PlanToolOutput } from "@/lib/meal-plan";

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
    <div className="flex flex-col gap-4 pb-28">
      <TallyHeader />
      <ChatMenu currentId={savedId.current} />

      {messages.length === 0 && (
        <div className="rounded-2xl bg-white p-4 font-bold text-slate-600">
          👋 Hey! I&apos;m your kitchen crew. Ask me <em>&ldquo;What should we cook?&rdquo;</em>, paste a recipe link, or
          ask me to plan from your saved recipes.
        </div>
      )}

      {messages.map((message) => (
        <div key={message.id} className={`flex flex-col gap-2 ${message.role === "user" ? "items-end" : "items-start"}`}>
          {message.parts.map((part, i) => {
            if (part.type === "text") {
              return (
                <p
                  key={i}
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 font-bold ${
                    message.role === "user" ? "bg-leaf text-white" : "bg-white text-slate-700"
                  }`}
                >
                  {part.text}
                </p>
              );
            }
            if (part.type === "tool-proposeMealPlan") {
              if (part.state === "output-error") {
                return (
                  <p key={i} className="rounded-2xl bg-white px-4 py-2 font-bold text-slate-500">
                    Let&apos;s try that plan again…
                  </p>
                );
              }
              if (part.state !== "output-available") {
                return (
                  <p key={i} className="animate-pulse rounded-2xl bg-white px-4 py-2 font-bold text-slate-500">
                    📝 Writing up your meals…
                  </p>
                );
              }
              const out = part.output as PlanToolOutput;
              if (out.progress) {
                return <PricingProgress key={i} done={out.done} total={out.total} current={out.current} storeName={out.storeName} />;
              }
              if (out.needsStore) {
                return (
                  <Link key={i} href="/list" className="rounded-2xl bg-carrot px-4 py-3 font-black text-white">
                    Pick your store on the List first, then ask again →
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
                <p key={i} className="animate-pulse rounded-2xl bg-white px-4 py-2 font-bold text-slate-500">
                  📖 Reading the recipe…
                </p>
              );
            }
            if (part.type === "tool-suggestBudget") {
              if (part.state === "output-available") {
                return <BudgetCard key={i} suggestion={part.output as BudgetSuggestion} />;
              }
              if (part.state === "output-error") return null;
              return (
                <p key={i} className="animate-pulse rounded-2xl bg-white px-4 py-2 font-bold text-slate-500">
                  🧮 Crunching USDA numbers…
                </p>
              );
            }
            return null;
          })}
        </div>
      ))}

      {status === "submitted" && <p className="animate-pulse font-bold text-slate-500">The crew is thinking…</p>}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl bg-white p-3 font-bold text-carrot-dark">
          Couldn&apos;t reach the crew.
          <button onClick={() => regenerate()} className="rounded-xl bg-carrot px-3 py-1 text-white">
            Try again
          </button>
        </div>
      )}
      <div ref={bottom} />

      <form onSubmit={send} className="fixed inset-x-0 bottom-0 border-t-2 border-slate-200 bg-white p-3">
        <div className="mx-auto flex max-w-xl gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What should we cook?"
            maxLength={2000}
            className="min-w-0 flex-1 rounded-2xl border-2 border-slate-200 px-4 py-3 text-lg font-bold"
          />
          <button
            disabled={busy || !input.trim()}
            className="rounded-2xl border-b-4 border-leaf-dark bg-leaf px-5 font-black text-white disabled:opacity-60"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
