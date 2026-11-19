"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FlaskConical, RotateCcw, Send, X } from "lucide-react";

type Msg = { id: string; from: "tu" | "agente"; text: string; at: string };

/** Por qué pasó a una persona, dicho para quien prueba (no el código interno). */
function motivoLegible(reason: string): string {
  if (reason === "error") {
    return "El agente no pudo contestar: falló al pensar. Lo más probable es que la llave de IA no tenga créditos o esté pausada (Ajustes → IA).";
  }
  return `El agente pasó la conversación a una persona (motivo: ${reason}).`;
}

/**
 * Modo 1 de pruebas: widget flotante para conversar con el agente como cliente,
 * sin WhatsApp. Todo es is_test: no sale a ningún lado ni toca bandeja/Pipeline.
 */
export function ChatFlotante() {
  const [abierto, setAbierto] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [handoff, setHandoff] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [esperando, setEsperando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fin = useRef<HTMLDivElement>(null);

  const cargar = useCallback(async () => {
    const r = await fetch("/api/lab/chat", { cache: "no-store" });
    if (!r.ok) return undefined;
    const j = (await r.json()) as { messages: Msg[]; handoff: string | null };
    setMessages(j.messages);
    setHandoff(j.handoff);
    return j;
  }, []);

  useEffect(() => {
    if (abierto) void cargar();
  }, [abierto, cargar]);

  // Mientras espera, consulta cada 2 s hasta que conteste o traspase (tope 100 s).
  useEffect(() => {
    if (!esperando) return;
    const t0 = Date.now();
    const id = setInterval(async () => {
      const j = await cargar();
      const ultimo = j?.messages[j.messages.length - 1];
      if (j?.handoff || ultimo?.from === "agente" || Date.now() - t0 > 100_000) {
        setEsperando(false);
      }
    }, 2000);
    return () => clearInterval(id);
  }, [esperando, cargar]);

  useEffect(() => {
    fin.current?.scrollIntoView({ block: "end" });
  }, [messages, esperando, handoff]);

  async function enviar() {
    const t = text.trim();
    if (!t || esperando || handoff) return;
    setError(null);
    setText("");
    setMessages((m) => [
      ...m,
      { id: `local-${Date.now()}`, from: "tu", text: t, at: new Date().toISOString() },
    ]);
    const r = await fetch("/api/lab/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: t }),
    });
    if (!r.ok) {
      const j = (await r.json().catch(() => null)) as { error?: { message?: string } } | null;
      setError(j?.error?.message ?? "No se pudo enviar");
      return;
    }
    setEsperando(true);
  }

  async function reiniciar() {
    await fetch("/api/lab/chat", { method: "DELETE" });
    setMessages([]);
    setHandoff(null);
    setError(null);
    setEsperando(false);
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        data-chat-flotante-abrir
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg hover:opacity-90"
      >
        <FlaskConical className="h-4 w-4" aria-hidden />
        Probar agente
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Probar al agente"
      data-chat-flotante
      className="fixed bottom-4 right-4 z-40 flex h-[min(560px,calc(100vh-2rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl"
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Probar al agente</p>
          <p className="text-xs text-muted-foreground">Sin WhatsApp · nada se guarda en tu bandeja</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => void reiniciar()}
            disabled={messages.length === 0}
            title="Empezar de cero"
            className="rounded-md p-2 text-muted-foreground hover:bg-subtle disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            <span className="sr-only">Empezar de cero</span>
          </button>
          <button
            type="button"
            onClick={() => setAbierto(false)}
            title="Cerrar"
            className="rounded-md p-2 text-muted-foreground hover:bg-subtle"
          >
            <X className="h-4 w-4" aria-hidden />
            <span className="sr-only">Cerrar</span>
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto bg-subtle p-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Escribe como si fueras un cliente. Prueba con «Hola».
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.from === "tu" ? "flex justify-end" : "flex justify-start"}>
            <p
              className={
                "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm " +
                (m.from === "tu" ? "bg-primary text-primary-foreground" : "border bg-card")
              }
            >
              {m.text}
            </p>
          </div>
        ))}
        {esperando && !handoff && (
          <p className="text-xs text-muted-foreground">El agente está escribiendo…</p>
        )}
        {handoff && (
          <p className="rounded-lg border border-destructive/30 bg-card p-2 text-xs text-destructive">
            {motivoLegible(handoff)} Pulsa «Empezar de cero» para probar de nuevo.
          </p>
        )}
        <div ref={fin} />
      </div>

      {error && <p className="px-4 pt-2 text-xs text-destructive">{error}</p>}
      <form
        className="flex gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void enviar();
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe como cliente…"
          disabled={esperando || !!handoff}
          maxLength={2000}
          className="min-w-0 flex-1 rounded-full border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={esperando || !!handoff || !text.trim()}
          className="rounded-full bg-primary p-2.5 text-primary-foreground disabled:opacity-50"
        >
          <Send className="h-4 w-4" aria-hidden />
          <span className="sr-only">Enviar</span>
        </button>
      </form>
    </div>
  );
}
