# Sistema computacional de análisis y detección de sobrecargas eléctricas en instalaciones pequeñas

Simulador web que calcula la **corriente**, la **caída de voltaje** y la **potencia** de cada rama de una instalación
eléctrica (vivienda o pequeño taller) y avisa con un semáforo (**Normal / Advertencia / Peligro**) cuando se supera el
automático, la ampacidad del cable o de la extensión, o la caída de voltaje permitida.

**Integrantes:** Vicente Peña F., Benjamín Rivera A., Benjamín González C., Joel Manríquez S., Cristian Parra V.

## Cómo usarlo

1. Abrir `app/index.html` con doble clic (Chrome o Edge). No necesita internet ni instalar nada.
2. Cargar un escenario desde el selector **Escenario** o crear ramas con **+ Nueva rama**.
3. En cada rama: definir largo, sección del cable y automático; marcar si usa extensión; agregar equipos y
   encenderlos o apagarlos para ver el antes y el después.
4. Revisar las pestañas **Diagrama eléctrico**, **Diagnóstico** y **Cálculos matemáticos** (por rama o para toda la
   instalación).
5. **Exportar** guarda el circuito en un archivo JSON; **Importar** lo vuelve a abrir. **Imprimir** genera el reporte en PDF.
6. Extras: reordenar ramas arrastrando el asa ⋮⋮ (o con ↑ / ↓), zoom en el diagrama (botones, Ctrl + rueda, doble clic para
   ver todo) y botón **Tema** para cambiar entre automático, claro y oscuro.

## Modelo matemático

| Paso | Fórmula |
|---|---|
| Resistencia del cable (ida y vuelta) | R_cable = ρ · 2L / A, con ρ = 0.0172 Ω·mm²/m |
| Resistencia de cada equipo | R_equipo = V² / P |
| Equipos en paralelo | 1 / R_cargas = Σ c_j / R_equipo,j |
| Ley de Ohm en la rama | I_rama = V / (R_cable + R_cargas) |
| 2da ley de Kirchhoff (malla) | V − ΔV_cable − V_carga = 0, con ΔV_cable = I · R_cable |
| 1ra ley de Kirchhoff (nodos) | I_total = Σ I_rama ; I_rama = Σ c_j · I_equipo,j |
| Potencia | P_carga = V_carga · I ; P_pérdida = I² · R_cable |

**Simplificaciones:** equipos modelados como resistencias (sin factor de potencia), cobre a 20 °C, voltaje de la fuente
constante (sin resistencia en la línea del empalme al tablero) y todos los equipos encendidos funcionando a la vez.

## Estructura

```
app/
├── index.html        interfaz
├── css/styles.css    estilos, semáforos e impresión
└── js/
    ├── catalog.js    cables, automáticos y artefactos
    ├── physics.js    motor de cálculo y alertas (sin DOM)
    ├── diagram.js    diagrama unifilar SVG
    ├── presets.js    escenarios predefinidos
    └── app.js        estado, eventos y renderizado
tests/
└── pruebas.js        pruebas automáticas del motor
```

## Pruebas

Con [Node.js](https://nodejs.org) instalado:

```bash
node tests/pruebas.js
```

Comprueba los casos A, B y C del plan (por ejemplo, una rama de 2200 W con 10 m de cable de 2,5 mm² da 9,9378 A y
0,62 % de caída), las leyes de Kirchhoff, el balance de potencia, cada regla de alerta y el estado esperado de los 5
escenarios. También se pueden correr en la consola del navegador: `MotorCalculo.validarCasoPruebaA()`.

## Documentos

- `PLAN_CONSTRUCCION_PROYECTO.md`: plan completo del producto.
- `ESTADO_PROYECTO.md`: qué está hecho, qué se corrigió y qué queda pendiente.
