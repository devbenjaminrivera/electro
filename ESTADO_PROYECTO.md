# Estado del Proyecto - Simulador de Sobrecargas Eléctricas

Última actualización: 25/11/2026

## ✅ COMPLETADO

### Archivos en `app/`

| Archivo | Descripción | Estado |
|---------|-------------|--------|
| `index.html` | Estructura: header, parámetros, KPIs, panel de ramas (izq), pestañas diagrama/diagnóstico/matemáticas (der), modales de fórmulas y confirmación | ✅ |
| `css/styles.css` | Diseño responsive, semáforos (verde/amarillo/rojo), `@media print` con diagrama, diagnóstico y cálculos | ✅ |
| `js/catalog.js` | Catálogo: ρ = 0.0172, 6 conductores, protecciones de rama/general, 14 artefactos (vivienda + taller) | ✅ |
| `js/physics.js` | Motor puro: Ohm, Kirchhoff (nodos + mallas), caída de tensión, Joule, alertas con lista de todos los problemas, recomendaciones | ✅ |
| `js/diagram.js` | SVG dinámico: fuente, automático general, nodo de Kirchhoff, ramas, cable y extensión coloreados por riesgo, cargas, tooltips | ✅ |
| `js/presets.js` | 5 escenarios: 3 principales + cocina + validación matemática (todos visibles en el selector) | ✅ |
| `js/app.js` | Controlador: estado, eventos, render, localStorage, exportar/importar, validación de entradas | ✅ |
| `tests/pruebas.js` | 19 pruebas automáticas del motor (casos A, B y C del plan, alertas y escenarios). Se corren con `node tests/pruebas.js` | ✅ |
| `README.md` | Instrucciones de uso, estructura y pruebas | ✅ |

### Funcionalidades
- Crear, editar, duplicar y eliminar ramas con cable, automático y extensión opcional
- Agregar equipos del catálogo o personalizados (nombre, W, cantidad)
- Encender/apagar equipos y cambiar su cantidad (simula el antes y el después)
- Cálculo en tiempo real: I, V_carga, ΔV %, P_carga y P_pérdida por rama y totales
- Alertas con semáforo Normal / Advertencia / Peligro y todos los problemas de cada rama
- Recomendaciones (cambiar cable, bajar el automático, cambiar o quitar la extensión, repartir equipos)
- Diagrama unifilar SVG en vivo, con tooltips al pasar el mouse
- Panel de diagnóstico con alertas y recomendaciones
- Panel matemático paso a paso por rama y para toda la instalación (nodo del tablero y balance de potencia)
- Exportar e importar el circuito en JSON
- Persistencia en localStorage
- Imprimir / guardar PDF con ramas, diagrama, diagnóstico y cálculos
- Funciona abriendo `index.html` directo (`file://`), sin servidor ni internet
- Reordenar ramas arrastrando el asa ⋮⋮ o con los botones ↑ / ↓ (el panel matemático sigue en la misma rama)
- Zoom y desplazamiento del diagrama: botones + / − / ⤢, Ctrl + rueda o pellizco en el touchpad, arrastrar para moverse, doble clic para ver todo
- Modo oscuro con botón **Tema** (automático según el sistema, claro u oscuro; se recuerda). El diagrama usa variables CSS y la impresión siempre sale en claro
- Formulario propio para el equipo personalizado (nombre, potencia y cantidad validados, con la corriente estimada), en vez de los `prompt()`

---

## 🔧 CORRECCIONES DEL 25/11/2026

Errores que impedían usar la app o que daban resultados equivocados:

1. **`app.js` no cargaba (error de sintaxis):** la función `escapeHtml` tenía las entidades HTML estropeadas (`'''`). Ningún botón funcionaba.
2. **El diagrama no se actualizaba:** el SVG generado no tenía `id="svg-diagrama"`, así que después del primer dibujo quedaba fijo en 0 A.
3. **Encender/apagar, cambiar cantidad y eliminar equipos no hacían nada:** `bindCargaEvents` nunca se llamaba.
4. **"Estado general" decía NORMAL con ramas en PELIGRO:** solo miraba el automático general. Ahora hay dos estados: `estadoTablero` (tarjeta de corriente total) y `estado` (toda la instalación).
5. **No se revisaba la ampacidad de la extensión:** en el escenario 2, una extensión de 0,75 mm² (6 A) con 10,2 A decía "cerca de su límite". Ahora es PELIGRO por sobrecarga de la extensión.
6. **No se detectaba un automático mayor que el cable** (ej.: 1,5 mm² con 16 A). Ahora es PELIGRO: el automático no protege el cable.
7. **Solo se mostraba el primer problema de cada rama.** Ahora se listan todos (`problemas`).
8. **Kirchhoff en el nodo de la rama ignoraba la cantidad** (6 ampolletas se sumaban como 1). También la potencia de las cargas en el diagrama.
9. **Al cargar un escenario y editarlo, se modificaba el escenario original** (copia superficial). Ahora es copia profunda.
10. **La tarjeta de la rama se cerraba después de cada cambio** y **el panel matemático perdía la rama elegida.**
11. **Una ampacidad desconocida se trataba como 0 A** (todo quedaba en peligro). Ahora es una advertencia "sin dato".
12. Textos con tildes y eñes, diagrama con letra más grande, sin superposiciones y con alto automático para muchas ramas.
13. Nombres escapados en el diagrama y el diagnóstico (un `&` o `<` en el nombre rompía el SVG).
14. Los modales aparecían en la esquina superior izquierda (el reset `margin: 0` anulaba el centrado de `<dialog>`).

### Mejoras de interfaz (25/11/2026)

- ✅ Arrastrar y soltar para reordenar ramas, más botones ↑ / ↓ para teclado y pantallas táctiles
- ✅ Zoom y desplazamiento en el diagrama SVG
- ✅ Modo oscuro (colores en variables CSS, también en `diagram.js` y los semáforos)
- ✅ Formulario para el equipo personalizado en lugar de `prompt()`

---

## ❌ PENDIENTE (opcional)

### Contenido para la entrega
- [ ] Verificar y citar la tabla de ampacidades de `catalog.js` (la normativa vigente en Chile son los Pliegos Técnicos RIC de la SEC; confirmar el número del pliego que trae las tablas de conductores)
- [ ] Verificar las potencias de los artefactos con fichas técnicas

### Código
- [ ] Comentarios JSDoc en las funciones públicas
- [ ] Probar en Firefox y Safari (probado en Chromium)

---

## 🚀 Cómo probar

```bash
# Opción 1: doble clic en app/index.html

# Opción 2: pruebas automáticas del motor (requiere Node.js)
node tests/pruebas.js
```

---

## 📝 Notas para quien continúe

- **Arquitectura:** módulos independientes en `window.*` (CatalogoElectrico, MotorCalculo, GeneradorDiagrama, EscenariosPredefinidos). `app.js` es el único que toca el DOM.
- **Fórmulas:** todas en `physics.js`; no duplicar lógica en `app.js` ni en `diagram.js`.
- **Resultado de cada rama:** `estado`, `mensajeEstado` (el problema principal) y `problemas` (todos). `cargas[i]` tiene el mismo orden que las cargas de entrada e incluye `corriente` (por unidad) y `corrienteTotal`.
- **Estado global:** `estadoGlobal.estado` = peor estado de toda la instalación; `estadoGlobal.estadoTablero` = solo el automático general.
- **Si agregas campos a Rama:** actualiza `normalizarRama()` y `construirInstalacion()` en `app.js`.
- **Colores:** todos en variables CSS de `styles.css` (`:root` claro, `html[data-tema="oscuro"]` y `prefers-color-scheme`). En `diagram.js` se aplican con `style="fill:var(...)"` porque los atributos `fill`/`stroke` no aceptan `var()`. No agregar colores fijos.
- **Zoom:** solo cambia el `viewBox` del SVG (`aplicarZoom()` en `app.js`); el tamaño completo queda en `data-base`. Se vuelve a 100 % al cargar un escenario, importar o reiniciar.
- **Antes de subir cambios:** correr `node tests/pruebas.js`.
