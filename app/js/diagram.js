// diagram.js - genera SVG del circuito unifilar
// recibe instalacion + resultado, devuelve string SVG

window.GeneradorDiagrama = (function() {
    'use strict';

    // layout SVG (el alto crece si hay muchas ramas)
    const SVG_WIDTH = 900;
    const ALTO_MINIMO = 260;
    const MARGIN = 40;

    const FUENTE_X = MARGIN + 30;
    const INTERRUPTOR_GEN_X = FUENTE_X + 80;
    const NODO_X = INTERRUPTOR_GEN_X + 60;
    const RAMA_START_X = NODO_X + 40;
    const RAMA_SPACING = 70;
    const CABLE_LENGTH = 200;
    const ANCHO_CARGA = 112;

    // colores por estado: variables CSS (cambian con el modo oscuro) con el color claro de respaldo.
    // Se aplican con style="fill:..." porque los atributos fill/stroke no aceptan var().
    const COLORES = {
        normal: 'var(--diag-normal, #16a34a)',           // verde
        advertencia: 'var(--diag-advertencia, #d97706)', // amarillo
        peligro: 'var(--diag-peligro, #dc2626)',         // rojo
        fondo: 'var(--diag-fondo, #f8fafc)',
        superficie: 'var(--superficie, #fff)',
        texto: 'var(--texto, #1e293b)',
        textoClaro: 'var(--texto-claro, #64748b)',
        grid: 'var(--diag-grid, #e2e8f0)',
        fuente: 'var(--diag-fuente, #3b82f6)'
    };
    const ETIQUETAS = { normal: 'NORMAL', advertencia: 'ADVERTENCIA', peligro: 'PELIGRO' };

    function esc(str) {
        return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
    function recortar(str, max) {
        str = String(str);
        return str.length > max ? str.slice(0, max - 1) + '…' : str;
    }

    // helpers SVG
    function crearSVG(contenido, alto) {
        return `<svg id="svg-diagrama" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_WIDTH} ${alto}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Diagrama unifilar de la instalación eléctrica" style="width:100%;height:auto;display:block;background:${COLORES.fondo}">${contenido}</svg>`;
    }
    function linea(x1, y1, x2, y2, color = COLORES.texto, ancho = 2, clase = '', guiones = '') {
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke:${color}" stroke-width="${ancho}" stroke-linecap="round" class="${clase}" ${guiones ? `stroke-dasharray="${guiones}"` : ''} />`;
    }
    function rect(x, y, w, h, fill, stroke = 'none', rx = 0, clase = '') {
        return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" style="fill:${fill};stroke:${stroke}" stroke-width="1.5" class="${clase}" />`;
    }
    function circulo(cx, cy, r, fill, stroke = 'none', clase = '') {
        return `<circle cx="${cx}" cy="${cy}" r="${r}" style="fill:${fill};stroke:${stroke}" stroke-width="1.5" class="${clase}" />`;
    }
    // contenido ya escapado o generado por el programa
    function texto(x, y, contenido, opts = {}) {
        const { fill = COLORES.texto, fontSize = 11, fontWeight = 'normal', textAnchor = 'middle', dominantBaseline = 'middle', fontFamily = 'system-ui, -apple-system, sans-serif', clase = '' } = opts;
        return `<text x="${x}" y="${y}" style="fill:${fill}" font-size="${fontSize}" font-weight="${fontWeight}" text-anchor="${textAnchor}" dominant-baseline="${dominantBaseline}" font-family="${fontFamily}" class="${clase}">${contenido}</text>`;
    }
    function grupo(contenido, clase = '', titulo = '') {
        return `<g class="${clase}">${titulo ? `<title>${esc(titulo)}</title>` : ''}${contenido}</g>`;
    }
    function path(d, fill = 'none', stroke = COLORES.texto, ancho = 2, clase = '') {
        return `<path d="${d}" style="fill:${fill};stroke:${stroke}" stroke-width="${ancho}" stroke-linecap="round" stroke-linejoin="round" class="${clase}" />`;
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
            texto(x, y - 1, '~', { fill: '#fff', fontSize: 18, fontWeight: 'bold' }) +
            texto(x, y + 34, `${voltaje} V`, { fill: COLORES.fuente, fontSize: 10, fontWeight: 'bold' }) +
            texto(x, y - 32, 'Fuente', { fill: COLORES.textoClaro, fontSize: 9 })
        , 'fuente', `Fuente de ${voltaje} V`);
    }

    function dibujarInterruptorGeneral(x, y, amperaje, estado, I_total) {
        const color = obtenerColorEstado(estado);
        const w = 36;
        return grupo(
            linea(x - w / 2, y, x - 8, y, color, 3) +
            linea(x + 8, y, x + w / 2, y, color, 3) +
            rect(x - 14, y - 11, 28, 22, COLORES.superficie, color, 3) +
            path(`M ${x - 8} ${y - 5} L ${x + 8} ${y + 5} M ${x + 8} ${y - 5} L ${x - 8} ${y + 5}`, 'none', color, 2) +
            texto(x, y + 26, `${amperaje} A`, { fill: color, fontSize: 9, fontWeight: 'bold' }) +
            texto(x, y - 28, 'General', { fill: COLORES.textoClaro, fontSize: 9 })
        , 'interruptor-general', `Automático general de ${amperaje} A · corriente total ${I_total.toFixed(2)} A · ${ETIQUETAS[estado]}`);
    }

    function dibujarNodoPrincipal(x, y, I_total) {
        return grupo(
            circulo(x, y, 8, COLORES.texto, 'none') +
            circulo(x, y, 4, COLORES.fondo, 'none') +
            texto(x, y - 22, `I total = ${I_total.toFixed(2)} A`, { fill: COLORES.texto, fontSize: 11.5, fontWeight: 'bold' })
        , 'nodo-principal', `Nodo del tablero (1ra ley de Kirchhoff): I total = suma de las corrientes de las ramas = ${I_total.toFixed(2)} A`);
    }

    function dibujarInterruptorRama(x, y, amperaje, estado) {
        const color = obtenerColorEstado(estado);
        const w = 28;
        return grupo(
            linea(x - w / 2, y, x - 6, y, color, 2.5) +
            linea(x + 6, y, x + w / 2, y, color, 2.5) +
            rect(x - 11, y - 9, 22, 18, COLORES.superficie, color, 2) +
            path(`M ${x - 6} ${y - 4} L ${x + 6} ${y + 4} M ${x + 6} ${y - 4} L ${x - 6} ${y + 4}`, 'none', color, 1.5) +
            texto(x, y + 20, `${amperaje} A`, { fill: color, fontSize: 9.5, fontWeight: 'bold' })
        , 'interruptor-rama', `Automático de la rama: ${amperaje} A`);
    }

    function dibujarCable(x1, y, x2, estado, esExtension, deltaV) {
        const color = obtenerColorEstado(estado);
        return linea(x1, y, x2, y, color, esExtension ? 2 : 3.5, esExtension ? 'cable extension' : 'cable', esExtension ? '6 4' : '') +
            (deltaV > 0 ? texto((x1 + x2) / 2, y + 15, `ΔV = ${deltaV.toFixed(1)} V`, { fill: color, fontSize: 10.5, fontWeight: 'bold' }) : '');
    }

    function dibujarCarga(x, y, nombre, potencia, corriente, estado) {
        const color = obtenerColorEstado(estado);
        const h = 36;
        return rect(x - ANCHO_CARGA / 2, y - h / 2, ANCHO_CARGA, h, COLORES.superficie, color, 6) +
            texto(x, y - 6, esc(recortar(nombre, 16)), { fill: COLORES.texto, fontSize: 10.5, fontWeight: 'bold' }) +
            texto(x, y + 7, `${potencia} W · ${corriente.toFixed(2)} A`, { fill: COLORES.textoClaro, fontSize: 9.5 });
    }

    function dibujarExtension(x, y, longitud, seccion, estado) {
        const color = obtenerColorEstado(estado);
        const w = 66, h = 30;
        return rect(x - w / 2, y - h / 2, w, h, COLORES.superficie, color, 4) +
            texto(x, y - 6, 'Extensión', { fill: color, fontSize: 9.5, fontWeight: 'bold' }) +
            texto(x, y + 6, `${longitud} m · ${seccion} mm²`, { fill: COLORES.textoClaro, fontSize: 8.5 });
    }

    function dibujarBadgeEstado(x, y, estado) {
        const color = obtenerColorEstado(estado);
        const w = 100, h = 22;
        return rect(x - w / 2, y - h / 2, w, h, color, 'none', 10) +
            texto(x, y, ETIQUETAS[estado], { fill: 'var(--diag-badge-tx, #fff)', fontSize: 10, fontWeight: 'bold' });
    }

    // principal
    function generarDiagrama(instalacion, resultado) {
        const V_f = instalacion.voltajeFuente || 220;
        const I_general = instalacion.automaticoGeneral || 32;
        const I_total = resultado.totales.I_total;
        const estadoTablero = resultado.estadoGlobal.estadoTablero || resultado.estadoGlobal.estado;
        const ramas = resultado.ramas;
        const numRamas = ramas.length;

        const alto = Math.max(ALTO_MINIMO, 2 * MARGIN + 40 + numRamas * RAMA_SPACING);
        const centroY = alto / 2;
        const posicionesY = [];
        const inicioY = centroY - ((numRamas - 1) * RAMA_SPACING) / 2;
        for (let i = 0; i < numRamas; i++) posicionesY.push(inicioY + i * RAMA_SPACING);

        let svg = rect(0, 0, SVG_WIDTH, alto, COLORES.fondo);
        for (let y = MARGIN; y < alto - MARGIN; y += 50) {
            svg += linea(MARGIN, y, SVG_WIDTH - MARGIN, y, COLORES.grid, 1, 'grid-line');
        }

        svg += dibujarFuente(FUENTE_X, centroY, V_f);
        svg += linea(FUENTE_X + 22, centroY, INTERRUPTOR_GEN_X - 18, centroY, COLORES.fuente, 3);
        svg += dibujarInterruptorGeneral(INTERRUPTOR_GEN_X, centroY, I_general, estadoTablero, I_total);
        svg += linea(INTERRUPTOR_GEN_X + 18, centroY, NODO_X - 8, centroY, COLORES.texto, 3);

        if (numRamas === 0) {
            svg += texto(NODO_X + 30, centroY, 'Agrega una rama para ver el circuito', { fill: COLORES.textoClaro, fontSize: 11, textAnchor: 'start' });
        }

        // barra vertical de distribucion
        if (numRamas > 1) {
            svg += linea(NODO_X + 8, posicionesY[0], NODO_X + 8, posicionesY[numRamas - 1], COLORES.texto, 2.5, 'barra-distribucion');
        }

        for (let i = 0; i < numRamas; i++) {
            const rama = ramas[i];
            const y = posicionesY[i];
            const estado = rama.estado;
            const color = obtenerColorEstado(estado);
            let g = '';

            // derivacion desde la barra
            g += circulo(NODO_X + 8, y, 4.5, color, 'none', 'nodo-rama');
            g += linea(NODO_X + 13, y, RAMA_START_X - 14, y, color, 2);
            g += dibujarInterruptorRama(RAMA_START_X, y, rama.automatico, estado);

            // nombre y valores sobre el cable
            const cableStartX = RAMA_START_X + 14;
            const cableEndX = cableStartX + CABLE_LENGTH;
            g += texto(cableStartX + 4, y - 25, esc(recortar(rama.nombre, 30)), { fontSize: 13, fontWeight: 'bold', textAnchor: 'start' });
            g += texto(cableStartX + 4, y - 11, `I = ${rama.I_rama.toFixed(2)} A  ·  V = ${rama.V_carga.toFixed(1)} V  ·  ΔV = ${rama.deltaV_porcentaje.toFixed(1)} %`, { fill: color, fontSize: 11, fontWeight: 'bold', textAnchor: 'start' });
            g += dibujarCable(cableStartX, y, cableEndX, estado, false, rama.deltaV_cable);

            // extension (si hay)
            let cargaX = cableEndX + 16 + ANCHO_CARGA / 2;
            if (rama.extension) {
                const extSobrecargada = rama.problemas && rama.problemas.some(p => p.codigo === 'SOBRECARGA_EXTENSION');
                const estadoExt = extSobrecargada ? 'peligro' : estado;
                const extEndX = cableEndX + 40;
                g += dibujarCable(cableEndX, y, extEndX, estadoExt, true, 0);
                g += dibujarExtension(extEndX + 33, y, rama.extension.longitud, rama.extension.seccion, estadoExt);
                g += linea(extEndX + 66, y, extEndX + 78, y, color, 2, '', '6 4');
                cargaX = extEndX + 78 + ANCHO_CARGA / 2;
            }

            // equipos encendidos (potencia nominal x cantidad)
            const activas = rama.cargas.filter(c => c.encendido);
            if (activas.length > 0) {
                const potenciaTotal = activas.reduce((s, c) => s + (c.potencia || 0) * (c.cantidad || 1), 0);
                const unidades = activas.reduce((s, c) => s + (c.cantidad || 1), 0);
                const nombre = activas.length === 1
                    ? (activas[0].cantidad > 1 ? `${activas[0].cantidad}× ${activas[0].nombre}` : activas[0].nombre)
                    : `${unidades} equipos`;
                g += dibujarCarga(cargaX, y, nombre, potenciaTotal, rama.I_rama, estado);
            } else {
                g += texto(cargaX - ANCHO_CARGA / 2, y, 'Sin equipos encendidos', { fill: COLORES.textoClaro, fontSize: 9, textAnchor: 'start' });
            }

            g += dibujarBadgeEstado(SVG_WIDTH - MARGIN - 50, y, estado);

            const tooltip = [
                rama.nombre,
                `Corriente: ${rama.I_rama.toFixed(2)} A (automático ${rama.automatico} A, cable ${rama.I_cable ?? '?'} A${rama.I_ext ? `, extensión ${rama.I_ext} A` : ''})`,
                `Caída de voltaje: ${rama.deltaV_cable.toFixed(2)} V (${rama.deltaV_porcentaje.toFixed(2)} %)`,
                `Pérdida en el cable: ${(rama.P_perdida + rama.P_perdida_ext).toFixed(1)} W`,
                `Equipos: ${activas.map(c => `${c.cantidad}× ${c.nombre}`).join(', ') || 'ninguno encendido'}`,
                `Estado: ${ETIQUETAS[estado]} — ${rama.mensajeEstado}`
            ].join('\n');
            svg += grupo(g, 'rama', tooltip);
        }

        return crearSVG(svg, alto);
    }

    // leyenda HTML para panel lateral
    function generarLeyendaHTML(resultado) {
        const ramas = resultado.ramas;
        let html = '<div class="leyenda-lista">';
        for (const rama of ramas) {
            const color = obtenerColorEstado(rama.estado);
            html += `<div class="leyenda-item" style="border-left-color: ${color}"><span class="leyenda-nombre">${esc(rama.nombre)}</span><span class="leyenda-estado" style="color: ${color}">${ETIQUETAS[rama.estado]}</span><span class="leyenda-detalle">${rama.I_rama.toFixed(2)} A · ${rama.V_carga.toFixed(1)} V · ΔV ${rama.deltaV_porcentaje.toFixed(1)} %</span></div>`;
        }
        const eg = resultado.estadoGlobal;
        const colorGlobal = obtenerColorEstado(eg.estado);
        html += `<div class="leyenda-item leyenda-global" style="border-left-color: ${colorGlobal}"><strong>Estado de la instalación: ${ETIQUETAS[eg.estado]}</strong><span style="color: ${colorGlobal}">${eg.ramasPeligro ?? 0} rama(s) en peligro, ${eg.ramasAdvertencia ?? 0} en advertencia · automático general ${ETIQUETAS[eg.estadoTablero || eg.estado]}</span></div>`;
        html += '<p class="leyenda-ayuda">Pasa el mouse sobre una rama para ver su detalle. Zoom: botones + / −, Ctrl + rueda del mouse o pellizco en el touchpad; arrastra para moverte y haz doble clic para ver todo.</p>';
        html += '</div>';
        return html;
    }

    return { generarDiagrama, generarLeyendaHTML, _internals: { SVG_WIDTH, COLORES, obtenerColorEstado } };
})();
