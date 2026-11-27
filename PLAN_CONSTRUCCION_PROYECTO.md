# Plan Maestro de Construcción: Sistema de Análisis y Detección de Sobrecargas Eléctricas

**Nombre del producto:** Sistema computacional de análisis y detección de sobrecargas eléctricas en instalaciones pequeñas  
**Integrantes:** Vicente Peña F., Benjamín Rivera A., Benjamín González C., Joel Manríquez S., Cristian Parra V.  
**Tema de investigación:** Análisis de sobrecargas eléctricas en circuitos de instalaciones residenciales y pequeños talleres.  
**Contexto:** Instalaciones eléctricas residenciales y pequeños talleres (referencia Chile: 220 V / 50 Hz y criterios de la normativa **SEC RIC N.º 10**).  
**Stack tecnológico:** HTML5 + CSS3 + JavaScript puro (Vanilla JS), sin dependencias externas ni compilación.  
**Documentos base:** `Desarrollo_etapa_1_proyecto_corregido.pdf` y `ETAPA 2 DEL PROYECTO.docx`.

---

## 1. Descripción del Proyecto, Objetivos y Metas

### 1.1. Descripción y Problemática a Abordar
En viviendas y pequeños talleres es habitual conectar varios equipos de alto consumo (como estufas, hervidores, herramientas eléctricas y computadores) a una misma línea o extensión eléctrica. El problema es que la suma de sus corrientes puede superar la capacidad máxima del conductor y de la protección (automático) sin que los usuarios lo noten, provocando sobrecalentamiento de cables, pérdidas de energía por caída de voltaje, daño a los equipos y riesgo de incendio.

Este proyecto consiste en un **simulador computacional interactivo** que permite modelar una instalación eléctrica pequeña antes de conectar los artefactos, calcular sus variables eléctricas reales y emitir alertas preventivas claras.

### 1.2. Objetivo General y Objetivos Específicos
* **Objetivo General (según Etapa 1 y 2):** Desarrollar un programa de simulación que calcule la corriente, la caída de voltaje y la potencia de cada rama, para detectar sobrecargas y riesgos de sobrecalentamiento en instalaciones eléctricas de viviendas y pequeños talleres.
* **Objetivos Específicos:**
  1. Modelar circuitos eléctricos de múltiples ramas en paralelo (incluyendo la resistencia de los conductores y extensiones).
  2. Aplicar la **Ley de Ohm**, las **Leyes de Kirchhoff (nodos y mallas)** y las **ecuaciones de potencia eléctrica** de forma visible y verificable.
  3. Detectar automáticamente excesos de corriente respecto al cable y al interruptor termomagnético, así como caídas de voltaje fuera de rango.
  4. Entregar una interfaz visual intuitiva con diagrama del circuito en vivo y diagnóstico preventivo antes de conectar las cargas.

### 1.3. Metas del Producto (Criterios para estar 100% Funcional)
El software se considerará completo y listo para entrega cuando cumpla todas estas metas:
* **Meta 1 (Simulación libre y por escenarios):** el usuario puede crear/editar ramas, definir largo y calibre del cable, agregar o encender/apagar artefactos, y cargar al menos 3 escenarios predefinidos.
* **Meta 2 (Precisión matemática):** todos los cálculos de $I$, $\Delta V$, $V_{\text{carga}}$, $P_{\text{carga}}$ y $P_{\text{pérdida}}$ coinciden con los casos de prueba manuales (Sección 8) y responden en pantalla a las 4 preguntas de investigación del proyecto.
* **Meta 3 (Detección y alertas en tiempo real):** el sistema clasifica cada rama y el tablero general en estado **Normal**, **Advertencia** o **Peligro** con mensajes accionables.
* **Meta 4 (Portabilidad total):** funciona abriendo `index.html` directamente en el navegador sin internet ni programas adicionales, y permite imprimir o exportar a PDF el reporte de análisis.

### 1.4. Alcance Funcional y Trazabilidad con las 4 Preguntas de Investigación
El simulador resuelve en tiempo real:
1. **¿Cómo se determina la corriente eléctrica en cada rama?** $\rightarrow$ Mediante Ley de Ohm ($I = V / R$) sobre la resistencia del conductor más la resistencia equivalente en paralelo de los equipos activos.
2. **¿Cómo se aplican las leyes de Kirchhoff en múltiples ramas?** $\rightarrow$ 1.ª Ley en el nodo del tablero ($I_{\text{total}} = \sum I_{\text{rama}}$) y 2.ª Ley en la malla de cada rama ($V_f - \Delta V_{\text{cable}} - V_{\text{carga}} = 0$).
3. **¿Qué relación existe entre la resistencia del conductor y la corriente?** $\rightarrow$ A mayor resistencia del cable (mayor largo o menor sección $\text{mm}^2$), mayor es la caída de voltaje y menor la corriente/tensión útil que llega al equipo.
4. **¿Cómo influye la potencia disipada en el sobrecalentamiento?** $\rightarrow$ Calcula y muestra $P_{\text{pérdida}} = I^2 \cdot R_{\text{cable}}$, alertando cuando la corriente supera la ampacidad del conductor (referencia **SEC RIC N.º 10**).

---

## 2. Arquitectura Tecnológica (Cero Fricción)

* **Ejecución directa (`file://`):** la aplicación debe funcionar haciendo doble clic en `index.html` sin necesidad de servidor web, Node.js ni Python.
* **Carga de scripts sin error de CORS:** **no usar** `<script type="module">` (los navegadores bloquean módulos ES al abrir archivos locales por `file://`). En su lugar, usar etiquetas `<script defer src="...">` en orden de dependencia, exponiendo un objeto global único (`window.SimuladorElectrico`).
* **100% Offline:** evitar CDNs externos (como Bootstrap o Chart.js por URL). Todos los estilos, íconos y diagramas de circuitos se generan localmente con CSS y **SVG nativo**.
* **Persistencia:** uso de `localStorage` para conservar el circuito creado por el usuario al recargar la página, más botón de restauración y escenarios de ejemplo.

---

## 3. Estructura de Archivos del Proyecto

Se recomienda crear una subcarpeta `app/` dentro de `C:\Users\Benja\Documents\Proyecto\` para mantener ordenados los documentos y el código fuente:

```text
Proyecto/
├── Desarrollo_etapa_1_proyecto_corregido.pdf
├── ETAPA 2 DEL PROYECTO.docx
├── PLAN_CONSTRUCCION_PROYECTO.md
└── app/
    ├── index.html          # Estructura semántica, tablero principal, controles y contenedores de resultados
    ├── css/
    │   └── styles.css      # Sistema de diseño, layout responsivo, semáforos de alerta y @media print
    └── js/
        ├── catalog.js      # Tablas de datos: calibres (mm²), ampacidad, automáticos, resistividad y equipos tipo
        ├── physics.js      # Motor puro de cálculo (Ohm, Kirchhoff, caída de tensión, Joule y evaluador de alertas)
        ├── diagram.js      # Generador dinámico del diagrama eléctrico en SVG (tablero, nodos, ramas y cargas)
        ├── presets.js      # Escenarios predefinidos de prueba (vivienda sobrecargada, taller con extensión, segura)
        └── app.js          # Estado de la aplicación, eventos del DOM, renderizado, modal de fórmulas y exportación
```

### Responsabilidad estricta de cada archivo

1. **`catalog.js`**
   * Define constantes físicas ($\rho_{\text{Cu}} = 0.0172\ \Omega\cdot\text{mm}^2/\text{m}$ a $20\,^\circ\text{C}$).
   * Define el catálogo de conductores de cobre, protecciones comerciales y artefactos típicos de hogar y taller.
   * No toca el DOM.

2. **`physics.js`**
   * Recibe un objeto `instalacion` (voltaje de fuente, automático general, lista de ramas con su cable, extensión opcional y cargas) y retorna un objeto `resultado` completo, determinista e inmutable.
   * No toca el DOM (esto permite probarlo y validarlo fácilmente en la consola del navegador).

3. **`diagram.js`**
   * Toma `instalacion` + `resultado` y construye un `<svg>` escalable mostrando: fuente, interruptor general, barra/nodo de distribución (1.ª Ley de Kirchhoff), cada rama con su automático, cable coloreado según nivel de riesgo (verde/amarillo/rojo), caída de voltaje y los equipos conectados.

4. **`presets.js`**
   * Contiene al menos 3–4 escenarios listos para cargar en 1 clic durante pruebas o exposiciones.

5. **`app.js`**
   * Administra el estado (`state`), conecta botones/formularios con `physics.js` y actualiza tabla de resumen, tarjetas de ramas, alertas, diagrama SVG y panel matemático paso a paso.

---

## 4. Datos y Catálogos Base (`catalog.js`)

### 4.1. Conductores de Cobre (Sección nominal, uso típico y corriente máxima admisible referencial)

| Sección ($\text{mm}^2$) | Uso habitual | Ampacidad máx. referencial ($I_{\text{cable}}$) | Observación en simulador |
| :---: | :--- | :---: | :--- |
| `0.75` | Alargador / zapatilla liviana | `6 A` | Muy propenso a sobrecalentamiento con estufas o herramientas |
| `1.0` | Extensión doméstica estándar | `10 A` | Alerta temprana si supera 8–10 A |
| `1.5` | Circuito de alumbrado | `15 A` | Estándar alumbrado (protección típica 10 A) |
| `2.5` | Circuito de enchufes | `20 A` | Estándar enchufes hogar/taller (protección típica 16 A) |
| `4.0` | Línea reforzada / cocina / taller | `25 A` | Para cargas altas o tramos largos |
| `6.0` | Alimentador / tablero / soldadora | `32 A` | Línea principal o maquinaria pesada |

### 4.2. Protecciones Termomagnéticas (Automáticos)

* Por rama: `6 A`, `10 A`, `16 A`, `20 A`, `25 A`, `32 A`.
* General del tablero: `16 A`, `25 A`, `32 A`, `40 A`, `50 A`.

### 4.3. Catálogo Inicial de Artefactos (220 V)

* **Vivienda:**
  * Ampolleta LED (`15 W`)
  * Televisor / Monitor (`120 W`)
  * Computador de escritorio (`400 W`)
  * Refrigerador (`350 W`)
  * Microondas (`1200 W`)
  * Hervidor eléctrico (`1800 W`)
  * Estufa eléctrica / Termoventilador (`2000 W`)
  * Plancha (`1600 W`)
  * Lavadora (`1500 W`)
* **Pequeño Taller:**
  * Taladro percutor (`800 W`)
  * Esmeril angular / Galletera (`1100 W`)
  * Sierra circular (`1600 W`)
  * Compresor pequeño (`1500 W`)
  * Soldadora inverter básica (`3200 W`)
* **Equipo personalizado:** el usuario puede ingresar cualquier nombre, potencia en Watts ($1\ \text{W}$ a $10000\ \text{W}$) y cantidad.

---

## 5. Modelo Físico-Matemático (`physics.js`)

El circuito se modela como un **sistema paralelo alimentado desde un nodo principal** ($V_f$, por defecto `220 V`). Cada rama $k$ consta de un conductor de ida y vuelta en serie con sus cargas conectadas en paralelo.

### Paso 1: Resistencia del conductor de la rama ($R_{\text{cable}}$)

Considerando conductor de cobre ($\rho = 0.0172\ \Omega\cdot\text{mm}^2/\text{m}$) e ida y vuelta (fase + neutro = $2 \cdot L$):

$$R_{\text{rama\_cable}} = \rho \cdot \frac{2 \cdot L_{\text{rama}}}{A_{\text{rama}}}$$

Si la rama incluye además una **extensión / zapatilla** habilitada (largo $L_{\text{ext}}$, sección $A_{\text{ext}}$):

$$R_{\text{ext}} = \rho \cdot \frac{2 \cdot L_{\text{ext}}}{A_{\text{ext}}}, \qquad R_{\text{cable\_total}} = R_{\text{rama\_cable}} + R_{\text{ext}}$$

> Si el usuario conecta equipos de alto consumo a una extensión delgada y larga, $R_{\text{ext}}$ sube de inmediato, haciendo visible tanto la caída de voltaje como el calentamiento en la zapatilla.

### Paso 2: Resistencia equivalente de las cargas activas (Equipos encendidos)

Para cada equipo encendido $j$ en la rama con potencia nominal $P_{\text{nom}, j}$ y cantidad $c_j$:

$$R_{\text{equipo}, j} = \frac{V_f^2}{P_{\text{nom}, j}}$$

Como los equipos están en **paralelo** dentro de la rama:

$$\frac{1}{R_{\text{cargas}}} = \sum_{j} \frac{c_j}{R_{\text{equipo}, j}} \implies R_{\text{cargas}} = \frac{1}{\sum_{j} \frac{c_j}{R_{\text{equipo}, j}}}$$

*(Si no hay equipos encendidos en la rama, $R_{\text{cargas}} = \infty$ y $I_{\text{rama}} = 0\ \text{A}$.)*

### Paso 3: Ley de Ohm en la rama

La resistencia total vista desde el nodo del tablero hacia la rama es:

$$R_{\text{total\_rama}} = R_{\text{cable\_total}} + R_{\text{cargas}}$$

La corriente que circula por la rama es:

$$I_{\text{rama}} = \frac{V_f}{R_{\text{total\_rama}}}$$

### Paso 4: 2.ª Ley de Kirchhoff (Malla de la rama) y Caída de Voltaje

En la malla cerrada formada por la fuente, el cable y las cargas:

$$\Delta V_{\text{cable}} = I_{\text{rama}} \cdot R_{\text{cable\_total}}$$

$$V_{\text{carga}} = V_f - \Delta V_{\text{cable}}$$

Verificación de malla: $V_f - \Delta V_{\text{cable}} - V_{\text{carga}} = 0$.

Porcentaje de caída de voltaje:

$$\Delta V\% = \left( \frac{\Delta V_{\text{cable}}}{V_f} \right) \cdot 100$$

Corriente individual de cada equipo conectado (Ley de Ohm sobre $V_{\text{carga}}$):

$$I_{\text{equipo}, j} = \frac{V_{\text{carga}}}{R_{\text{equipo}, j}}$$

### Paso 5: 1.ª Ley de Kirchhoff (Nodos)

* **En el nodo de la rama:** $\sum (c_j \cdot I_{\text{equipo}, j}) = I_{\text{rama}}$ (dentro de la tolerancia de redondeo).
* **En el nodo del tablero general:**
  $$I_{\text{total}} = \sum_{k=1}^{n} I_{\text{rama}, k}$$

### Paso 6: Ecuaciones de Potencia (Útil vs. Disipada en Calor)

* **Potencia real entregada a los equipos de la rama:**
  $$P_{\text{carga}} = V_{\text{carga}} \cdot I_{\text{rama}}$$
* **Potencia disipada en los conductores (Efecto Joule / calentamiento):**
  $$P_{\text{pérdida}} = I_{\text{rama}}^2 \cdot R_{\text{cable\_total}} = \Delta V_{\text{cable}} \cdot I_{\text{rama}}$$
  *(Si hay extensión, separar también $P_{\text{pérdida\_ext}} = I_{\text{rama}}^2 \cdot R_{\text{ext}}$ para alertar riesgo en la zapatilla).*
* **Potencia total de la instalación:**
  $$P_{\text{total\_fuente}} = V_f \cdot I_{\text{total}} = \sum_{k=1}^{n} (P_{\text{carga}, k} + P_{\text{pérdida}, k})$$

### Paso 7: Reglas de Detección de Sobrecarga y Alertas

Cada rama (y la extensión, si está activa) se evalúa con tres estados:

| Condición evaluada | Estado | Mensaje / Diagnóstico generado |
| :--- | :---: | :--- |
| $I_{\text{rama}} > I_{\text{prot}}$ | **PELIGRO (Rojo)** | **Disparo de protección:** la corriente supera el automático de la rama ($I_{\text{rama}} > I_{\text{prot}}$). |
| $I_{\text{rama}} > I_{\text{cable}}$ (o $> I_{\text{ext}}$) | **PELIGRO (Rojo)** | **Sobrecarga térmica en conductor:** el cable supera su ampacidad máxima; alto riesgo de sobrecalentamiento e incendio. |
| $I_{\text{prot}} > I_{\text{cable}}$ | **PELIGRO (Rojo)** | **Automático sobredimensionado:** el cable puede sobrecalentarse sin que el automático se dispare. |
| $I_{\text{prot}} > I_{\text{ext}}$ | **ADVERTENCIA (Amarillo)** | **Extensión sin protección:** el automático no protege la extensión si se conectan más equipos. |
| $\Delta V\% > 5\%$ | **PELIGRO (Rojo)** | **Caída de voltaje crítica:** pérdida superior al 5%; riesgo de mal funcionamiento o daño a equipos. |
| $0.8 \cdot \min(I_{\text{prot}}, I_{\text{cable}}, I_{\text{ext}}) \le I_{\text{rama}} \le \min(I_{\text{prot}}, I_{\text{cable}}, I_{\text{ext}})$ | **ADVERTENCIA (Amarillo)** | **Cerca del límite ($\ge 80\%$):** evitar conectar equipos adicionales en esta rama. |
| $3\% < \Delta V\% \le 5\%$ | **ADVERTENCIA (Amarillo)** | **Caída de voltaje elevada:** supera el 3% recomendado; considerar aumentar sección del cable o acortar distancia. |
| Todo bajo el 80% y $\Delta V\% \le 3\%$ | **NORMAL (Verde)** | **Operación segura:** corriente y caída de tensión dentro de los límites establecidos. |

El estado de la rama es el **peor** de todos sus problemas, y el simulador muestra la lista completa (no solo el primero).

**Evaluación Global del Tablero:**
* Si $I_{\text{total}} > I_{\text{general}}$, se activa **Alerta Crítica General**: *"Sobrecarga en línea principal: se disparará el automático general del tablero"*.
* El **estado de la instalación** es el peor entre el automático general y todas las ramas (una rama en peligro deja la instalación en peligro aunque el automático general esté bien).
* Recomendaciones automáticas contextuales: por ejemplo, sugerir cambiar de calibre `1.5 mm²` a `2.5 mm²`, quitar la extensión o mover un artefacto de alto consumo a otra rama con holgura.

---

## 6. Diseño de Interfaz de Usuario (`index.html` + `styles.css`)

### 6.1. Distribución en Pantalla

1. **Barra Superior (Header):**
   * Título del proyecto e integrantes/curso (opcional en pie o botón "Acerca del proyecto").
   * Selector de **Escenarios predefinidos** (`presets.js`).
   * Botones de acción rápida: `+ Nueva Rama`, `Ver Fórmulas / Paso a Paso`, `Imprimir / Guardar PDF`, `Reiniciar`.

2. **Barra de Parámetros Generales y KPIs Globales:**
   * Inputs editables: Voltaje fuente (`220 V`), Automático General (`32 A`), Límite $\Delta V\%$ advertencia (`3%`).
   * Tarjetas resumen (KPIs):
     * **Corriente Total ($I_{\text{total}}$)** vs Capacidad General (barra de progreso).
     * **Potencia Total Consumida ($P_{\text{carga\_total}}$)** en Watts / kW.
     * **Pérdida Total en Conductores ($P_{\text{pérdida\_total}}$)** en Watts.
     * **Estado General de la Instalación** (Semáforo global + conteo de alertas activas).

3. **Cuerpo Principal (2 columnas en escritorio, 1 en móvil):**
   * **Columna Izquierda — Constructor de Ramas y Cargas:**
     * Tarjetas desplegables por cada rama (*Rama 1: Cocina*, *Rama 2: Taller*, etc.).
     * Controles de la rama: Nombre, Largo ($m$), Sección ($\text{mm}^2$), Automático ($A$), Checkbox *"Usa extensión/zapatilla"* (con su largo y sección).
     * Lista de equipos en la rama: interruptor ON/OFF por equipo (para simular el *antes y después de conectar*), cantidad, Watts, corriente individual y botón eliminar.
     * Selector rápido del catálogo + formulario para equipo personalizado.
     * Indicadores propios de la rama: $I_{\text{rama}}$, $V_{\text{carga}}$, $\Delta V\%$, $P_{\text{carga}}$, $P_{\text{pérdida}}$ y badges de estado.
   * **Columna Derecha — Visualización y Análisis:**
     * **Diagrama Eléctrico SVG en vivo:** muestra gráficamente el flujo de corriente desde la fuente hacia cada rama y las alertas en rojo/amarillo directamente sobre el cable o automático afectado.
     * **Panel de Diagnóstico y Recomendaciones:** lista clara de problemas detectados y cómo solucionarlos.
     * **Pestaña/Sección "Cálculos Matemáticos (Ohm, Kirchhoff y Potencia)":** al seleccionar cualquier rama, muestra las ecuaciones sustituidas con sus valores numéricos exactos.

4. **Modo Impresión (`@media print`):**
   * Oculta botones de edición y formularios, dejando un informe limpio con la tabla de resultados, las alertas, el diagrama SVG y las fórmulas aplicadas, listo para exportar a PDF e incluir como evidencia del proyecto.

---

## 7. Escenarios Predefinidos de Validación (`presets.js`)

Incluir estos 3 escenarios permite demostrar todas las problemáticas planteadas en los documentos:

1. **Escenario 1: "Sobrecarga en enchufes de vivienda"**
   * Fuente: `220 V`, General `25 A`.
   * Rama única (`1.5 mm²`, `15 m`, automático `10 A`): Estufa eléctrica (`2000 W`) + Hervidor (`1800 W`) + Computador (`400 W`).
   * **Resultado esperado:** $I \approx 19\ \text{A}$, disparo del automático de `10 A` y sobrecarga del conductor `1.5 mm²`.

2. **Escenario 2: "Pequeño taller con extensión larga"**
   * Fuente: `220 V`, General `32 A`.
   * Rama Taller (`2.5 mm²`, `12 m`, automático `16 A`) + **Extensión (`0.75 mm²`, `25 m`)**: Sierra circular (`1600 W`) + Taladro (`800 W`).
   * **Resultado esperado:** caída de voltaje crítica ($\Delta V\% > 5\%$), voltaje reducido en herramientas, alta potencia disipada en calor en la extensión y alerta de riesgo de incendio en el alargador.

3. **Escenario 3: "Instalación residencial equilibrada (Segura)"**
   * Rama Alumbrado (`1.5 mm²`, `15 m`, `10 A`): 6× LED `15 W` + TV `120 W`.
   * Rama Cocina (`2.5 mm²`, `10 m`, `16 A`): Refrigerador `350 W` + Hervidor `1800 W`.
   * Rama Taller/Escritorio (`2.5 mm²`, `12 m`, `16 A`): PC `400 W` + Taladro `800 W` (apagado o alternado).
   * **Resultado esperado:** todas las ramas en **Verde**, $\Delta V\% < 3\%$, corriente total bajo límite general.

---

## 8. Casos de Prueba para Verificación Matemática (100% Funcional)

Antes de dar por terminado el programa, se deben verificar estos cálculos manuales contra la salida de `physics.js`:

### Caso de Prueba A (Rama simple sin extensión)
* Datos: $V_f = 220\ \text{V}$, $L = 10\ \text{m}$, $A = 2.5\ \text{mm}^2$, carga: 1 equipo de $2200\ \text{W}$.
* $R_{\text{cable}} = 0.0172 \cdot \frac{2 \cdot 10}{2.5} = 0.1376\ \Omega$.
* $R_{\text{carga}} = \frac{220^2}{2200} = 22.0\ \Omega$.
* $R_{\text{total}} = 22.1376\ \Omega$.
* $I_{\text{rama}} = \frac{220}{22.1376} \approx 9.9378\ \text{A}$.
* $\Delta V_{\text{cable}} = 9.9378 \cdot 0.1376 \approx 1.367\ \text{V}$ ($\Delta V\% \approx 0.62\%$).
* $V_{\text{carga}} = 220 - 1.367 \approx 218.63\ \text{V}$.
* $P_{\text{pérdida}} = 9.9378^2 \cdot 0.1376 \approx 13.59\ \text{W}$.
* $P_{\text{carga}} = 218.63 \cdot 9.9378 \approx 2172.7\ \text{W}$.
* Verificación KVL: $V_{\text{carga}} + \Delta V_{\text{cable}} = 220.00\ \text{V}$.

### Caso de Prueba B (Verificación Kirchhoff KCL con 2 ramas)
* Rama 1 activa ($I_1 \approx 9.94\ \text{A}$) + Rama 2 con equipo de $1100\ \text{W}$ en cable despreciable ($I_2 \approx 5.0\ \text{A}$).
* $I_{\text{total}}$ debe coincidir exactamente con $I_1 + I_2$.

### Caso de Prueba C (Rama con todos los equipos apagados)
* $I_{\text{rama}} = 0\ \text{A}$, $\Delta V = 0\ \text{V}$, $V_{\text{carga}} = V_f$, $P_{\text{pérdida}} = 0\ \text{W}$, sin errores `NaN` ni división por cero.

---

## 9. Secuencia Recomendada de Implementación

1. **Fase 1 — Estructura base y catálogo (`index.html` + `catalog.js`):** crear el esqueleto HTML y las tablas de cables, protecciones y artefactos.
2. **Fase 2 — Motor de cálculo (`physics.js`):** programar las ecuaciones y verificar los 3 casos de prueba (A, B y C) en consola del navegador.
3. **Fase 3 — Controlador e interfaz (`app.js` + `styles.css`):** conectar creación/edición de ramas, interruptores de equipos, KPIs y panel de alertas.
4. **Fase 4 — Diagrama SVG y panel matemático (`diagram.js` + `presets.js`):** dibujar el circuito dinámico, agregar la vista paso a paso de Ohm/Kirchhoff/Potencia y cargar los 3 escenarios predefinidos.
5. **Fase 5 — Pulido y pruebas finales:** probar en Chrome y Edge abriendo directo por doble clic (`file://`), validar el modo impresión PDF (`Ctrl+P`) y confirmar persistencia en `localStorage`.

---

## 10. Sugerencia de Reparto de Tareas para el Equipo (5 integrantes)

* **Integrante 1 (`physics.js` y validación matemática):** implementación de fórmulas de Ohm, Kirchhoff, potencia y verificación con casos de prueba manuales.
* **Integrante 2 (`catalog.js` y `presets.js`):** recopilación de potencias reales de equipos de hogar/taller, tablas de calibres/ampacidades y diseño de los escenarios de demostración.
* **Integrante 3 (`index.html` y `styles.css`):** maquetación de la interfaz, tarjetas de ramas, semáforos visuales y hoja de estilos de impresión.
* **Integrante 4 (`diagram.js`):** generación del esquema eléctrico SVG interactivo con colores y etiquetas en tiempo real.
* **Integrante 5 (`app.js` e integración):** manejo de estado, eventos, vista paso a paso de ecuaciones, persistencia en `localStorage` y pruebas finales de usuario.
