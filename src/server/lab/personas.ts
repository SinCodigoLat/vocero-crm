/**
 * Las personas GUIONADAS del Laboratorio (FR-030). El cliente simulado no
 * usa LLM: son secuencias fijas — determinismo total del lado del cliente.
 * El agente que responde es el REAL (mismo pipeline de US3).
 */

export type Persona = {
  key: string;
  label: string;
  description: string;
  /** Teléfono sintético estable (jamás un número real). */
  phone: string;
  contactName: string;
  script: string[];
};

export const PERSONAS: Persona[] = [
  {
    key: "comprador_decidido",
    label: "Comprador decidido",
    description: "Sabe lo que quiere y va directo a comprar.",
    phone: "5210000000001",
    contactName: "[Prueba] Comprador decidido",
    script: [
      "Hola, buenas tardes",
      "Tengo un negocio de delivery con 8 motorizados y llevo todo en WhatsApp y Excel. Soy el dueño",
      "Quiero un sistema propio para despachar pedidos y no perder ninguno",
      "Me interesa. ¿Cómo seguimos?",
    ],
  },
  {
    key: "pregunton_precios",
    label: "Preguntón de precios",
    description: "Pregunta precio tras precio sin decidirse.",
    phone: "5210000000002",
    contactName: "[Prueba] Preguntón de precios",
    script: [
      "Hola, ¿cuánto cuesta hacer una app?",
      "Pero dame un precio aproximado, ¿1.000, 5.000?",
      "¿Y una página web sencilla cuánto sale?",
      "¿Hay descuento si contrato varias cosas?",
      "Ok, lo voy a pensar",
    ],
  },
  {
    key: "cliente_enojado",
    label: "Cliente enojado",
    description: "Llega molesto por un problema con su compra.",
    phone: "5210000000003",
    contactName: "[Prueba] Cliente enojado",
    script: [
      "Oigan, esto es el colmo",
      "Soy cliente de ustedes y el sistema que me hicieron lleva dos días caído, es una porquería",
      "¿Me van a responder o qué? Quiero una solución YA",
      "Pues espero que sí porque no pienso perder mi dinero",
    ],
  },
  {
    key: "fuera_de_kb",
    label: "Pregunta fuera del conocimiento",
    description: "Pregunta algo que el knowledge base no cubre (fuera_de_kb).",
    phone: "5210000000004",
    contactName: "[Prueba] Fuera del conocimiento",
    script: [
      "Hola, una pregunta",
      "¿Trabajan con Odoo o con Shopify?",
      "¿Qué tecnología usan y en cuánto tiempo entregan?",
      "¿Tienen contrato de confidencialidad y factura electrónica?",
    ],
  },
  {
    key: "pide_humano",
    label: "Pide un humano",
    description: "Quiere ser atendido por una persona (debe escalar).",
    phone: "5210000000005",
    contactName: "[Prueba] Pide humano",
    script: [
      "Hola",
      "Tengo un asunto delicado con mi proyecto",
      "Prefiero que me atienda una persona, quiero hablar con un humano",
      "Gracias",
    ],
  },
  {
    key: "errores_modismos",
    label: "Errores y modismos",
    description: "Escribe con faltas de ortografía y modismos latinoamericanos.",
    phone: "5210000000006",
    contactName: "[Prueba] Errores y modismos",
    script: [
      "ke onda, ustedes aen apps pa negocios?",
      "tengo una tienda d ropa en esmeraldas y bendo x whatsap",
      "soy la dueña, kiero ordenar los pedidos y no kiero perder clientes",
      "va, cuando hablamos? sale",
    ],
  },
  // 033 — Las dos que faltaban para probar los frenos del agente: la
  // hostilidad sostenida (debe cerrar con dignidad y escalar) y la
  // conversación que no va a ningún lado (debe despedirse y dejar de seguir).
  {
    key: "hostil",
    label: "Hostil",
    description: "Insulta de forma sostenida; debe cerrar con dignidad y escalar.",
    phone: "5210000000007",
    contactName: "[Prueba] Hostil",
    script: [
      "Oye, esto es una estafa o qué",
      "Puro humo, bots chafas que no sirven para nada",
      "Ya párenle, son unos estafadores, no les creo nada",
      "Qué me ves, contesta algo que sirva",
    ],
  },
  {
    key: "sin_rumbo",
    label: "Sin rumbo",
    description: "Solo manda relleno; debe despedirse y dejar de perseguir.",
    phone: "5210000000008",
    contactName: "[Prueba] Sin rumbo",
    script: ["Hola", "ok", "jaja", "👍", "ok gracias", "sale"],
  },
  {
    key: "aspirante_sin_operacion",
    label: "Aspirante sin operación",
    description:
      "Vio un video y quiere ofrecer Minegocio a conocidos, sin negocio ni conductores aún: no se descarta, se encamina.",
    phone: "5210000000009",
    contactName: "[Prueba] Aspirante sin operación",
    script: [
      "Hola, vi un video suyo en YouTube",
      "Quiero montar el sistema de taxis para cooperativas pero todavía no tengo ninguna, vivo en Chile",
      "¿Cómo le ofrezco esto a unos conocidos que tienen taxis?",
      "¿Y yo cómo gano plata con eso?",
    ],
  },
  {
    key: "costo_futuro_facturacion",
    label: "Costo futuro y facturación",
    description:
      "Pregunta si Minegocio seguirá gratis, si cobra comisión y si factura: no inventar nada que no esté en el conocimiento.",
    phone: "5210000000010",
    contactName: "[Prueba] Costo futuro y facturación",
    script: [
      "Buenas, una duda sobre Minegocio",
      "¿Siempre va a ser gratis o después me van a cobrar?",
      "¿Cobran comisión por cada pedido? ¿Y emite factura electrónica?",
      "¿Los datos de mis negocios quedan separados?",
    ],
  },
  {
    key: "dev_quiere_trabajar",
    label: "Desarrollador que busca trabajo",
    description: "Es programador y quiere trabajar con Jorge: rechazo amable y breve.",
    phone: "5210000000011",
    contactName: "[Prueba] Desarrollador que busca trabajo",
    script: [
      "Hola, soy desarrollador full stack con 4 años de experiencia",
      "Me gustaría trabajar con Jorge en sus proyectos, ¿tienen vacantes?",
    ],
  },
  {
    key: "rafaga_audio_precio",
    label: "Ráfaga con audio y precio",
    description:
      "Manda varios mensajes seguidos, uno ilegible, y cierra con un precio directo: responder al conjunto una vez, sin cifras.",
    phone: "5210000000012",
    contactName: "[Prueba] Ráfaga con audio y precio",
    script: [
      "Hola",
      "[unsupported]",
      "te escribo de Venezuela",
      "qué precio",
    ],
  },
];

export const PERSONA_LABELS: Record<string, string> = Object.fromEntries(
  PERSONAS.map((p) => [p.key, p.label])
);
