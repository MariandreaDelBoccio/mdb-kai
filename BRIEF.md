# KAI

Marca ficticia de ramen bar. Pieza 07 (sustituye BRUME): scrollytelling WebGL con un solo hilo de scroll — el bowl se desarma por capas, se rearma, recibe extras y termina servido en la barra, bajo un farol que se enciende.

## Promesa

Un bowl, seis capas, y todo se ve. Nada se esconde bajo el caldo.

## Dirección

Barra de ramen de noche, bajo un farol. Fondo índigo nocturno a pantalla completa (el rojo queda para los objetos: el farol y la banda del bowl), crema como tipografía, porcelana y caldo como protagonistas. Sin cards, sin pills, sin kickers. Wordmark KAI tonal gigante detrás del bowl (solo en el hero). Un único canvas sticky a pantalla completa.

## Capas (de abajo arriba)

1. Tazón — porcelana con banda rojo farol
2. Caldo — disco con gotas de aceite de chile
3. Fideos — ~30 hebras de tubo fusionadas en una sola geometría
4. Chashu — dos lonchas con espiral de grasa
5. Ajitama — dos mitades, yema visible
6. Nori y negi — lámina arrugada + anillos instanciados

Extras (entran tras el rearme): menma, narutomaki, palillos. Cierre: barra de hinoki que entra deslizándose, farol de papel que baja y se enciende (ラーメン + KAI) y una taza de té.

## Timeline (progreso de scroll 0–1 sobre ~720vh)

| Tramo | Qué pasa |
| --- | --- |
| 0.00–0.08 | Hero: bowl armado, KAI al fondo, UI mínima |
| 0.08–0.26 | Explode vertical, escalonado de arriba abajo; la cámara retrocede |
| 0.27–0.49 | Leyendas (nombre + una línea) entran una a una, ancladas a cada capa |
| 0.48–0.64 | Rearme escalonado de abajo arriba |
| 0.65–0.76 | Extras entran volando |
| 0.745–0.82 | La barra de madera se desliza bajo el bowl; la cámara baja a nivel de mesa |
| 0.80–0.90 | El farol baja con rebote, oscila y se enciende; la sala se oscurece y se calienta |
| 0.885–0.94 | Llega la taza de té; el vapor sube hacia la luz |
| 0.935–1.00 | CTA demo de reserva (sin reserva real) |

## Qué demuestra

Un solo `progress` continuo (listener de scroll + amortiguado en `useFrame`) gobierna escena, cámara y leyendas. Las leyendas se proyectan desde cada capa a un overlay DOM (sin `Html` de drei). Geometría y texturas 100 % procedurales, sin GLB. Hay fallback sin WebGL (SVG) y `prefers-reduced-motion` muestra el bowl armado con las capas listadas como texto.

## Paleta

| Nombre | Hex | Uso |
| --- | --- | --- |
| Indigo | `#1d2b4c` | Fondo (azul de calle de noche) |
| Indigo deep | `#111a31` | Viñeta, bloques estáticos |
| Indigo glow | `#2f4474` | Luz suave tras el bowl |
| Lantern red | `#a3261a` | Solo en objetos: banda del bowl, farol, taza |
| Cream | `#f4e8d2` | Texto |
| Ink | `#1a0f0c` | Líneas finas, bandas del farol |

## Tipografía

- Display: Shippori Mincho (también para ラーメン)
- UI: Zen Kaku Gothic New

## Caso de estudio

### Problema
Las cartas de ramen en web son fotos planas o landings con cards. No enseñan de qué está hecho el bowl.

### Decisión de diseño
El producto es el scroll: separar, nombrar, volver a armar, servir. Poca UI, una gestualidad memorable (el explode vertical, ahora con giro en espiral) y un cierre de lugar en vez de objeto: la barra y el farol que se enciende. Se evitó a propósito el cierre en caja de takeaway por ser el recurso más típico del género.

### Decisión técnica
`position: sticky` en un contenedor de ~720vh. El progreso se calcula del `getBoundingClientRect` del contenedor; la escena (R3F) lo lee desde un ref y lo suaviza con `1 - exp(-dt·7)`. Leyendas proyectadas con `Vector3.project`. Distinto de miga. (velos sobre foto) y de BRASA (drag-to-spin).

### Por qué una plantilla no puede
Ningún tema de restaurante sincroniza un único scroll con un bowl 3D que explota, se rearma y termina servido bajo un farol que se enciende.

### Métricas objetivo
Primer paint usable < 2.5 s en móvil; sync sin saltos visibles; fallback inmediato sin WebGL.

### Límites conocidos
La geometría es procedural: se lee como producto de ilustración 3D, no como fotografía. Para más realismo habría que sustituir cada capa por un GLB propio con malla separada.

## Nota portfolio

La dirección “Counter Void” / atmósfera tipo Lusion queda reservada para el **studio** m.d.b., no para esta pieza.
