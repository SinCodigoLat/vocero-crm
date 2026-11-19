"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, RotateCcw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Msg = { id: string; from: "tu" | "agente"; text: string; at: string };

/** Modo 1: conversar con el agente como cliente, sin WhatsApp (todo is_test). */
export function ChatLibre({ disabled }: { disabled: boolean }) {
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
    return j.messages;
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Mientras espera, consulta cada 2 s hasta que llegue algo del agente (tope 100 s).
  useEffect(() => {
    if (!esperando) return;
    const t0 = Date.now();
    const id = setInterval(async () => {
      const m = await cargar();
      const ultimo = m?.[m.length - 1];
      if ((ultimo && ultimo.from === "agente") || Date.now() - t0 > 100_000) {
        setEsperando(false);
      }
    }, 2000);
    return () => clearInterval(id);
  }, [esperando, cargar]);

  useEffect(() => {
    fin.current?.scrollIntoView({ block: "end" });
  }, [messages, esperando]);

  async function enviar() {
    const t = text.trim();
    if (!t || esperando) return;
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
    setEsperando(false);
  }

  return (
    <Card data-lab-chat-libre>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="h-4 w-4" aria-hidden />
          Conversar con el agente (sin WhatsApp)
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => void reiniciar()} disabled={messages.length === 0}>
          <RotateCcw className="mr-1 h-3.5 w-3.5" aria-hidden /> Empezar de cero
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Escribe como si fueras el cliente. Contesta el agente real, pero nada sale a
          WhatsApp ni queda en tu bandeja ni en el Pipeline.
        </p>
        <div className="max-h-80 min-h-32 space-y-2 overflow-y-auto rounded-lg border bg-subtle p-3">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground">Escribe «Hola» para empezar.</p>
          )}
          {messages.map((m) => (
            <div key={m.id} className={m.from === "tu" ? "flex justify-end" : "flex justify-start"}>
              <p
                className={
                  "max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm " +
                  (m.from === "tu" ? "bg-primary text-primary-foreground" : "border bg-card")
                }
              >
                {m.text}
              </p>
            </div>
          ))}
          {esperando && <p className="text-xs text-muted-foreground">El agente está escribiendo…</p>}
          {handoff && (
            <p className="text-xs text-muted-foreground">
              La conversación pasó a una persona (motivo: {handoff}).
            </p>
          )}
          <div ref={fin} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void enviar();
          }}
        >
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={disabled ? "Conecta el agente para conversar" : "Escribe como cliente…"}
            disabled={disabled || esperando}
            maxLength={2000}
          />
          <Button type="submit" disabled={disabled || esperando || !text.trim()}>
            <Send className="h-4 w-4" aria-hidden />
            <span className="sr-only">Enviar</span>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
