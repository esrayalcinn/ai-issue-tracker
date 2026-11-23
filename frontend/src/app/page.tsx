"use client";

import { useEffect, useState } from "react";
import { checkBackendHealth } from "@/lib/api";

export default function HomePage() {
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    checkBackendHealth()
      .then(() => setApiStatus("online"))
      .catch(() => setApiStatus("offline"));
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-10 flex items-center justify-between border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Issue Tracker</h1>
          <p className="mt-1 text-sm text-slate-400">
            Starter shell — check ROADMAP.md for your Milestone 1 &amp; 2 tasks.
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            apiStatus === "online"
              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
              : apiStatus === "offline"
                ? "bg-rose-950 text-rose-300 border border-rose-800"
                : "bg-slate-900 text-slate-400 border border-slate-700"
          }`}
        >
          API: {apiStatus}
        </span>
      </header>

      <section className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-200">
          Your Issue Board Goes Here
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Once your FastAPI CRUD endpoints are working (Milestone 1), replace this
          placeholder with your issue list, status/priority filters, and New Issue form.
        </p>
      </section>
    </main>
  );
}
