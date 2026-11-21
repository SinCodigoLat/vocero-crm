// Escenarios de la batería de María (fork SinCódigo). Los mensajes del cliente son FRASES REALES de leads del +593 96 331 2507
// (bandeja de agenciasincodigo y Vocero, 30-oct a 20-nov-2026), sin nombres ni teléfonos. Cada escenario lleva comprobaciones
// duras (sí o no), nunca un juez: así dos versiones del agente se comparan con números que significan algo.
//
// Campos: `cliente` (mensajes en orden), `debe` / `noDebe` (regex sobre TODO lo que dijo el agente), `llamada` (true = debe
// ofrecer horarios; false = no debe), `persona` (true = debe pasar a una persona), `nota` (de dónde sale).

const HORARIOS = /\b(lun|mar|mi[eé]|jue|vie|s[aá]b|dom)[a-zé]*\.?\s*\d{1,2}[^\n]{0,25}\d{1,2}[:.]\d{2}|\d{1,2}[:.]\d{2}\s*(a\.?\s*m|p\.?\s*m|de la ma)/i;
export { HORARIOS };

export const ESCENARIOS = [
  {
    id: "delivery_califica",
    nota: "Hilo real de Vocero (19-nov): flota de 8, 160 pedidos/día, ≥ USD 2.000, decide él",
    cliente: ["Hola, quiero montar una app de delivery cuando lo venden?", "Si una flota de 8 personas hago envíos y veo esto como una nueva fuente dé ingresos", "Desde Esmeraldas Ecuador", "20 pedidos al día cada moto", "USD 2.000 o más", "Yo decido"],
    debe: [/menos de usd 2\.?000|2\.?000 o m[aá]s/i],
    llamada: true,
  },
  {
    id: "delivery_ibarra_esposa",
    nota: "Hilo real de Vocero (19-nov): 2 motos, 60 pedidos proyectados, 3k, consulta con la esposa, vive en Texas",
    cliente: ["Tengo una idea de negocio quiero un app de delivery", "Si trabajé como motorizado con entregas para 5 restaurantes antes", "No pero ya hablé con dos dueños de restaurantes para hacer un acuerdo solo que necesito mostrarles la app y mi primo tiene una moto, tenemos 2 motos", "Unos 60 pedidos", "Unos 3k para este proyecto claro si se hace bien algo para mi. Personalizado con apps de Android", "Yo pero consulto con mi esposa", "Soy de Ecuador, pero estoy en USA Texas. Operaría en Ibarra"],
    debe: [/esposa|socio|acompa|sumar|venga/i],
  },
  {
    id: "aspirante_minegocio",
    nota: "Real (bandeja): quiere ofrecer SinCódigo Operación a conocidos, sin negocios todavía",
    cliente: ["Hola Jorge, quiero montar SinCódigo Operación para otros negocios.", "No tengo ninguno ahora quería saber cómo se maneja el costo si ofrezco a gente que conozco el sistema"],
    debe: [/minegocio/i, /gratis|sin costo|no cuesta/i],
    llamada: false,
  },
  {
    id: "uber_guayaquil_sin_operacion",
    nota: "Real (bandeja): app tipo Uber para Guayaquil, conductores independientes, pide costo",
    cliente: ["Hola Jorge, tengo una idea o proceso", "Vi sus videos en youtube", "Me interesa crear una app como uber para guayaquil", "Pero es con conductores independientes no son taxis amarillos", "Todavía no tengo conductores, recién estoy empezando", "Podria ayudarme con el costo"],
    debe: [/minegocio/i],
    noDebe: [/\$\s?\d|\d+\s?(usd|d[oó]lares)/i],
    llamada: false,
  },
  {
    id: "taxi_chile",
    nota: "Real (bandeja): taxis en Chile, «empezando pero conozco gente», «¿no las desarrollan ustedes?»",
    cliente: ["Crear una aplicación tipo Uber pero solo para taxis. Hacer esto qué funciones en Chile", "Empezando Pero conozco gente como para hacer el inicio de un proyecto así", "No la desarrollan ustedes este tipo de aplicaciones"],
    debe: [/minegocio/i],
    llamada: false,
  },
  {
    id: "panama_facturacion",
    nota: "Real (bandeja): Panamá, 3 provincias, pregunta facturación y cobro por pedido",
    cliente: ["Hola Jorge, quiero montar SinCódigo Operación para otros negocios.", "Si ya tengo 3 provincias en mente con muchos restaurantes y cadenas de restaurantes de comida rápida disponibles para brindarles el servicio", "Como menejas o piensas que se debe manejar el tema de la facturación. Y recepción de los pagos para poder tener ese control de lo generado."],
    debe: [/no (tiene|incluye|hay)[^.]{0,40}(pasarela|factura)|cobra(s|n)? como ya|lo confirma jorge/i],
    noDebe: [/s[ií] (tiene|incluye)[^.]{0,30}(pasarela|facturaci[oó]n electr)/i],
  },
  {
    id: "datos_y_mantenimiento",
    nota: "Real (bandeja): dónde se guardan los datos y costo de mantenimiento a largo plazo",
    cliente: ["Lo vi en Youtube y me parece muy interesante estaba en enfocarme en el servio de comida peor mi pregunta es acerca colono se maneja el tema de donde se guardan los datos de los negocios y clientes y el costo de mantenimiento a largo plazo"],
    noDebe: [/\$\s?\d|\d+\s?(usd|d[oó]lares)\s*(al|por|mensual)/i],
  },
  {
    id: "precio_directo",
    nota: "Patrón real: pregunta de precio directa al primer mensaje",
    cliente: ["Hola, quiero montar una app de delivery cuanto cuesta?"],
    debe: [/minegocio/i],
    noDebe: [/app propia[^.]{0,60}(\$\s?\d|\d+\s?usd)/i],
  },
  {
    id: "detailing_sin_presupuesto",
    nota: "Real (bandeja): reservas + CRM para detailing, sin presupuesto, quiere aprender",
    cliente: ["Hola Jorge, tengo una idea o proceso que quiero convertir en un sistema y me interesa revisar si califico para trabajar contigo.", "Un sistema de reservas para un negocio de detailing para carros y botes. Junto a un CRM de todo el funcionamiento de la del negocio", "Pues inicialmente no tengo un presupuesto, quería irme por la opción de aprender a hacerlo, actualmente trabajo en diseño web"],
    llamada: false,
  },
  {
    id: "dev_quiere_trabajar",
    nota: "Real (bandeja): hace HTML con Claude y quiere trabajar con Jorge",
    cliente: ["hola apenas llego a tu canal de you tube y me llama mucho la atencion estoy terminando de ver el tutorial", "el cuento es que ya he hecho cierta cantidad de html con claude, y justo hoy veo tu video, y estas herramienta que yo he hecho sirven mucho para emprendedores, y me gustaria trabajar contigo"],
    debe: [/vacante|no (estamos|hay)[^.]{0,30}(contrat|buscando)|por ahora no/i],
    llamada: false,
    persona: true,
  },
  {
    id: "abierto",
    nota: "Real: «Buenas tardes» como único mensaje",
    cliente: ["Buenas tardes"],
    noDebe: [/minegocio|app propia|usd/i],
    llamada: false,
  },
  {
    id: "aire_tachina",
    nota: "Hilo real de Técnicos Esmeraldas (bandeja): Tachina, 1 aire, ¿fines de semana?, tarde",
    cliente: ["Necesito información del servicio de limpieza de aire acondicionado", "Estoy en Tachina Av. Rio verde y 10 de mayo", "1", "Los fines de semana no puede?", "Tarde"],
    debe: [/30/],
    noDebe: [/(queda|qued[oó]) (confirmad|agendad)|te (confirmo|agendo) (el|para el) (s[aá]bado|domingo)|minegocio|app propia/i],
    llamada: false,
    persona: true,
  },
  {
    id: "aire_confirma_si_viene",
    nota: "Real: el cliente pide que le confirmen si viene el técnico",
    cliente: ["Necesito el servicio de limpieza mi aire acondicionado", "1 en el sector de las palmas", "Me ayuda confirmando si viene"],
    noDebe: [/s[ií],? (el t[eé]cnico )?(va|llega|viene) (hoy|ma[nñ]ana|a las)/i],
    llamada: false,
  },
  {
    id: "finca_cacao",
    nota: "Texto prellenado real de la página de la finca",
    cliente: ["Hola quiero informacion de las plantas de cacao", "Unas 200 plantas", "En Quevedo", "Para diciembre"],
    noDebe: [/\$\s?\d|\d+\s?(usd|d[oó]lares|centavos)|minegocio|app propia|llamada con jorge/i],
    llamada: false,
    persona: true,
  },
  {
    id: "estafa_desde_anuncio",
    nota: "Duda de confianza típica de quien llega por un anuncio",
    cliente: ["Hola vi el anuncio del aire acondicionado, esto es una estafa?"],
    debe: [/termin|pag/i],
    noDebe: [/le paso tu mensaje a una persona|hostil/i],
    llamada: false,
  },
];

/** Comprobaciones que valen para TODA respuesta del agente (instrucciones v5). */
export const SIEMPRE = [
  { id: "se_llama_maria", si: (respuestas) => respuestas.length === 0 || /mar[ií]a/i.test(respuestas.join("\n")) || !/\bsoy\b/i.test(respuestas.join("\n")), texto: "se presenta y no dice que es María" },
  { id: "sin_nea", si: (r) => !/\bnea\b/i.test(r.join("\n")), texto: "dice que se llama Nea" },
  { id: "sin_markdown", si: (r) => !r.some((t) => /\*\*|^#{1,6}\s|\]\(http/m.test(t)), texto: "usa Markdown" },
  { id: "una_pregunta", si: (r) => r.every((t) => (t.match(/\?/g) ?? []).length <= 1), texto: "hace más de una pregunta en un mensaje" },
  { id: "sin_corchetes", si: (r) => !r.some((t) => /\[opciones:/i.test(t)), texto: "deja ver la marca [opciones: …]" },
];
