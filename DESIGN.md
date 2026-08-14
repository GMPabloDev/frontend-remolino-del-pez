---
name: El Molino del Pez
description: Una mesa costera digital, cálida y confiable, para reservar y operar con claridad.
colors:
  azul-puerto: "#12324a"
  azul-puerto-hover: "#1d4b68"
  naranja-brasa: "#e76832"
  arena-tibia: "#f4f0e8"
  blanco-mesa: "#ffffff"
  bruma-marina: "#dcecef"
  bruma-marina-hover: "#c7e0e5"
  arena-suave: "#e9e4da"
  texto-bruma: "#587080"
  arcilla-alerta: "#b34b25"
  arcilla-profunda: "#8f3d20"
  verde-disponible: "#22624e"
typography:
  display:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontSize: "clamp(2.8rem, 8vw, 5.8rem)"
    fontWeight: 600
    lineHeight: 0.9
    letterSpacing: "-0.08em"
  headline:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontSize: "clamp(2.25rem, 5vw, 3rem)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.06em"
  title:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.045em"
  body:
    fontFamily: "'Geist Variable', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: "'Geist Variable', sans-serif"
    fontSize: "0.65rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.2em"
rounded:
  sm: "calc(0.75rem * 0.6)"
  md: "calc(0.75rem * 0.8)"
  lg: "0.75rem"
  xl: "calc(0.75rem * 1.4)"
  2xl: "calc(0.75rem * 1.8)"
  3xl: "calc(0.75rem * 2.2)"
  4xl: "calc(0.75rem * 2.6)"
  card-public: "1.75rem"
  panel: "2rem"
  pill: "9999px"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.25rem"
  xl: "1.5rem"
  2xl: "2rem"
  3xl: "2.5rem"
  4xl: "3rem"
components:
  button-primary:
    backgroundColor: "{colors.azul-puerto}"
    textColor: "{colors.blanco-mesa}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0.375rem 0.625rem"
    height: "2rem"
  button-primary-hover:
    backgroundColor: "{colors.azul-puerto-hover}"
    textColor: "{colors.blanco-mesa}"
    rounded: "{rounded.lg}"
  button-public-cta:
    backgroundColor: "{colors.azul-puerto}"
    textColor: "{colors.blanco-mesa}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0.75rem 1.25rem"
    height: "3rem"
  button-outline:
    backgroundColor: "{colors.blanco-mesa}"
    textColor: "{colors.azul-puerto}"
    rounded: "{rounded.lg}"
    padding: "0.375rem 0.625rem"
    height: "2rem"
  input-default:
    backgroundColor: "transparent"
    textColor: "{colors.azul-puerto}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0.25rem 0.625rem"
    height: "2rem"
  card-public:
    backgroundColor: "rgba(255, 255, 255, 0.85)"
    textColor: "{colors.azul-puerto}"
    rounded: "{rounded.card-public}"
    padding: "1.5rem"
  chip-status:
    backgroundColor: "{colors.bruma-marina}"
    textColor: "{colors.azul-puerto}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.75rem"
---

# Design System: El Molino del Pez

## Overview

**Creative North Star: "La Mesa Costera"**

El sistema traduce la hospitalidad de una mesa junto al mar a una interfaz cálida, confiable y directa. El fondo arena crea continuidad entre pantallas; el azul profundo aporta autoridad y legibilidad; el naranja introduce energía humana en momentos de orientación, selección y acción. La expresión es amable sin volverse infantil y distintiva sin competir con el trabajo que el usuario necesita completar.

Las superficies se sienten servidas, no apiladas: amplias, suavemente redondeadas y separadas por luz ambiental. La experiencia pública admite titulares editoriales y gestos más expresivos; la operación administrativa conserva la misma identidad con mayor densidad, jerarquías más contenidas y decisiones visibles. Debe evitarse la neutralidad intercambiable del SaaS genérico, la urgencia estridente de las aplicaciones de delivery y el lujo oscuro que vuelve distante a una marisquería.

**Key Characteristics:**
- Hospitalidad cálida sostenida por una estructura clara.
- Contraste entre títulos editoriales y texto operativo preciso.
- Azul profundo como ancla, naranja como acento escaso y deliberado.
- Superficies de arena y blanco cálido con profundidad ambiental.
- Formas generosas, controles legibles y estados comprensibles.

## Colors

La paleta combina la estabilidad del puerto con la calidez de una mesa preparada: profunda en sus anclas, luminosa en sus superficies y contenida en sus acentos.

### Primary
- **Azul Puerto:** ancla navegación, texto principal, encabezados de tablas y acciones decisivas. Debe concentrar confianza y estructura.
- **Azul Puerto en interacción:** aparece únicamente como respuesta de hover o énfasis sobre acciones azules.

### Secondary
- **Bruma Marina:** crea áreas informativas, iconos contenidos, estados secundarios y superficies seleccionables sin competir con la acción principal.
- **Bruma Marina en interacción:** confirma hover y expansión sobre componentes secundarios.

### Tertiary
- **Naranja Brasa:** orienta la mirada mediante cejas, precios, iconos, enlaces destacados y anillos de foco. Su fuerza depende de no inundar la pantalla.

### Neutral
- **Arena Tibia:** fondo continuo de la aplicación y base de la atmósfera costera.
- **Blanco Mesa:** superficie principal de tarjetas, formularios, tablas y paneles.
- **Arena Suave:** superficie silenciada para agrupaciones y estados de baja prioridad.
- **Texto Bruma:** texto secundario cuando una opacidad del Azul Puerto no sea suficiente.

### Status
- **Arcilla Alerta:** errores, acciones destructivas y estados no disponibles; siempre acompañada por texto o iconografía.
- **Arcilla Profunda:** interacción y texto reforzado dentro de contextos destructivos.
- **Verde Disponible:** disponibilidad y confirmaciones positivas, sin reemplazar etiquetas explícitas.

### Named Rules

**The Puerto y Brasa Rule.** Azul Puerto establece la estructura; Naranja Brasa señala el siguiente punto de atención. No deben competir como dos fondos dominantes en la misma región.

**The Prepared Table Rule.** Arena Tibia pertenece al lienzo y Blanco Mesa a la superficie preparada. Las capas adicionales deben justificar una nueva agrupación, no decorar por costumbre.

## Typography

**Display Font:** Georgia, con Times New Roman y serif como respaldo.
**Body Font:** Geist Variable, con sans-serif como respaldo.

**Character:** Georgia aporta una voz editorial, humana y vinculada a la hospitalidad; Geist mantiene formularios, datos, navegación y estados nítidos. La tensión entre ambas voces evita tanto la frialdad corporativa como la nostalgia decorativa.

### Hierarchy
- **Display:** reservado para la declaración principal de una superficie pública; escala fluida, peso semibold, altura compacta y tracking negativo pronunciado.
- **Headline:** títulos de página y cabeceras principales; mantiene la voz editorial con una escala más operativa.
- **Title:** nombres de sucursales, platos, reservas y agrupaciones importantes.
- **Body:** lectura corriente y mensajes; el contenido explicativo mantiene líneas aireadas y anchos moderados.
- **Label:** cejas, estados y metadatos breves; usa mayúsculas, peso bold y tracking amplio. Nunca se emplea para frases largas.

### Named Rules

**The Two Voices Rule.** Georgia nombra y da bienvenida; Geist explica, permite actuar y presenta datos. No intercambiar sus responsabilidades por variedad visual.

**The Short Label Rule.** El tracking amplio solo pertenece a etiquetas cortas. Las instrucciones y errores deben conservar caja natural y lectura continua.

## Layout

El lienzo usa contenedores centrados de hasta 72rem para superficies públicas y hasta 80rem para administración, con respiración lateral progresiva: 1.25rem en móvil, 2rem desde pantallas pequeñas y 3rem en escritorio. El ritmo principal se construye con intervalos de 0.75rem, 1rem, 1.25rem, 1.5rem y 2rem; las separaciones de sección alcanzan 2.5rem o más cuando cambia la tarea.

La experiencia pública parte de una columna clara y expande tarjetas a dos columnas cuando el contenido lo permite. Los flujos de reserva conservan orden vertical y revelan pasos posteriores solo cuando existe información válida. El panel staff cambia de navegación horizontal desplazable en móvil a una cuadrícula con barra lateral de 14rem en escritorio. Las tablas operativas se transforman en tarjetas antes de comprometer legibilidad o provocar desplazamiento horizontal.

**The Customer Path Rule.** En superficies públicas debe existir una jerarquía dominante y una acción siguiente inequívoca. La cuadrícula nunca debe ocultar el recorrido.

**The Operational Density Rule.** Staff puede ser más denso, pero no más pequeño: compactar mediante estructura, agrupación y adaptación, no reduciendo legibilidad ni objetivos táctiles.

## Elevation & Depth

La profundidad es ambiental. Sombras amplias, teñidas con Azul Puerto y de baja opacidad separan superficies blancas del fondo arena sin hacerlas parecer objetos flotantes. Los bordes azulados translúcidos mantienen definición cuando la sombra desaparece o el contraste del entorno cambia.

### Shadow Vocabulary
- **Ambient Low** (`0 20px 60px rgba(18, 50, 74, 0.06)`): paneles administrativos, estados y contenedores en reposo.
- **Ambient Standard** (`0 20px 60px rgba(18, 50, 74, 0.08)`): tarjetas y superficies públicas principales.
- **Ambient High** (`0 24px 80px rgba(18, 50, 74, 0.12)`): autenticación, cuenta y regiones que concentran una tarea completa.
- **Interactive Lift** (`0 24px 60px rgba(18, 50, 74, 0.14)`): hover de tarjetas accionables, acompañado por un desplazamiento vertical máximo de 0.25rem.
- **Overlay** (`0 24px 80px rgba(18, 50, 74, 0.22)`): paneles laterales y capas modales.

### Named Rules

**The Ambient Tide Rule.** La sombra indica agrupación o interacción, nunca ornamentación. Una tarjeta dentro de otra tarjeta no recibe una segunda elevación completa.

## Shapes

La forma es generosa y acogedora. Los controles operativos parten de esquinas de 0.75rem; campos agrupados y elementos secundarios crecen hacia radios medios. Las tarjetas públicas usan curvas de 1.75rem y los paneles de tarea pueden alcanzar 2rem. Acciones públicas, filtros, estados e ingredientes adoptan forma de píldora cuando su contenido es breve.

Los bordes son finos y teñidos con Azul Puerto a baja opacidad. Los iconos lineales de Lucide suelen medir entre 0.875rem y 1.25rem y acompañan texto o contexto; los contenedores de icono pueden usar Bruma Marina, pero no deben repetirse como mosaicos decorativos sin función.

**The Welcoming Edge Rule.** Cuanto más amplia y hospitalaria sea la superficie, mayor puede ser su curva. Los controles densos conservan radios más contenidos para no perder precisión.

**The Pill With Purpose Rule.** La píldora comunica acción compacta, filtro o estado. No se aplica a párrafos, paneles extensos ni grupos completos.

## Components

Los componentes deben sentirse acogedores y claros: superficie suficiente para comprenderlos, contraste directo y estados visibles antes que adornos.

### Buttons
- **Shape:** controles del sistema con esquinas suavemente curvas; acciones públicas y filtros con silueta de píldora.
- **Primary:** Azul Puerto con texto blanco, peso medio o semibold y altura proporcional a la importancia de la tarea.
- **Hover / Focus:** hover hacia Azul Puerto en interacción; foco visible mediante borde o anillo Naranja Brasa translúcido. La activación puede descender un píxel, sin rebote.
- **Outline:** superficie blanca, borde azul translúcido y respuesta cálida muy tenue; mantiene Azul Puerto para el texto.
- **Secondary:** Bruma Marina con texto Azul Puerto.
- **Destructive:** Arcilla Alerta con texto blanco y foco del mismo carácter cromático.

### Chips
- **Style:** píldoras compactas con texto explícito; Bruma Marina para estados activos o neutrales, verde para disponibilidad y arcilla para fallos.
- **State:** una diferencia cromática siempre se acompaña con texto, `aria-current` o semántica equivalente.

### Cards / Containers
- **Corner Style:** curvas generosas en tarjetas públicas y paneles principales; curvas algo menores en agrupaciones internas.
- **Background:** Blanco Mesa, normalmente con una transparencia leve sobre Arena Tibia.
- **Shadow Strategy:** profundidad ambiental baja o estándar; el hover solo eleva tarjetas realmente accionables.
- **Border:** trazo Azul Puerto translúcido para conservar contorno y separación.
- **Internal Padding:** 1.25rem en móvil y 1.5rem en pantallas mayores como patrón principal.

### Inputs / Fields
- **Style:** fondo transparente o blanco, borde fino, altura compacta en administración y altura mayor cuando el flujo público necesita tactilidad.
- **Focus:** borde Naranja Brasa y anillo translúcido claramente visible.
- **Error / Disabled:** Arcilla Alerta para error, acompañado por mensaje; los estados deshabilitados reducen énfasis sin perder la etiqueta.

### Navigation
- La navegación pública favorece enlaces subrayados con decoración Naranja Brasa y foco visible. La navegación staff utiliza opciones redondeadas; el estado activo ocupa una superficie blanca con sombra ambiental baja. En móvil, la navegación staff se desplaza horizontalmente; en escritorio se organiza verticalmente.

### Public Menu Card
- Imagen 4:3, estado visible en la esquina superior, nombre editorial, precio Naranja Brasa, descripción operativa e ingredientes como chips. La acción de añadir o modificar cantidad permanece al final de la tarjeta y no depende del hover.

### Data Tables
- Encabezado Azul Puerto con etiquetas blancas de tracking amplio. Filas sobre Blanco Mesa, divisores suaves y acciones alineadas al final. En móvil se reemplazan por tarjetas semánticas que preservan etiquetas y acciones.

## Do's and Don'ts

### Do:
- **Do** usar Arena Tibia como continuidad del lienzo y Blanco Mesa para superficies que concentran contenido o acciones.
- **Do** reservar Naranja Brasa para orientación, foco, precio y momentos de decisión.
- **Do** combinar títulos Georgia con contenido operativo Geist según la regla de las dos voces.
- **Do** adaptar tablas y grupos densos a tarjetas o columnas antes de reducir texto o permitir desbordamiento horizontal.
- **Do** acompañar estados de disponibilidad, error y selección con palabras, iconos o semántica; nunca solo con color.
- **Do** conservar objetivos táctiles cómodos y foco visible incluso cuando la interfaz staff aumente su densidad.

### Don't:
- **Don't** convertir la interfaz en un SaaS genérico de tarjetas grises, tipografía intercambiable y acentos sin relación con el piloto.
- **Don't** usar rojos, amarillos, descuentos, urgencia visual o saturación constante propios de una aplicación agresiva de delivery.
- **Don't** oscurecer el lienzo para simular lujo ni depender de fotografía dramática, dorados o contraste distante de marisquería premium.
- **Don't** anidar tarjetas elevadas dentro de tarjetas elevadas ni añadir sombras a elementos que no representan una nueva capa.
- **Don't** extender etiquetas en mayúsculas y tracking amplio a instrucciones, errores o contenido de lectura.
- **Don't** usar píldoras o contenedores de icono como decoración repetitiva sin una función de acción, filtro, estado u orientación.
