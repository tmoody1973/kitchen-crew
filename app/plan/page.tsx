"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import TallyHeader from "@/components/TallyHeader";
import PlanResult from "@/components/cards/PlanResult";
import BudgetCard, { type BudgetSuggestion } from "@/components/cards/BudgetCard";
import PricingProgress from "@/components/cards/PricingProgress";
import type { PlanToolOutput } from "@/lib/meal-plan";

// The planner: chat with the crew; Claude's proposeMealPlan tool results become cards.
export default function PlanPage() {
  const { messages, sendMessage, status, error, regenerate } = useChat();
  const [input, setInput] = useState("");
  // Dinners removed on each plan card (by tool call), so the crew knows when asked to swap something.
  const [removedByPlan, setRemovedByPlan] = useState<Record<string, string[]>>({});
  const askedBudget = useRef(false);
  const bottom = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" }); // braces: newer browsers return a Promise here
  }, [messages, status]);

  // "Let the crew help" on Budget Setup opens /plan?ask=budget and starts the budget conversation.
  useEffect(() => {
    if (askedBudget.current || messages.length > 0) return;
    if (new URLSearchParams(window.location.search).get("ask") === "budget") {
      askedBudget.current = true;
      sendMessage({ text: "Can you help me figure out a weekly grocery budget for my family?" });
    }
  }, [messages.length, sendMessage]);

  function latestPlanRemovals(): string[] {
    const planCalls = messages.flatMap((m) =>
      m.parts.flatMap((p) => (p.type === "tool-proposeMealPlan" ? [p.toolCallId] : [])),
    );
    const latest = planCalls[planCalls.length - 1];
    return latest ? (removedByPlan[latest] ?? []) : [];
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

      {messages.length === 0 && (
        <div className="rounded-2xl bg-white p-4 font-bold text-slate-600">
          👋 Hey! I&apos;m your kitchen crew. Ask me <em>&ldquo;What should we cook?&rdquo;</em> and I&apos;ll plan a few
          dinners priced at your store.
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
                  onMealsRemoved={(names) => setRemovedByPlan((prev) => ({ ...prev, [part.toolCallId]: names }))}
                />
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
