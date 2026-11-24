// diagram.js - genera SVG del circuito unifilar
// recibe instalacion + resultado, devuelve string SVG

window.GeneradorDiagrama = (function() {
    'use strict';

    // layout SVG
    const SVG_WIDTH = 800;
    const SVG_HEIGHT = 500;
    const MARGIN = 40;

    const FUENTE_X = MARGIN + 30;
    const FUENTE_Y = SVG_HEIGHT / 2;
    const INTERRUPTOR_GEN_X = FUENTE_X + 80;
    const NODO_X = INTERRUPTOR_GEN_X + 60;
    const RAMA_START_X = NODO_X + 40;
    const RAMA_SPACING = 55;
    const CABLE_LENGTH = 220;

    // colores por estado
    const COLORES = {
        normal: '#16a34a',       // verde
        advertencia: '#f59e0b',  // amarillo
        peligro: '#dc2626',      // rojo
        fondo: '#f8fafc',
        texto: '#1e293b',
        textoClaro: '#64748b',
        grid: '#e2e8f0',
        fuente: '#3b82f6'
    };

    // helpers SVG
    function crearSVG(contenido) {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;background:${COLORES.fondo}">${contenido}</svg>`;
    }
    function linea(x1, y1, x2, y2, color = COLORES.texto, ancho = 2, clase = '') {
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${ancho}" stroke-linecap="round" class="${clase}" />`;
    }
    function rect(x, y, w, h, fill, stroke = 'none', rx = 0, clase = '') {
        return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" class="${clase}" />`;
    }
    function circulo(cx, cy, r, fill, stroke = 'none', clase = '') {
        return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" class="${clase}" />`;
    }
    function texto(x, y, contenido, opts = {}) {
        const { fill = COLORES.texto, fontSize = 11, fontWeight = 'normal', textAnchor = 'middle', dominantBaseline = 'middle', fontFamily = 'system-ui, -apple-system, sans-serif', clase = '', transform = '' } = opts;
        return `<text x="${x}" y="${y}" fill="${fill}" font-size="${fontSize}" font-weight="${fontWeight}" text-anchor="${textAnchor}" dominant-baseline="${dominantBaseline}" font-family="${fontFamily}" class="${clase}" ${transform ? `transform="${transform}"` : ''}>${contenido}</text>`;
    }
    function grupo(contenido, clase = '', transform = '') {
        return `<g class="${clase}" ${transform ? `transform="${transform}"` : ''}>${contenido}</g>`;
    }
    function path(d, fill = 'none', stroke = COLORES.texto, ancho = 2, clase = '') {
        return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${ancho}" stroke-linecap="round" stroke-linejoin="round" class="${clase}" />`;
    }

    function obtenerColorEstado(estado) {
        switch (estado) {
            case 'peligro': return COLORES.peligro;
            case 'advertencia': return COLORES.advertencia;
            default: return COLORES.normal;
        }
    }

    // componentes
    function dibujarFuente(x, y, voltaje) {
        const r = 22;
        return grupo(
            circulo(x, y, r, 'none', COLORES.fuente) +
            circulo(x, y, r - 6, COLORES.fuente, 'none') +
            texto(x, y - 2, '~', { fill: '#fff', fontSize: 18, fontWeight: 'bold' }) +
            texto(x, y + 18, `${voltaje} V`, { fill: COLORES.fuente, fontSize: 10, fontWeight: 'bold' }) +
            texto(x, y - 30, 'Fuente', { fill: COLORES.textoClaro, fontSize: 9 })
        );
    }

    function dibujarInterruptorGeneral(x, y, amperaje, estado) {
        const color = obtenerColorEstado(estado);
        const w = 36;
        return grupo(
            linea(x - w/2, y, x - 8, y, color, 3) +
            linea(x + 8, y, x + w/2, y, color, 3) +
            rect(x - 14, y - 11, 28, 22, 'none', color, 3) +
            path(`M ${x - 10} ${y - 4} L ${x + 2} ${y + 6} M ${x + 2} ${y - 4} L ${x - 10} ${y + 6}`, 'none', color, 2) +
            texto(x, y + 24, `${amperaje} A`, { fill: color, fontSize: 9, fontWeight: 'bold' }) +
            texto(x, y - 28, 'General', { fill: COLORES.textoClaro, fontSize: 9 })
        , 'interruptor-general');
    }

    function dibujarNodoPrincipal(x, y, I_total) {
        return grupo(
            circulo(x, y, 8, COLORES.texto, 'none') +
            circulo(x, y, 4, '#fff', 'none') +
            texto(x, y - 20, `It = ${I_total.toFixed(2)} A`, { fill: COLORES.texto, fontSize: 10, fontWeight: 'bold' })
        , 'nodo-principal');
    }

    function dibujarInterruptorRama(x, y, amperaje, estado) {
        const color = obtenerColorEstado(estado);
        const w = 28;
        return grupo(
            linea(x - w/2, y, x - 6, y, color, 2.5) +
            linea(x + 6, y, x + w/2, y, color, 2.5) +
            rect(x - 11, y - 9, 22, 18, 'none', color, 2) +
            path(`M ${x - 7} ${y - 2} L ${x + 1} ${y + 4} M ${x + 1} ${y - 2} L ${x - 7} ${y + 4}`, 'none', color, 1.5) +
            texto(x, y + 18, `${amperaje} A`, { fill: color, fontSize: 8, fontWeight: 'bold' })
        , 'interruptor-rama');
    }

    function dibujarCable(x1, y1, x2, y2, estado, extension = false, deltaV = 0) {
        const color = obtenerColorEstado(estado);
        const esExt = extension;
        const ancho = esExt ? 2 : 3;
        const midX = (x1 + x2) / 2;
        const midY = y1 - (esExt ? 15 : 10);
        return grupo(
            linea(x1, y1, x2, y2, color, ancho, `cable ${esExt ? 'extension' : ''}`) +
            (deltaV > 0 ? texto(midX, midY, `dV = ${deltaV.toFixed(1)} V`, { fill: color, fontSize: 9, fontWeight: 'bold', textAnchor: 'middle' }) : '')
        , `cable-${esExt ? 'ext' : 'rama'}`);
    }

    function dibujarCarga(x, y, nombre, potencia, corriente, estado) {
        const color = obtenerColorEstado(estado);
        const w = 70, h = 36;
        return grupo(
            rect(x - w/2, y - h/2, w, h, '#fff', color, 6) +
            texto(x, y - 6, nombre, { fill: COLORES.texto, fontSize: 9, fontWeight: 'bold' }) +
            texto(x, y + 6, `${potencia} W · ${corriente.toFixed(2)} A`, { fill: COLORES.textoClaro, fontSize: 8 })
        , 'carga');
    }

    function dibujarExtension(x, y, longitud, seccion, estado, I_rama) {
        const color = obtenerColorEstado(estado);
        const w = 50, h = 24;
        return grupo(
            rect(x - w/2, y - h/2, w, h, '#fff', color, 4) +
            texto(x, y - 4, 'Extension', { fill: color, fontSize: 8, fontWeight: 'bold' }) +
            texto(x, y + 6, `${longitud} m · ${seccion} mm2`, { fill: COLORES.textoClaro, fontSize: 7 }) +
            texto(x, y + 16, `${I_rama.toFixed(1)} A`, { fill: color, fontSize: 8, fontWeight: 'bold' })
        , 'extension');
    }

    function dibujarEtiquetaRama(x, y, nombre, I_rama, V_carga, deltaV_pct, estado) {
        const color = obtenerColorEstado(estado);
        return grupo(
            texto(x, y, nombre, { fill: COLORES.texto, fontSize: 11, fontWeight: 'bold', textAnchor: 'start' }) +
            texto(x, y + 14, `I = ${I_rama.toFixed(2)} A  |  V = ${V_carga.toFixed(1)} V  |  dV = ${deltaV_pct.toFixed(1)}%`, { fill: color, fontSize: 9, fontWeight: 'bold', textAnchor: 'start' })
        , 'etiqueta-rama');
    }

    function dibujarBadgeEstado(x, y, estado) {
        const labels = { normal: 'NORMAL', advertencia: 'ADVERTENCIA', peligro: 'PELIGRO' };
        const colors = { normal: COLORES.normal, advertencia: COLORES.advertencia, peligro: COLORES.peligro };
        const color = colors[estado];
        const label = labels[estado];
        const w = 90, h = 20;
        return grupo(
            rect(x - w/2, y - h/2, w, h, color, 'none', 10) +
            texto(x, y, label, { fill: '#fff', fontSize: 8, fontWeight: 'bold' })
        , 'badge-estado');
    }

    // principal
    function generarDiagrama(instalacion, resultado) {
        const V_f = instalacion.voltajeFuente || 220;
        const I_general = instalacion.automaticoGeneral || 32;
        const I_total = resultado.totales.I_total;
        const estadoGlobal = resultado.estadoGlobal.estado;
        const ramas = resultado.ramas;
        const numRamas = ramas.length;

        // posiciones Y ramas
        const posicionesY = [];
        if (numRamas === 1) {
            posicionesY.push(FUENTE_Y);
        } else if (numRamas === 2) {
            posicionesY.push(FUENTE_Y - 60, FUENTE_Y + 60);
        } else {
            const startY = FUENTE_Y - ((numRamas - 1) * RAMA_SPACING) / 2;
            for (let i = 0; i < numRamas; i++) {
                posicionesY.push(startY + i * RAMA_SPACING);
            }
        }

        let svgContent = '';
        svgContent += rect(0, 0, SVG_WIDTH, SVG_HEIGHT, COLORES.fondo);
        for (let y = MARGIN; y < SVG_HEIGHT - MARGIN; y += 50) {
            svgContent += linea(MARGIN, y, SVG_WIDTH - MARGIN, y, COLORES.grid, 1, 'grid-line');
        }

        // fuente
        svgContent += dibujarFuente(FUENTE_X, FUENTE_Y, V_f);
        // linea a automatico general
        svgContent += linea(FUENTE_X + 22, FUENTE_Y, INTERRUPTOR_GEN_X - 18, FUENTE_Y, COLORES.fuente, 3);
        // automatico general
        svgContent += dibujarInterruptorGeneral(INTERRUPTOR_GEN_X, FUENTE_Y, I_general, estadoGlobal);
        // linea a nodo principal
        svgContent += linea(INTERRUPTOR_GEN_X + 18, FUENTE_Y, NODO_X - 8, FUENTE_Y, COLORES.texto, 3);
        // nodo principal (Kirchhoff)
        svgContent += dibujarNodoPrincipal(NODO_X, FUENTE_Y, I_total);

        // ramas
        for (let i = 0; i < numRamas; i++) {
            const rama = ramas[i];
            const y = posicionesY[i];
            const estado = rama.estado;
            const color = obtenerColorEstado(estado);

            // vertical desde nodo
            svgContent += linea(NODO_X + 8, FUENTE_Y, NODO_X + 8, y, color, 2, 'rama-vertical');
            // nodo derivacion
            svgContent += circulo(NODO_X + 8, y, 5, color, 'none', 'nodo-rama');
            // horizontal a interruptor rama
            const intRamaX = RAMA_START_X;
            svgContent += linea(NODO_X + 13, y, intRamaX - 14, y, color, 2);
            // interruptor rama
            svgContent += dibujarInterruptorRama(intRamaX, y, rama.automatico, estado);

            // cable principal
            const cableStartX = intRamaX + 14;
            const cableEndX = cableStartX + CABLE_LENGTH;
            svgContent += dibujarCable(cableStartX, y, cableEndX, y, estado, false, rama.deltaV_cable);

            // extension si hay
            let cargaX = cableEndX + 40;
            if (rama.extension) {
                const extStartX = cableEndX;
                const extEndX = extStartX + 80;
                svgContent += dibujarCable(extStartX, y, extEndX, y, rama.estado, true, 0);
                svgContent += dibujarExtension(extEndX + 25, y, rama.extension.longitud, rama.extension.seccion, rama.estado, rama.I_rama);
                cargaX = extEndX + 80;
            }

            // cargas
            const cargasActivas = rama.cargas.filter(c => c.encendido);
            if (cargasActivas.length > 0) {
                const potenciaTotal = cargasActivas.reduce((s, c) => s + (c.potencia || 0), 0);
                const nombrePrincipal = cargasActivas.length === 1
                    ? cargasActivas[0].nombre
                    : `${cargasActivas.length} equipos (${potenciaTotal} W)`;
                svgContent += dibujarCarga(cargaX, y, nombrePrincipal, potenciaTotal, rama.I_rama, estado);
            } else {
                svgContent += texto(cargaX, y, 'Sin cargas', { fill: COLORES.textoClaro, fontSize: 9, textAnchor: 'start' });
            }

            // etiqueta y badge
            svgContent += dibujarEtiquetaRama(MARGIN + 10, y - 22, rama.nombre, rama.I_rama, rama.V_carga, rama.deltaV_porcentaje, estado);
            svgContent += dibujarBadgeEstado(SVG_WIDTH - MARGIN - 45, y, estado);
        }

        return crearSVG(svgContent);
    }

    // leyenda HTML para panel lateral
    function generarLeyendaHTML(resultado) {
        const ramas = resultado.ramas;
        let html = '<div class="leyenda-lista">';
        for (const rama of ramas) {
            const color = obtenerColorEstado(rama.estado);
            const labels = { normal: 'Normal', advertencia: 'Advertencia', peligro: 'Peligro' };
            html += `<div class="leyenda-item" style="border-left-color: ${color}"><span class="leyenda-nombre">${rama.nombre}</span><span class="leyenda-estado" style="color: ${color}">${labels[rama.estado]}</span><span class="leyenda-detalle">${rama.I_rama.toFixed(2)} A · ${rama.V_carga.toFixed(1)} V · dV ${rama.deltaV_porcentaje.toFixed(1)}%</span></div>`;
        }
        const eg = resultado.estadoGlobal;
        const colorGlobal = obtenerColorEstado(eg.estado);
        const labels = { normal: 'Normal', advertencia: 'Advertencia', peligro: 'Peligro' };
        html += `<div class="leyenda-item leyenda-global" style="border-left-color: ${colorGlobal}; background: ${colorGlobal}15"><strong>Estado General: ${labels[eg.estado]}</strong><span style="color: ${colorGlobal}">${eg.conteoPeligro} peligro, ${eg.conteoAdvertencia} advertencia</span></div>`;
        html += '</div>';
        return html;
    }

    return { generarDiagrama, generarLeyendaHTML, _internals: { SVG_WIDTH, SVG_HEIGHT, COLORES, obtenerColorEstado } };
})();