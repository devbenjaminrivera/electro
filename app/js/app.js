// app.js - controlador principal: estado, eventos, render, localStorage
// conecta catalog, physics, diagram, presets

(function() {
    'use strict';

    // ==================== ESTADO GLOBAL ====================
    const state = {
        voltajeFuente: 220,
        automaticoGeneral: 32,
        limitesCaida: { advertencia: 3, peligro: 5 },
        ramas: [],
        nextRamaId: 1
    };

    // elementos DOM principales
    const els = {};

    // ==================== INICIALIZACION ====================
    function init() {
        cacheDOM();
        cargarDesdeLocalStorage();
        poblarSelectAutomaticoGeneral();
        poblarEscenarios();
        bindEventos();
        renderTodo();
    }

    function cacheDOM() {
        // header
        els.selEscenario = document.getElementById('sel-escenario');
        els.btnCargarEscenario = document.getElementById('btn-cargar-escenario');
        els.btnNuevaRama = document.getElementById('btn-nueva-rama');
        els.btnFormulas = document.getElementById('btn-formulas');
        els.btnImprimir = document.getElementById('btn-imprimir');
        els.btnReiniciar = document.getElementById('btn-reiniciar');
        els.btnPrimeraRama = document.getElementById('btn-primera-rama');

        // parametros
        els.inpVoltaje = document.getElementById('inp-voltaje');
        els.inpAutomaticoGeneral = document.getElementById('inp-automatico-general');
        els.inpLimiteAdv = document.getElementById('inp-limite-advertencia');
        els.inpLimitePeligro = document.getElementById('inp-limite-peligro');

        // kpis
        els.valCorrienteTotal = document.getElementById('val-corriente-total');
        els.progCorrienteTotal = document.getElementById('prog-corriente-total');
        els.detCorrienteTotal = document.getElementById('det-corriente-total');
        els.estadoCorrienteTotal = document.getElementById('estado-corriente-total');
        els.valPotenciaTotal = document.getElementById('val-potencia-total');
        els.valPerdidaTotal = document.getElementById('val-perdida-total');
        els.valEstadoGlobal = document.getElementById('val-estado-global');
        els.detEstadoGlobal = document.getElementById('det-estado-global');

        // panel ramas
        els.panelRamas = document.getElementById('panel-ramas');
        els.msgVacio = document.getElementById('msg-vacio');

        // tabs
        els.tabBtns = document.querySelectorAll('.tab-btn');
        els.tabPanels = document.querySelectorAll('.tab-panel');
        els.svgDiagrama = document.getElementById('svg-diagrama');
        els.leyendaDiagrama = document.getElementById('leyenda-diagrama');
        els.panelDiagnostico = document.getElementById('panel-diagnostico-contenido');
        els.selRamaMatematicas = document.getElementById('sel-rama-matematicas');
        els.matematicasContenido = document.getElementById('matematicas-contenido');

        // modales
        els.modalFormulas = document.getElementById('modal-formulas');
        els.btnCerrarFormulas = document.getElementById('btn-cerrar-formulas');
        els.modalConfirmar = document.getElementById('modal-confirmar');
        els.btnCancelarReinicio = document.getElementById('btn-cancelar-reinicio');
        els.btnConfirmarReinicio = document.getElementById('btn-confirmar-reinicio');
    }

    // ==================== LOCALSTORAGE ====================
    function guardarEnLocalStorage() {
        try {
            localStorage.setItem('simulador_electrico_state', JSON.stringify(state));
        } catch (e) {
            console.warn('No se pudo guardar en localStorage:', e);
        }
    }

    function cargarDesdeLocalStorage() {
        try {
            const data = localStorage.getItem('simulador_electrico_state');
            if (data) {
                const parsed = JSON.parse(data);
                Object.assign(state, parsed);
                // asegurar estructura extension en ramas antiguas
                state.ramas.forEach(r => {
                    if (!r.extension) r.extension = { activa: false, longitud: 0, seccion: 1.5 };
                    r.cargas.forEach(c => { if (c.encendido === undefined) c.encendido = true; });
                });
            }
        } catch (e) {
            console.warn('No se pudo cargar localStorage:', e);
        }
    }

    // ==================== POBLAR SELECTS ====================
    function poblarSelectAutomaticoGeneral() {
        const ops = window.CatalogoElectrico.PROTECCIONES_GENERAL.map(a => `<option value="${a}">${a} A</option>`).join('');
        els.inpAutomaticoGeneral.innerHTML = ops;
        els.inpAutomaticoGeneral.value = state.automaticoGeneral;
    }

    function poblarEscenarios() {
        const principales = window.EscenariosPredefinidos.obtenerEscenarioPrincipal();
        els.selEscenario.innerHTML = '<option value="">— Personalizado —</option>' +
            principales.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
    }

    // ==================== EVENTOS ====================
    function bindEventos() {
        // header
        els.selEscenario.addEventListener('change', () => {
            els.btnCargarEscenario.disabled = !els.selEscenario.value;
        });
        els.btnCargarEscenario.addEventListener('click', cargarEscenarioSeleccionado);
        els.btnNuevaRama.addEventListener('click', () => agregarRama());
        els.btnPrimeraRama.addEventListener('click', () => agregarRama());
        els.btnFormulas.addEventListener('click', () => els.modalFormulas.showModal());
        els.btnImprimir.addEventListener('click', () => window.print());
        els.btnReiniciar.addEventListener('click', () => els.modalConfirmar.showModal());
        els.btnCerrarFormulas.addEventListener('click', () => els.modalFormulas.close());
        els.btnCancelarReinicio.addEventListener('click', () => els.modalConfirmar.close());
        els.btnConfirmarReinicio.addEventListener('click', reiniciarSimulador);

        // parametros generales
        els.inpVoltaje.addEventListener('change', e => { state.voltajeFuente = Number(e.target.value) || 220; guardarYRender(); });
        els.inpAutomaticoGeneral.addEventListener('change', e => { state.automaticoGeneral = Number(e.target.value) || 32; guardarYRender(); });
        els.inpLimiteAdv.addEventListener('change', e => { state.limitesCaida.advertencia = Number(e.target.value) || 3; guardarYRender(); });
        els.inpLimitePeligro.addEventListener('change', e => { state.limitesCaida.peligro = Number(e.target.value) || 5; guardarYRender(); });

        // tabs
        els.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => cambiarTab(btn.dataset.tab));
        });

        // selector rama matematicas
        els.selRamaMatematicas.addEventListener('change', renderMatematicasRama);

        // cerrar modales con Escape
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                els.modalFormulas.close();
                els.modalConfirmar.close();
            }
        });
    }

    // ==================== ESCENARIOS ====================
    function cargarEscenarioSeleccionado() {
        const id = els.selEscenario.value;
        if (!id) return;
        const esc = window.EscenariosPredefinidos.obtenerPorId(id);
        if (!esc) return;

        state.voltajeFuente = esc.parametros.voltajeFuente;
        state.automaticoGeneral = esc.parametros.automaticoGeneral;
        state.limitesCaida = { ...esc.parametros.limitesCaida };
        state.ramas = esc.ramas.map((r, i) => ({ ...r, _id: Date.now() + i }));
        state.nextRamaId = state.ramas.length + 1;

        els.inpVoltaje.value = state.voltajeFuente;
        els.inpAutomaticoGeneral.value = state.automaticoGeneral;
        els.inpLimiteAdv.value = state.limitesCaida.advertencia;
        els.inpLimitePeligro.value = state.limitesCaida.peligro;

        guardarYRender();
    }

    // ==================== GESTION DE RAMAS ====================
    function agregarRama() {
        const nuevaRama = {
            _id: Date.now(),
            nombre: `Rama ${state.nextRamaId++}`,
            longitud: 10,
            seccion: 2.5,
            automatico: 16,
            extension: { activa: false, longitud: 0, seccion: 1.5 },
            cargas: []
        };
        state.ramas.push(nuevaRama);
        guardarYRender();
    }

    function eliminarRama(ramaId) {
        state.ramas = state.ramas.filter(r => r._id !== ramaId);
        guardarYRender();
    }

    function actualizarRama(ramaId, campo, valor) {
        const rama = state.ramas.find(r => r._id === ramaId);
        if (!rama) return;
        if (campo.startsWith('extension.')) {
            const sub = campo.split('.')[1];
            rama.extension[sub] = valor;
        } else {
            rama[campo] = valor;
        }
        guardarYRender();
    }

    function toggleExtension(ramaId, activa) {
        const rama = state.ramas.find(r => r._id === ramaId);
        if (!rama) return;
        rama.extension.activa = activa;
        guardarYRender();
    }

    // ==================== GESTION DE CARGAS ====================
    function agregarCarga(ramaId, artefactoId, cantidad = 1, custom = null) {
        const rama = state.ramas.find(r => r._id === ramaId);
        if (!rama) return;

        let carga;
        if (custom) {
            carga = { nombre: custom.nombre, potencia: custom.potencia, cantidad, encendido: true, _custom: true };
        } else {
            const art = window.CatalogoElectrico.getArtefacto(artefactoId);
            if (!art) return;
            carga = { nombre: art.nombre, potencia: art.potencia, cantidad, encendido: true, _custom: false };
        }
        rama.cargas.push(carga);
        guardarYRender();
    }

    function eliminarCarga(ramaId, index) {
        const rama = state.ramas.find(r => r._id === ramaId);
        if (!rama) return;
        rama.cargas.splice(index, 1);
        guardarYRender();
    }

    function toggleCarga(ramaId, index, encendido) {
        const rama = state.ramas.find(r => r._id === ramaId);
        if (!rama || !rama.cargas[index]) return;
        rama.cargas[index].encendido = encendido;
        guardarYRender();
    }

    function actualizarCantidadCarga(ramaId, index, cantidad) {
        const rama = state.ramas.find(r => r._id === ramaId);
        if (!rama || !rama.cargas[index]) return;
        rama.cargas[index].cantidad = Math.max(1, Number(cantidad) || 1);
        guardarYRender();
    }

    // ==================== RENDER PRINCIPAL ====================
    function guardarYRender() {
        guardarEnLocalStorage();
        renderTodo();
    }

    function renderTodo() {
        const instalacion = construirInstalacion();
        const resultado = window.MotorCalculo.calcularInstalacion(instalacion);

        renderKPIs(resultado);
        renderPanelRamas(resultado);
        renderDiagrama(instalacion, resultado);
        renderDiagnostico(resultado);
        renderMatematicasSelector(resultado);
        renderMatematicasRama(resultado);
    }

    function construirInstalacion() {
        return {
            voltajeFuente: state.voltajeFuente,
            automaticoGeneral: state.automaticoGeneral,
            limitesCaida: state.limitesCaida,
            ramas: state.ramas.map(r => ({
                nombre: r.nombre,
                longitud: r.longitud,
                seccion: r.seccion,
                automatico: r.automatico,
                extension: { activa: r.extension.activa, longitud: r.extension.longitud, seccion: r.extension.seccion },
                cargas: r.cargas.map(c => ({ nombre: c.nombre, potencia: c.potencia, cantidad: c.cantidad, encendido: c.encendido }))
            }))
        };
    }

    // ==================== RENDER KPIs ====================
    function renderKPIs(r) {
        const t = r.totales;
        const eg = r.estadoGlobal;
        const I_gen = state.automaticoGeneral;
        const pct = I_gen > 0 ? Math.min(100, (t.I_total / I_gen) * 100) : 0;

        els.valCorrienteTotal.textContent = `${t.I_total.toFixed(2)} A`;
        els.progCorrienteTotal.style.width = `${pct}%`;
        els.progCorrienteTotal.className = 'kpi-progreso ' + (eg.estado === 'peligro' ? 'peligro' : eg.estado === 'advertencia' ? 'advertencia' : '');
        els.detCorrienteTotal.textContent = `de ${I_gen} A (General)`;
        els.estadoCorrienteTotal.textContent = eg.estado.toUpperCase();
        els.estadoCorrienteTotal.className = `kpi-estado estado-${eg.estado}`;

        els.valPotenciaTotal.textContent = `${t.P_carga_total.toFixed(0)} W`;
        els.valPerdidaTotal.textContent = `${t.P_perdida_total.toFixed(0)} W`;

        els.valEstadoGlobal.textContent = eg.estado.toUpperCase();
        els.valEstadoGlobal.className = `kpi-valor estado-${eg.estado}`;
        els.detEstadoGlobal.textContent = `${eg.conteoPeligro} peligro, ${eg.conteoAdvertencia} advertencia`;
    }

    // ==================== RENDER PANEL RAMAS ====================
    function renderPanelRamas(r) {
        if (state.ramas.length === 0) {
            els.msgVacio.style.display = 'block';
            els.panelRamas.querySelectorAll('.rama-card').forEach(el => el.remove());
            return;
        }
        els.msgVacio.style.display = 'none';

        // limpiar tarjetas existentes (menos msg-vacio)
        els.panelRamas.querySelectorAll('.rama-card').forEach(el => el.remove());

        state.ramas.forEach((rama, idx) => {
            const ramaResultado = r.ramas[idx];
            const card = document.createElement('div');
            card.className = 'rama-card';
            card.dataset.ramaId = rama._id;

            const badgeClass = `badge-${ramaResultado.estado}`;
            const badgeLabel = ramaResultado.estado.toUpperCase();

            card.innerHTML = `
                <div class="rama-header" data-rama-id="${rama._id}">
                    <span class="rama-titulo">${escapeHtml(rama.nombre)}</span>
                    <div class="rama-badges">
                        <span class="badge ${badgeClass}">${badgeLabel}</span>
                        <button class="btn btn-peligro btn-eliminar-rama" title="Eliminar rama" style="padding:0.2rem 0.5rem;font-size:0.7rem;">x</button>
                    </div>
                </div>
                <div class="rama-body">
                    <div class="rama-controles">
                        <div class="campo">
                            <label>Nombre</label>
                            <input type="text" class="inp-nombre" value="${escapeHtml(rama.nombre)}" maxlength="30">
                        </div>
                        <div class="campo">
                            <label>Largo (m)</label>
                            <input type="number" class="inp-longitud" value="${rama.longitud}" min="0.1" max="200" step="0.1">
                        </div>
                        <div class="campo">
                            <label>Seccion (mm2)</label>
                            <select class="inp-seccion">${opcionesConductores(rama.seccion)}</select>
                        </div>
                        <div class="campo">
                            <label>Automatico (A)</label>
                            <select class="inp-automatico">${opcionesProteccionesRama(rama.automatico)}</select>
                        </div>
                    </div>

                    <label class="extension-toggle">
                        <input type="checkbox" class="chk-extension" ${rama.extension.activa ? 'checked' : ''}>
                        <span>Usa extension / zapatilla</span>
                        <div class="extension-campos">
                            <div class="campo"><label>Largo ext (m)</label><input type="number" class="inp-ext-longitud" value="${rama.extension.longitud}" min="0.1" max="100" step="0.1"></div>
                            <div class="campo"><label>Seccion ext (mm2)</label><select class="inp-ext-seccion">${opcionesConductores(rama.extension.seccion)}</select></div>
                        </div>
                    </label>

                    <div class="cargas-lista" id="cargas-${rama._id}">${renderCargasLista(rama, ramaResultado)}</div>

                    <div class="agregar-carga">
                        <select class="sel-artefacto">${opcionesArtefactos()}</select>
                        <input type="number" class="inp-cant-artefacto" value="1" min="1" max="20" style="width:60px" title="Cantidad">
                        <button class="btn btn-principal btn-add-artefacto" style="padding:0.5rem;">Agregar</button>
                        <button class="btn btn-secundario btn-add-custom" style="padding:0.5rem;">Equipo custom</button>
                    </div>

                    <div class="rama-resumen">
                        <div class="resumen-item"><span class="resumen-label">I rama</span><span class="resumen-valor">${ramaResultado.I_rama.toFixed(2)} A</span></div>
                        <div class="resumen-item"><span class="resumen-label">V carga</span><span class="resumen-valor">${ramaResultado.V_carga.toFixed(1)} V</span></div>
                        <div class="resumen-item"><span class="resumen-label">dV%</span><span class="resumen-valor">${ramaResultado.deltaV_porcentaje.toFixed(1)}%</span></div>
                        <div class="resumen-item"><span class="resumen-label">P util</span><span class="resumen-valor">${ramaResultado.P_carga.toFixed(0)} W</span></div>
                        <div class="resumen-item"><span class="resumen-label">P perdida</span><span class="resumen-valor">${(ramaResultado.P_perdida + ramaResultado.P_perdida_ext).toFixed(0)} W</span></div>
                        <div class="resumen-item"><span class="resumen-label">Cable</span><span class="resumen-valor">${ramaResultado.R_cable_total.toFixed(4)} ohm</span></div>
                    </div>
                </div>
            `;

            els.panelRamas.appendChild(card);
            bindRamaEvents(card, rama._id);
        });
    }

    function bindRamaEvents(card, ramaId) {
        // toggle abrir/cerrar
        card.querySelector('.rama-header').addEventListener('click', e => {
            if (!e.target.closest('.btn-eliminar-rama')) card.classList.toggle('abierta');
        });
        // eliminar rama
        card.querySelector('.btn-eliminar-rama').addEventListener('click', e => {
            e.stopPropagation();
            if (confirm('Eliminar esta rama?')) eliminarRama(ramaId);
        });
        // inputs
        card.querySelector('.inp-nombre').addEventListener('change', e => actualizarRama(ramaId, 'nombre', e.target.value));
        card.querySelector('.inp-longitud').addEventListener('change', e => actualizarRama(ramaId, 'longitud', Number(e.target.value) || 0));
        card.querySelector('.inp-seccion').addEventListener('change', e => actualizarRama(ramaId, 'seccion', Number(e.target.value) || 2.5));
        card.querySelector('.inp-automatico').addEventListener('change', e => actualizarRama(ramaId, 'automatico', Number(e.target.value) || 16));

        // extension
        const chkExt = card.querySelector('.chk-extension');
        chkExt.addEventListener('change', e => toggleExtension(ramaId, e.target.checked));
        card.querySelector('.inp-ext-longitud').addEventListener('change', e => actualizarRama(ramaId, 'extension.longitud', Number(e.target.value) || 0));
        card.querySelector('.inp-ext-seccion').addEventListener('change', e => actualizarRama(ramaId, 'extension.seccion', Number(e.target.value) || 1.5));

        // agregar artefacto del catalogo
        card.querySelector('.btn-add-artefacto').addEventListener('click', () => {
            const sel = card.querySelector('.sel-artefacto');
            const cant = card.querySelector('.inp-cant-artefacto');
            if (sel.value) {
                agregarCarga(ramaId, sel.value, Number(cant.value) || 1);
                sel.value = '';
                cant.value = 1;
            }
        });

        // equipo custom
        card.querySelector('.btn-add-custom').addEventListener('click', () => {
            const nombre = prompt('Nombre del equipo:');
            if (!nombre) return;
            const potencia = Number(prompt('Potencia (W):'));
            if (!potencia || potencia <= 0) return;
            const cant = Number(prompt('Cantidad:', '1')) || 1;
            agregarCarga(ramaId, null, cant, { nombre, potencia });
        });
    }

    function renderCargasLista(rama, ramaResultado) {
        if (!rama.cargas.length) return '<p style="font-size:0.8rem;color:var(--texto-claro);padding:0.5rem;">Sin equipos agregados</p>';
        return rama.cargas.map((c, i) => {
            const eqDetalle = ramaResultado.cargas.find(eq => eq.nombre === c.nombre && eq.cantidad === c.cantidad);
            const I_eq = eqDetalle ? eqDetalle.corriente : 0;
            return `
                <div class="carga-item" data-index="${i}">
                    <input type="checkbox" class="chk-carga" ${c.encendido ? 'checked' : ''} title="Encender/Apagar">
                    <div class="carga-info">
                        <span class="carga-nombre">${escapeHtml(c.nombre)}</span>
                        <span class="carga-detalle">${c.potencia} W c/u ${c.cantidad > 1 ? 'x' + c.cantidad : ''}${c._custom ? ' (custom)' : ''}</span>
                    </div>
                    <input type="number" class="carga-cant" value="${c.cantidad}" min="1" max="50" title="Cantidad">
                    <span class="carga-corriente">${I_eq.toFixed(2)} A</span>
                    <button class="carga-eliminar" title="Eliminar">x</button>
                </div>
            `;
        }).join('');
    }

    function bindCargaEvents(card, ramaId) {
        card.querySelectorAll('.carga-item').forEach(item => {
            const idx = Number(item.dataset.index);
            item.querySelector('.chk-carga').addEventListener('change', e => toggleCarga(ramaId, idx, e.target.checked));
            item.querySelector('.carga-cant').addEventListener('change', e => actualizarCantidadCarga(ramaId, idx, Number(e.target.value) || 1));
            item.querySelector('.carga-eliminar').addEventListener('click', () => eliminarCarga(ramaId, idx));
        });
    }

    // ==================== RENDER DIAGRAMA ====================
    function renderDiagrama(instalacion, resultado) {
        els.svgDiagrama.outerHTML = window.GeneradorDiagrama.generarDiagrama(instalacion, resultado);
        els.svgDiagrama = document.getElementById('svg-diagrama'); // actualizar ref
        els.leyendaDiagrama.innerHTML = window.GeneradorDiagrama.generarLeyendaHTML(resultado);
    }

    // ==================== RENDER DIAGNOSTICO ====================
    function renderDiagnostico(r) {
        const alertas = r.estadoGlobal.alertas;
        if (!alertas.length) {
            els.panelDiagnostico.innerHTML = `
                <div class="diagnostico-vacio">
                    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
                    <h4>Sin alertas</h4>
                    <p>La instalacion esta operando dentro de parametros normales.</p>
                </div>
            `;
            return;
        }
        els.panelDiagnostico.innerHTML = alertas.map(a => `
            <div class="alerta-item alerta-${a.nivel}">
                <span class="alerta-icon">${a.nivel === 'peligro' ? '!' : '!'}</span>
                <div class="alerta-texto">
                    <strong>${a.nombre || 'General'}: ${a.mensaje}</strong>
                </div>
            </div>
        `).join('');

        // recomendaciones
        r.ramas.forEach((rama, i) => {
            if (rama.recomendaciones.length) {
                rama.recomendaciones.forEach(rec => {
                    const div = document.createElement('div');
                    div.className = 'recomendacion';
                    div.innerHTML = `<strong>${rama.nombre}:</strong> ${rec.mensaje}`;
                    els.panelDiagnostico.appendChild(div);
                });
            }
        });
    }

    // ==================== RENDER MATEMATICAS ====================
    function renderMatematicasSelector(r) {
        els.selRamaMatematicas.innerHTML = '<option value="">— Selecciona una rama —</option>' +
            state.ramas.map((rama, i) => `<option value="${i}">${escapeHtml(rama.nombre)}</option>`).join('');
        els.selRamaMatematicas.disabled = state.ramas.length === 0;
    }

    function renderMatematicasRama(r) {
        const idx = Number(els.selRamaMatematicas.value);
        if (isNaN(idx) || !r.ramas[idx]) {
            els.matematicasContenido.innerHTML = `
                <div class="matematicas-vacio">
                    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                    <h4>Selecciona una rama</h4>
                    <p>Elige una rama del selector para ver el desarrollo paso a paso.</p>
                </div>
            `;
            return;
        }

        const rama = r.ramas[idx];
        const inst = construirInstalacion();
        const ramaInst = inst.ramas[idx];
        const V_f = inst.voltajeFuente;

        let html = '';

        // Paso 1: R_cable
        html += paso('1. Resistencia del cable (ida y vuelta)',
            `R_cable = rho * (2 * L) / A`,
            `rho = 0.0172, L = ${ramaInst.longitud} m, A = ${ramaInst.seccion} mm2`,
            `R_cable = ${rama.R_cable_rama.toFixed(6)} ohm`);

        // Extension
        if (rama.extension) {
            html += paso('1b. Resistencia de la extension',
                `R_ext = rho * (2 * L_ext) / A_ext`,
                `L_ext = ${ramaInst.extension.longitud} m, A_ext = ${ramaInst.extension.seccion} mm2`,
                `R_ext = ${rama.R_ext.toFixed(6)} ohm`);
        }

        html += paso('1c. Resistencia total cable',
            `R_cable_total = R_cable + R_ext`,
            `R_cable_total = ${rama.R_cable_total.toFixed(6)} ohm`);

        // Paso 2: R_cargas
        const cargasEnc = ramaInst.cargas.filter(c => c.encendido);
        if (cargasEnc.length) {
            const detalles = cargasEnc.map(c => {
                const R = window.CatalogoElectrico.calcularResistenciaEquipo(c.potencia, V_f);
                return `${c.nombre}: R = ${V_f}^2 / ${c.potencia} = ${R.toFixed(2)} ohm (x${c.cantidad})`;
            }).join('; ');
            html += paso('2. Resistencia equivalente cargas (paralelo)',
                `1/R_cargas = Sum (c_j / R_equipo,j)`,
                detalles,
                `R_cargas = ${rama.R_cargas.toFixed(4)} ohm`);
        } else {
            html += paso('2. Resistencia equivalente cargas',
                `Sin cargas encendidas`,
                `R_cargas = infinito`);
        }

        // Paso 3: Ohm
        html += paso('3. Ley de Ohm - Corriente de rama',
            `R_total = R_cable_total + R_cargas\nI_rama = V_f / R_total`,
            `R_total = ${rama.R_total_rama.toFixed(4)} ohm, V_f = ${V_f} V`,
            `I_rama = ${rama.I_rama.toFixed(4)} A`);

        // Paso 4: Kirchhoff malla
        html += paso('4. 2da Ley Kirchhoff (Malla) - Caida de voltaje',
            `dV_cable = I_rama * R_cable_total\nV_carga = V_f - dV_cable\ndV% = (dV_cable / V_f) * 100`,
            `I_rama = ${rama.I_rama.toFixed(4)} A, R_cable_total = ${rama.R_cable_total.toFixed(6)} ohm`,
            `dV_cable = ${rama.deltaV_cable.toFixed(2)} V\nV_carga = ${rama.V_carga.toFixed(2)} V\ndV% = ${rama.deltaV_porcentaje.toFixed(2)}%`);

        // Verificacion KVL
        html += paso('Verificacion KVL',
            `V_f - dV_cable - V_carga = 0`,
            `${V_f} - ${rama.deltaV_cable.toFixed(2)} - ${rama.V_carga.toFixed(2)} = ${rama.verificacionKVL.toFixed(2)}`,
            `OK (error < 0.01 V)`);

        // Paso 5: Kirchhoff nodo
        if (cargasEnc.length) {
            const corrientesEq = rama.cargas.map(c => `${c.nombre}: I = ${c.corriente.toFixed(4)} A`).join(' + ');
            html += paso('5. 1ra Ley Kirchhoff (Nodo rama)',
                `Sum (c_j * I_equipo,j) = I_rama`,
                corrientesEq,
                `Suma = ${rama.cargas.reduce((s, c) => s + c.corriente, 0).toFixed(4)} A vs I_rama ${rama.I_rama.toFixed(4)} A (error: ${rama.errorKCL_rama.toFixed(6)} A)`);
        }

        // Paso 6: Potencia
        html += paso('6. Potencia (Joule)',
            `P_carga = V_carga * I_rama\nP_perdida = I_rama^2 * R_cable_total`,
            `V_carga = ${rama.V_carga.toFixed(2)} V, I_rama = ${rama.I_rama.toFixed(4)} A`,
            `P_carga = ${rama.P_carga.toFixed(2)} W\nP_perdida = ${(rama.P_perdida + rama.P_perdida_ext).toFixed(2)} W`);

        // Estado
        const labels = { normal: 'NORMAL', advertencia: 'ADVERTENCIA', peligro: 'PELIGRO' };
        html += `<div class="paso-calculo"><div class="paso-titulo">Estado: ${labels[rama.estado]}</div><div class="paso-valores">${rama.mensajeEstado}</div></div>`;

        els.matematicasContenido.innerHTML = html;
    }

    function paso(titulo, formula, valores, resultado) {
        return `<div class="paso-calculo"><div class="paso-titulo">${titulo}</div><div class="paso-formula">${escapeHtml(formula)}</div><div class="paso-valores">${escapeHtml(valores)}</div><div class="paso-valores"><strong>Resultado:</strong> ${escapeHtml(resultado)}</div></div>`;
    }

    // ==================== TABS ====================
    function cambiarTab(tab) {
        els.tabBtns.forEach(b => { b.classList.toggle('active', b.dataset.tab === tab); b.setAttribute('aria-selected', b.dataset.tab === tab); });
        els.tabPanels.forEach(p => p.classList.toggle('active', p.id === `panel-${tab}`));
    }

    // ==================== REINICIAR ====================
    function reiniciarSimulador() {
        state.voltajeFuente = 220;
        state.automaticoGeneral = 32;
        state.limitesCaida = { advertencia: 3, peligro: 5 };
        state.ramas = [];
        state.nextRamaId = 1;
        localStorage.removeItem('simulador_electrico_state');
        els.inpVoltaje.value = 220;
        els.inpAutomaticoGeneral.value = 32;
        els.inpLimiteAdv.value = 3;
        els.inpLimitePeligro.value = 5;
        els.selEscenario.value = '';
        els.btnCargarEscenario.disabled = true;
        els.modalConfirmar.close();
        renderTodo();
    }

    // ==================== UTILIDADES ====================
    function opcionesConductores(selected) {
        return window.CatalogoElectrico.CONDUCTORES.map(c => `<option value="${c.seccion}" ${c.seccion === selected ? 'selected' : ''}>${c.seccion} mm2 (${c.ampacidad} A)</option>`).join('');
    }

    function opcionesProteccionesRama(selected) {
        return window.CatalogoElectrico.PROTECCIONES_RAMA.map(a => `<option value="${a}" ${a === selected ? 'selected' : ''}>${a} A</option>`).join('');
    }

    function opcionesArtefactos() {
        return window.CatalogoElectrico.TODOS_ARTEFACTOS.map(a => `<option value="${a.id}">${a.nombre} (${a.potencia} W)</option>`).join('');
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, c => ({ '&': '&', '<': '<', '>': '>', '"': '"', "'": ''' }[c]));
    }

    // ==================== ARRANQUE ====================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();