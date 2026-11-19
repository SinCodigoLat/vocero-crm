"use client";

import { useCallback, useEffect, useState } from "react";
import { History, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Version = {
  id: string;
  numero: number;
  origen: "manual" | "auto" | "antes_de_restaurar" | "restaurada" | "inicial";
  nota: string | null;
  labScore: number | null;
  createdAt: string;
  cambios: string[];
  esActual: boolean;
};

const ORIGEN: Record<Version["origen"], string> = {
  manual: "Guardada a mano",
  auto: "Automática",
  antes_de_restaurar: "Antes de restaurar",
  restaurada: "Restauración",
  inicial: "Inicial",
};

/**
 * Historial del comportamiento del agente (perfil + conocimiento): cada cambio
 * deja una versión con lo que cambió y el score del Laboratorio, y cualquiera
 * se puede restaurar. No toca el interruptor de encendido.
 */
export function VersionsCard({ onRestored }: { onRestored: () => void }) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [nota, setNota] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const r = await fetch("/api/agent/versions")
      .then((x) => (x.ok ? x.json() : null))
      .catch(() => null);
    if (r) setVersions(r.versions);
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function guardar() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/agent/versions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nota }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError("No se pudo guardar la versión.");
    setNota("");
    void cargar();
  }

  async function restaurar(v: Version) {
    const ok = window.confirm(
      `Volver a la v${v.numero} reemplaza el comportamiento y el conocimiento actuales. Antes se guarda una copia del estado de hoy. ¿Continuar?`
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/agent/versions/${v.id}/restore`, { method: "POST" }).catch(
      () => null
    );
    setBusy(false);
    if (!res?.ok) return setError("No se pudo restaurar la versión.");
    void cargar();
    onRestored();
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-4" aria-hidden /> Versiones
        </CardTitle>
        <CardDescription>
          Cada cambio al comportamiento o al conocimiento guarda una versión. Pon una nota a las
          importantes (por ejemplo, «antes de abrirlo a leads») y vuelve a cualquiera si algo sale
          peor. El Laboratorio anota su score en la versión que probó.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            maxLength={300}
            placeholder="Nota de esta versión (opcional)"
            aria-label="Nota de la versión"
          />
          <Button onClick={() => void guardar()} disabled={busy} className="shrink-0">
            Guardar versión
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {versions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay versiones: se crean solas en el primer cambio.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {versions.map((v) => (
              <li key={v.id} className="flex flex-wrap items-start justify-between gap-3 p-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">v{v.numero}</span>
                    {v.esActual && <Badge>Actual</Badge>}
                    <span className="text-muted-foreground">
                      {ORIGEN[v.origen]} · {new Date(v.createdAt).toLocaleString()}
                    </span>
                    {v.labScore != null && <Badge variant="secondary">Lab {v.labScore}</Badge>}
                  </div>
                  {v.nota && <p className="text-sm">{v.nota}</p>}
                  {v.cambios.length > 0 && (
                    <p className="text-xs text-muted-foreground">{v.cambios.join(" · ")}</p>
                  )}
                </div>
                {!v.esActual && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => void restaurar(v)}
                  >
                    <RotateCcw className="mr-1 size-3.5" aria-hidden /> Restaurar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
