# Estado del Proyecto - Simulador de Sobrecargas Eléctricas

## ✅ COMPLETADO (Fase 1, 2, 3, 4)

### Archivos creados en `app/`

| Archivo | Descripción | Estado |
|---------|-------------|--------|
| `index.html` | Estructura semántica completa: header, parámetros, KPIs, panel ramas (izq), tabs diagrama/diagnóstico/matemáticas (der), modales fórmulas y confirmación | ✅ |
| `css/styles.css` | Sistema de diseño simple, responsive, semáforos (verde/amarillo/rojo), `@media print` para PDF limpio | ✅ |
| `js/catalog.js` | Catálogo datos: ρ=0.0172, 6 conductores, protecciones rama/general, 14 artefactos (vivienda+taller), utilidades R_cable, R_equipo | ✅ |
| `js/physics.js` | Motor puro: Ohm, Kirchhoff (nodos+mallas), caída tensión, Joule, evaluador alertas (Normal/Advertencia/Peligro), recomendaciones, 3 casos prueba validables en consola | ✅ |
| `js/diagram.js` | Generador SVG dinámico: fuente, auto general, nodo Kirchhoff, ramas con auto, cable coloreado por riesgo, extensión, cargas, badges, leyenda | ✅ |
| `js/presets.js` | 5 escenarios: 3 principales (sobrecarga vivienda, taller con extensión, instalación segura) + cocina + validación matemática | ✅ |
| `js/app.js` | Controlador principal: estado, eventos DOM, render KPIs/ramas/diagrama/diagnóstico/matemáticas, localStorage, integración completa | ✅ |

### Funcionalidades implementadas
- Crear/editar/eliminar ramas con cable, automático, extensión opcional
- Agregar cargas desde catálogo o personalizadas (nombre, W, cantidad)
- Encender/apagar cargas individualmente (simula antes/después)
- Cálculo en tiempo real: I, V_carga, ΔV%, P_carga, P_pérdida por rama y totales
- Alertas semáforo: Normal / Advertencia / Peligro con mensajes accionables
- Recomendaciones contextuales (cambiar cable, quitar extensión, no agregar cargas)
- Diagrama SVG unifilar vivo con colores por riesgo
- Panel diagnóstico con alertas y recomendaciones
- Panel matemáticas paso a paso (Ohm, Kirchhoff, Potencia) con valores numéricos
- 3 escenarios predefinidos cargables en 1 clic
- Persistencia en localStorage (survive reload)
- Print/PDF limpio (`@media print` oculta controles)
- Funciona abriendo `index.html` directo (`file://`) sin servidor

### Validaciones matemáticas (consola)
```js
// En consola del navegador:
window.MotorCalculo.validarCasoPruebaA()  // Rama simple 2200W
window.MotorCalculo.validarCasoPruebaB()  // KCL 2 ramas
window.MotorCalculo.validarCasoPruebaC()  // Rama sin cargas
```

---

## ❌ PENDIENTE (para la otra persona)

### Mejoras de UX/UI
- [ ] Arrastrar y soltar para reordenar ramas
- [ ] Tooltips con más detalle en diagrama SVG (hover en cable = ΔV, I, P_pérdida)
- [ ] Animaciones suaves al abrir/cerrar tarjetas de rama
- [ ] Indicador visual de carga en cálculos pesados (aunque es instantáneo)
- [ ] Modo oscuro (CSS variables ya preparadas)

### Funcionalidades extra
- [ ] Exportar/importar JSON del circuito (backup manual)
- [ ] Duplicar rama (botón "Clonar")
- [ ] Guardar escenario personalizado en localStorage
- [ ] Zoom/pan en diagrama SVG
- [ ] Mostrar corrientes por equipo en diagrama (expandible)

### Validación y robustez
- [ ] Validación más estricta en inputs (longitud > 0, sección válida, etc.)
- [ ] Manejo de errores gracioso si physics.js falla
- [ ] Tests automatizados (Jest/Vitest) para physics.js con los 3 casos del plan
- [ ] Verificar compatibilidad Edge/Firefox/Safari (solo Chrome probado)

### Documentación
- [ ] README.md en raíz del repo con instrucciones de uso
- [ ] Comentarios JSDoc en funciones públicas de cada módulo
- [ ] Guía rápida de usuario (atajos, flujo típico)

### Código
- [ ] Revisar `app.js`: función `renderCargasLista` recrea HTML completo → pierde event listeners (ya solucionado con `bindCargaEvents` pero es frágil)
- [ ] Extraer helpers de DOM a utilidad compartida
- [ ] TypeScript opcional (tipar interfaces Estado, Rama, Resultado)

---

## 🚀 Cómo probar

```bash
# Opción 1: Doble clic directo
# Abre: C:\Users\Benja\Documents\Proyecto\app\index.html

# Opción 2: Servidor local (recomendado para evitar CORS en algunos navegadores)
cd C:\Users\Benja\Documents\Proyecto\app
python -m http.server 8000
# Luego: http://localhost:8000
```

---

## 📦 Subir a GitHub

Git no está instalado en esta máquina. Para subir a `https://github.com/devbenjaminrivera/electro.git`:

1. Instala Git: https://git-scm.com/download/win
2. En terminal (PowerShell/CMD):
```powershell
cd C:\Users\Benja\Documents\Proyecto
git init
git add .
git commit -m "Simulador eléctrico: core completo (catalog, physics, diagram, presets, app, styles)"
git branch -M main
git remote add origin https://github.com/devbenjaminrivera/electro.git
git push -u origin main
```

O usa **GitHub Desktop** / interfaz web (Add file → Upload files) arrastrando la carpeta `app/`.

---

## 📝 Notas para quien continúe

- **Arquitectura**: Módulos independientes en `window.*` (Catalog, MotorCalculo, GeneradorDiagrama, EscenariosPredefinidos). `app.js` es el único que toca DOM.
- **Estilo de código**: Comentarios informales, sin emojis, nombres en español, ES5/ES6 mix (IIFE + arrow functions).
- **Fórmulas**: Todas en `physics.js` y `diagram.js` — no duplicar lógica en `app.js`.
- **Extensión**: Si agregas campos a Rama, actualiza `construirInstalacion()` en `app.js` y los tipos en `physics.js`.
- **CSS**: Variables en `:root` para colores semáforo. `@media print` al final.