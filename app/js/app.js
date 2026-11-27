// app.js - controlador principal: estado, eventos, render, localStorage
// conecta catalog, physics, diagram, presets

(function() {
    'use strict';

    const CLAVE_STORAGE = 'simulador_electrico_state';
    const LIMITES = {
        voltaje: [110, 380],
        longitud: [0.1, 200],
        longitudExt: [0.1, 100],
        cantidad: [1, 50],
        potencia: [1, 10000],
        caida: [0.5, 15]
    };

    // ==================== ESTADO GLOBAL ====================
    const state = {
        voltajeFuente: 220,
        automaticoGeneral: 32,
        limitesCaida: { advertencia: 3, peligro: 5 },
        ramas: [],
        nextRamaId: 1
    };

    // tarjetas abiertas (solo en memoria, no se guarda)
    const ramasAbiertas = new Set();

    // elementos DOM principales
    const els = {};

    // zoom del diagrama: k = aumento, (x, y) = esquina superior izquierda visible, en unidades del dibujo
    const ZOOM_MIN = 1, ZOOM_MAX = 6, PASO_ZOOM = 1.5;
    const zoom = { k: 1, x: 0, y: 0 };

    // rama que recibe el equipo personalizado y rama que se esta arrastrando
    let ramaEquipoId = null;
    let ramaArrastradaId = null;

    const CLAVE_TEMA = 'simulador_tema';
    const TEMAS = ['auto', 'claro', 'oscuro'];

    // ==================== INICIALIZACION ====================
    function init() {
        cacheDOM();
        cargarDesdeLocalStorage();
        if (state.ramas.length === 1) ramasAbiertas.add(state.ramas[0]._id);
        poblarSelectAutomaticoGeneral();
        poblarEscenarios();
        sincronizarInputsGenerales();
        bindEventos();
        renderTodo();
    }

    function cacheDOM() {
        // header
        els.selEscenario = document.getElementById('sel-escenario');
        els.btnCargarEscenario = document.getElementById('btn-cargar-escenario');
        els.btnNuevaRama = document.getElementById('btn-nueva-rama');
        els.btnFormulas = document.getElementById('btn-formulas');
        els.btnExportar = document.getElementById('btn-exportar');
        els.btnImportar = document.getElementById('btn-importar');
        els.inpImportar = document.getElementById('inp-importar');
        els.btnImprimir = document.getElementById('btn-imprimir');
        els.btnReiniciar = document.getElementById('btn-reiniciar');
        els.btnPrimeraRama = document.getElementById('btn-primera-rama');
        els.avisoError = document.getElementById('aviso-error');

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
        els.contenedorSvg = document.getElementById('contenedor-svg');
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

        // formulario de equipo personalizado
        els.modalEquipo = document.getElementById('modal-equipo');
        els.formEquipo = document.getElementById('form-equipo');
        els.eqNombre = document.getElementById('eq-nombre');
        els.eqPotencia = document.getElementById('eq-potencia');
        els.eqCantidad = document.getElementById('eq-cantidad');
        els.eqEstimacion = document.getElementById('eq-estimacion');
        els.equipoRama = document.getElementById('equipo-rama');
        els.btnCancelarEquipo = document.getElementById('btn-cancelar-equipo');

        // zoom y tema
        els.btnZoomMas = document.getElementById('btn-zoom-mas');
        els.btnZoomMenos = document.getElementById('btn-zoom-menos');
        els.btnZoomReset = document.getElementById('btn-zoom-reset');
        els.zoomNivel = document.getElementById('zoom-nivel');
        els.btnTema = document.getElementById('btn-tema');
    }

    // ==================== VALIDACION ====================
    function acotar(valor, [min, max], porDefecto) {
        if (valor === null || valor === undefined || String(valor).trim() === '') return porDefecto;
        const n = Number(valor);
        if (!isFinite(n)) return porDefecto;
        return Math.min(max, Math.max(min, n));
    }

    function seccionValida(valor, porDefecto) {
        const n = Number(valor);
        return window.CatalogoElectrico.getConductor(n) ? n : porDefecto;
    }

    function proteccionValida(valor, lista, porDefecto) {
        const n = Number(valor);
        return lista.includes(n) ? n : porDefecto;
    }

    // normaliza una rama (para datos cargados desde localStorage o desde un JSON importado)
    function normalizarRama(r, i) {
        const CAT = window.CatalogoElectrico;
        const ext = r.extension || {};
        return {
            _id: r._id || Date.now() + i,
            nombre: String(r.nombre || `Rama ${i + 1}`).slice(0, 30),
            longitud: acotar(r.longitud, LIMITES.longitud, 10),
            seccion: seccionValida(r.seccion, 2.5),
            automatico: proteccionValida(r.automatico, CAT.PROTECCIONES_RAMA, 16),
            extension: {
                activa: !!ext.activa,
                longitud: acotar(ext.longitud || 5, LIMITES.longitudExt, 5),
                seccion: seccionValida(ext.seccion, 1.5)
            },
            cargas: (Array.isArray(r.cargas) ? r.cargas : []).map(c => ({
                nombre: String(c.nombre || 'Equipo').slice(0, 40),
                potencia: acotar(c.potencia, LIMITES.potencia, 100),
                cantidad: Math.round(acotar(c.cantidad, LIMITES.cantidad, 1)),
                encendido: c.encendido !== false,
                _custom: !!c._custom
            }))
        };
    }

    function aplicarDatos(datos) {
        const CAT = window.CatalogoElectrico;
        state.voltajeFuente = acotar(datos.voltajeFuente, LIMITES.voltaje, 220);
        state.automaticoGeneral = proteccionValida(datos.automaticoGeneral, CAT.PROTECCIONES_GENERAL, 32);
        const lim = datos.limitesCaida || {};
        const adv = acotar(lim.advertencia, LIMITES.caida, 3);
        state.limitesCaida = { advertencia: adv, peligro: Math.max(adv, acotar(lim.peligro, LIMITES.caida, 5)) };
        state.ramas = (Array.isArray(datos.ramas) ? datos.ramas : []).map(normalizarRama);
        state.nextRamaId = state.ramas.length + 1;
        ramasAbiertas.clear();
        zoom.k = 1; zoom.x = 0; zoom.y = 0;
    }

    // ==================== LOCALSTORAGE ====================
    function guardarEnLocalStorage() {
        try {
            localStorage.setItem(CLAVE_STORAGE, JSON.stringify(state));
        } catch (e) {
            console.warn('No se pudo guardar en localStorage:', e);
        }
    }

    function cargarDesdeLocalStorage() {
        try {
            const data = localStorage.getItem(CLAVE_STORAGE);
            if (data) aplicarDatos(JSON.parse(data));
        } catch (e) {
            console.warn('No se pudo cargar localStorage:', e);
        }
    }

    // ==================== POBLAR SELECTS ====================
    function poblarSelectAutomaticoGeneral() {
        els.inpAutomaticoGeneral.innerHTML = window.CatalogoElectrico.PROTECCIONES_GENERAL.map(a => `<option value="${a}">${a} A</option>`).join('');
    }

    function poblarEscenarios() {
        const todos = window.EscenariosPredefinidos.obtenerTodos();
        els.selEscenario.innerHTML = '<option value="">— Personalizado —</option>' +
            todos.map(e => `<option value="${e.id}" title="${escapeHtml(e.descripcion)}">${escapeHtml(e.nombre)}</option>`).join('');
    }

    function sincronizarInputsGenerales() {
        els.inpVoltaje.value = state.voltajeFuente;
        els.inpAutomaticoGeneral.value = state.automaticoGeneral;
        els.inpLimiteAdv.value = state.limitesCaida.advertencia;
        els.inpLimitePeligro.value = state.limitesCaida.peligro;
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
        els.btnExportar.addEventListener('click', exportarJSON);
        els.btnImportar.addEventListener('click', () => els.inpImportar.click());
        els.inpImportar.addEventListener('change', importarJSON);
        els.btnImprimir.addEventListener('click', () => window.print());
        els.btnReiniciar.addEventListener('click', () => els.modalConfirmar.showModal());
        els.btnCerrarFormulas.addEventListener('click', () => els.modalFormulas.close());
        els.btnCancelarReinicio.addEventListener('click', () => els.modalConfirmar.close());
        els.btnConfirmarReinicio.addEventListener('click', reiniciarSimulador);

        // parametros generales
        els.inpVoltaje.addEventListener('change', e => {
            state.voltajeFuente = acotar(e.target.value, LIMITES.voltaje, 220);
            e.target.value = state.voltajeFuente;
            guardarYRender();
        });
        els.inpAutomaticoGeneral.addEventListener('change', e => { state.automaticoGeneral = Number(e.target.value) || 32; guardarYRender(); });
        els.inpLimiteAdv.addEventListener('change', e => {
            state.limitesCaida.advertencia = acotar(e.target.value, LIMITES.caida, 3);
            if (state.limitesCaida.peligro < state.limitesCaida.advertencia) state.limitesCaida.peligro = state.limitesCaida.advertencia;
            sincronizarInputsGenerales();
            guardarYRender();
        });
        els.inpLimitePeligro.addEventListener('change', e => {
            state.limitesCaida.peligro = Math.max(state.limitesCaida.advertencia, acotar(e.target.value, LIMITES.caida, 5));
            sincronizarInputsGenerales();
            guardarYRender();
        });

        // tabs
        els.tabBtns.forEach(btn => btn.addEventListener('click', () => cambiarTab(btn.dataset.tab)));

        // selector rama matematicas
        els.selRamaMatematicas.addEventListener('change', () => renderTodo());

        // formulario de equipo personalizado
        els.formEquipo.addEventListener('submit', guardarEquipoPersonalizado);
        els.btnCancelarEquipo.addEventListener('click', () => els.modalEquipo.close());
        els.eqPotencia.addEventListener('input', actualizarEstimacionEquipo);
        els.eqCantidad.addEventListener('input', actualizarEstimacionEquipo);
        els.eqNombre.addEventListener('input', () => els.eqNombre.setCustomValidity(''));

        bindArrastreRamas();
        bindZoom();

        // tema
        actualizarBotonTema();
        els.btnTema.addEventListener('click', cambiarTema);
    }

    // ==================== ESCENARIOS ====================
    function cargarEscenarioSeleccionado() {
        const id = els.selEscenario.value;
        if (!id) return;
        const esc = window.EscenariosPredefinidos.obtenerPorId(id);
        if (!esc) return;

        // copia profunda: editar el escenario cargado no modifica el original
        aplicarDatos(JSON.parse(JSON.stringify({ ...esc.parametros, ramas: esc.ramas })));
        state.ramas.forEach((r, i) => { r._id = Date.now() + i; });
        if (state.ramas.length === 1) ramasAbiertas.add(state.ramas[0]._id);
        els.selRamaMatematicas.value = '';
        sincronizarInputsGenerales();
        guardarYRender();
    }

    // ==================== EXPORTAR / IMPORTAR ====================
    function exportarJSON() {
        const datos = {
            formato: 'simulador-sobrecargas',
            version: 1,
            exportado: new Date().toISOString(),
            voltajeFuente: state.voltajeFuente,
            automaticoGeneral: state.automaticoGeneral,
            limitesCaida: state.limitesCaida,
            ramas: state.ramas.map(({ _id, ...resto }) => resto)
        };
        const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `circuito_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function importarJSON(e) {
        const archivo = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!archivo) return;
        const lector = new FileReader();
        lector.onload = () => {
            try {
                const datos = JSON.parse(lector.result);
                if (!datos || !Array.isArray(datos.ramas)) throw new Error('El archivo no tiene una lista de ramas.');
                aplicarDatos(datos);
                els.selEscenario.value = '';
                els.btnCargarEscenario.disabled = true;
                sincronizarInputsGenerales();
                guardarYRender();
            } catch (err) {
                alert(`No se pudo importar el archivo: ${err.message}`);
            }
        };
        lector.readAsText(archivo);
    }

    // ==================== GESTION DE RAMAS ====================
    function buscarRama(ramaId) {
        return state.ramas.find(r => r._id === ramaId);
    }

    function agregarRama() {
        const nuevaRama = {
            _id: Date.now(),
            nombre: `Rama ${state.nextRamaId++}`,
            longitud: 10,
            seccion: 2.5,
            automatico: 16,
            extension: { activa: false, longitud: 5, seccion: 1.5 },
            cargas: []
        };
        state.ramas.push(nuevaRama);
        ramasAbiertas.add(nuevaRama._id);
        guardarYRender();
    }

    function duplicarRama(ramaId) {
        const idx = state.ramas.findIndex(r => r._id === ramaId);
        if (idx < 0) return;
        const copia = JSON.parse(JSON.stringify(state.ramas[idx]));
        copia._id = Date.now();
        copia.nombre = `${copia.nombre.slice(0, 22)} (copia)`;
        state.ramas.splice(idx + 1, 0, copia);
        ramasAbiertas.add(copia._id);
        guardarYRender();
    }

    function eliminarRama(ramaId) {
        state.ramas = state.ramas.filter(r => r._id !== ramaId);
        ramasAbiertas.delete(ramaId);
        guardarYRender();
    }

    // mueve la rama a la posicion "destino" (indice final en la lista)
    function moverRama(ramaId, destino) {
        const desde = state.ramas.findIndex(r => r._id === ramaId);
        if (desde < 0) return false;
        destino = Math.max(0, Math.min(state.ramas.length - 1, destino));
        if (destino === desde) return false;

        // el panel matematico sigue mostrando la misma rama aunque cambie de posicion
        const sel = els.selRamaMatematicas.value;
        const idElegido = sel !== '' && sel !== 'todo' && state.ramas[Number(sel)] ? state.ramas[Number(sel)]._id : null;

        const [rama] = state.ramas.splice(desde, 1);
        state.ramas.splice(destino, 0, rama);

        if (idElegido !== null) els.selRamaMatematicas.value = String(state.ramas.findIndex(r => r._id === idElegido));
        guardarYRender();
        return true;
    }

    function moverRamaUnPaso(ramaId, delta, selectorBoton) {
        const idx = state.ramas.findIndex(r => r._id === ramaId);
        if (!moverRama(ramaId, idx + delta)) return;
        // devolver el foco al mismo boton (uso con teclado)
        const card = els.panelRamas.querySelector(`.rama-card[data-rama-id="${ramaId}"]`);
        const boton = card && card.querySelector(selectorBoton);
        if (boton && !boton.disabled) boton.focus();
        else if (card) card.querySelector(selectorBoton === '.btn-subir' ? '.btn-bajar' : '.btn-subir').focus();
    }

    // arrastrar y soltar: solo se puede arrastrar desde el asa (asi los campos de texto siguen funcionando)
    function bindArrastreRamas() {
        const panel = els.panelRamas;
        const limpiarMarcas = () => panel.querySelectorAll('.soltar-arriba, .soltar-abajo').forEach(c => c.classList.remove('soltar-arriba', 'soltar-abajo'));
        const tarjetaDe = e => e.target.closest && e.target.closest('.rama-card');

        panel.addEventListener('mousedown', e => {
            const asa = e.target.closest('.rama-arrastre');
            if (asa) asa.closest('.rama-card').draggable = true;
        });
        document.addEventListener('mouseup', () => {
            if (ramaArrastradaId === null) panel.querySelectorAll('.rama-card[draggable="true"]').forEach(c => { c.draggable = false; });
        });

        panel.addEventListener('dragstart', e => {
            const card = tarjetaDe(e);
            if (!card || !card.draggable) return;
            ramaArrastradaId = Number(card.dataset.ramaId);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', card.dataset.ramaId);
            requestAnimationFrame(() => card.classList.add('arrastrando'));
        });

        panel.addEventListener('dragover', e => {
            if (ramaArrastradaId === null) return;
            const card = tarjetaDe(e);
            if (!card) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const caja = card.getBoundingClientRect();
            const arriba = e.clientY < caja.top + caja.height / 2;
            limpiarMarcas();
            if (Number(card.dataset.ramaId) !== ramaArrastradaId) card.classList.add(arriba ? 'soltar-arriba' : 'soltar-abajo');
        });

        panel.addEventListener('drop', e => {
            if (ramaArrastradaId === null) return;
            e.preventDefault();
            const card = tarjetaDe(e);
            const id = ramaArrastradaId;
            if (card && Number(card.dataset.ramaId) !== id) {
                const caja = card.getBoundingClientRect();
                const arriba = e.clientY < caja.top + caja.height / 2;
                const desde = state.ramas.findIndex(r => r._id === id);
                let destino = state.ramas.findIndex(r => r._id === Number(card.dataset.ramaId)) + (arriba ? 0 : 1);
                if (desde < destino) destino -= 1;
                ramaArrastradaId = null;
                moverRama(id, destino);
            }
        });

        panel.addEventListener('dragend', () => {
            ramaArrastradaId = null;
            limpiarMarcas();
            panel.querySelectorAll('.rama-card').forEach(c => { c.classList.remove('arrastrando'); c.draggable = false; });
        });
    }

    function actualizarRama(ramaId, campo, valor) {
        const rama = buscarRama(ramaId);
        if (!rama) return;
        if (campo.startsWith('extension.')) {
            rama.extension[campo.split('.')[1]] = valor;
        } else {
            rama[campo] = valor;
        }
        guardarYRender();
    }

    // ==================== GESTION DE CARGAS ====================
    function agregarCarga(ramaId, artefactoId, cantidad = 1, custom = null) {
        const rama = buscarRama(ramaId);
        if (!rama) return;
        const cant = Math.round(acotar(cantidad, LIMITES.cantidad, 1));

        let carga;
        if (custom) {
            carga = { nombre: custom.nombre.slice(0, 40), potencia: acotar(custom.potencia, LIMITES.potencia, 100), cantidad: cant, encendido: true, _custom: true };
        } else {
            const art = window.CatalogoElectrico.getArtefacto(artefactoId);
            if (!art) return;
            carga = { nombre: art.nombre, potencia: art.potencia, cantidad: cant, encendido: true, _custom: false };
        }
        rama.cargas.push(carga);
        guardarYRender();
    }

    function eliminarCarga(ramaId, index) {
        const rama = buscarRama(ramaId);
        if (!rama) return;
        rama.cargas.splice(index, 1);
        guardarYRender();
    }

    function toggleCarga(ramaId, index, encendido) {
        const rama = buscarRama(ramaId);
        if (!rama || !rama.cargas[index]) return;
        rama.cargas[index].encendido = encendido;
        guardarYRender();
    }

    function actualizarCantidadCarga(ramaId, index, cantidad) {
        const rama = buscarRama(ramaId);
        if (!rama || !rama.cargas[index]) return;
        rama.cargas[index].cantidad = Math.round(acotar(cantidad, LIMITES.cantidad, 1));
        guardarYRender();
    }

    // ==================== RENDER PRINCIPAL ====================
    function guardarYRender() {
        guardarEnLocalStorage();
        renderTodo();
    }

    function renderTodo() {
        try {
            const instalacion = construirInstalacion();
            const resultado = window.MotorCalculo.calcularInstalacion(instalacion);

            renderKPIs(resultado);
            renderPanelRamas(resultado);
            renderDiagrama(instalacion, resultado);
            renderDiagnostico(resultado);
            renderMatematicasSelector();
            renderMatematicas(resultado, instalacion);
            els.avisoError.hidden = true;
        } catch (e) {
            console.error(e);
            els.avisoError.textContent = `Ocurrió un error al calcular: ${e.message}. Revisa los datos ingresados o usa "Reiniciar".`;
            els.avisoError.hidden = false;
        }
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
    const ETIQUETAS = { normal: 'NORMAL', advertencia: 'ADVERTENCIA', peligro: 'PELIGRO' };

    function renderKPIs(r) {
        const t = r.totales;
        const eg = r.estadoGlobal;
        const I_gen = state.automaticoGeneral;
        const pct = I_gen > 0 ? Math.min(100, (t.I_total / I_gen) * 100) : 0;

        // tarjeta de corriente: solo el automatico general
        els.valCorrienteTotal.textContent = `${t.I_total.toFixed(2)} A`;
        els.progCorrienteTotal.style.width = `${pct}%`;
        els.progCorrienteTotal.className = 'kpi-progreso ' + (eg.estadoTablero === 'normal' ? '' : eg.estadoTablero);
        els.detCorrienteTotal.textContent = `de ${I_gen} A del automático general (${((t.I_total / I_gen) * 100).toFixed(0)} %)`;
        els.estadoCorrienteTotal.textContent = ETIQUETAS[eg.estadoTablero];
        els.estadoCorrienteTotal.className = `kpi-estado estado-${eg.estadoTablero}`;

        els.valPotenciaTotal.textContent = `${t.P_carga_total.toFixed(0)} W`;
        els.valPerdidaTotal.textContent = `${t.P_perdida_total.toFixed(0)} W`;

        // tarjeta de estado: toda la instalacion (tablero + ramas)
        els.valEstadoGlobal.textContent = ETIQUETAS[eg.estado];
        els.valEstadoGlobal.className = `kpi-valor estado-${eg.estado}`;
        const n = state.ramas.length;
        els.detEstadoGlobal.textContent = n === 0
            ? 'Sin ramas configuradas'
            : `${eg.ramasPeligro} de ${n} rama(s) en peligro, ${eg.ramasAdvertencia} en advertencia`;
    }

    // ==================== RENDER PANEL RAMAS ====================
    function renderPanelRamas(r) {
        els.panelRamas.querySelectorAll('.rama-card').forEach(el => el.remove());
        if (state.ramas.length === 0) {
            els.msgVacio.style.display = 'block';
            return;
        }
        els.msgVacio.style.display = 'none';

        state.ramas.forEach((rama, idx) => {
            const res = r.ramas[idx];
            const card = document.createElement('div');
            card.className = 'rama-card' + (ramasAbiertas.has(rama._id) ? ' abierta' : '');
            card.dataset.ramaId = rama._id;

            const textoExtension = res.I_ext !== null && res.I_ext !== undefined ? ` · ampacidad ${res.I_ext} A` : '';

            card.innerHTML = `
                <div class="rama-header" title="Abrir o cerrar la rama">
                    <div class="rama-izq">
                        <span class="rama-arrastre" title="Arrastrar para cambiar el orden" aria-hidden="true">⋮⋮</span>
                        <span class="rama-titulo"><span class="rama-flecha" aria-hidden="true">▸</span> ${escapeHtml(rama.nombre)}</span>
                    </div>
                    <div class="rama-badges">
                        <span class="rama-mini">${res.I_rama.toFixed(1)} A</span>
                        <span class="badge badge-${res.estado}">${ETIQUETAS[res.estado]}</span>
                        <button class="btn btn-secundario btn-mini btn-mover btn-subir" title="Subir rama" aria-label="Subir rama" ${idx === 0 ? 'disabled' : ''}>↑</button>
                        <button class="btn btn-secundario btn-mini btn-mover btn-bajar" title="Bajar rama" aria-label="Bajar rama" ${idx === state.ramas.length - 1 ? 'disabled' : ''}>↓</button>
                        <button class="btn btn-secundario btn-mini btn-duplicar-rama" title="Duplicar rama">Duplicar</button>
                        <button class="btn btn-peligro btn-mini btn-eliminar-rama" title="Eliminar rama">x</button>
                    </div>
                </div>
                <div class="rama-body">
                    <div class="rama-controles">
                        <div class="campo">
                            <label>Nombre</label>
                            <input type="text" class="inp-nombre" value="${escapeHtml(rama.nombre)}" maxlength="30">
                        </div>
                        <div class="campo">
                            <label>Largo del cable (m)</label>
                            <input type="number" class="inp-longitud" value="${rama.longitud}" min="${LIMITES.longitud[0]}" max="${LIMITES.longitud[1]}" step="0.1">
                        </div>
                        <div class="campo">
                            <label>Sección (mm²)</label>
                            <select class="inp-seccion">${opcionesConductores(rama.seccion)}</select>
                        </div>
                        <div class="campo">
                            <label>Automático (A)</label>
                            <select class="inp-automatico">${opcionesProteccionesRama(rama.automatico)}</select>
                        </div>
                    </div>

                    <div class="extension-toggle">
                        <label class="extension-check">
                            <input type="checkbox" class="chk-extension" ${rama.extension.activa ? 'checked' : ''}>
                            <span>Usa extensión / zapatilla${textoExtension}</span>
                        </label>
                        <div class="extension-campos" ${rama.extension.activa ? '' : 'hidden'}>
                            <div class="campo"><label>Largo extensión (m)</label><input type="number" class="inp-ext-longitud" value="${rama.extension.longitud}" min="${LIMITES.longitudExt[0]}" max="${LIMITES.longitudExt[1]}" step="0.1"></div>
                            <div class="campo"><label>Sección extensión (mm²)</label><select class="inp-ext-seccion">${opcionesConductores(rama.extension.seccion)}</select></div>
                        </div>
                    </div>

                    <div class="cargas-lista">${renderCargasLista(rama, res)}</div>

                    <div class="agregar-carga">
                        <select class="sel-artefacto" title="Equipo del catálogo">${opcionesArtefactos()}</select>
                        <input type="number" class="inp-cant-artefacto" value="1" min="1" max="${LIMITES.cantidad[1]}" title="Cantidad">
                        <button class="btn btn-principal btn-add-artefacto">Agregar</button>
                        <button class="btn btn-secundario btn-add-custom">Equipo personalizado</button>
                    </div>

                    <div class="rama-resumen">
                        <div class="resumen-item"><span class="resumen-label">I rama</span><span class="resumen-valor">${res.I_rama.toFixed(2)} A</span></div>
                        <div class="resumen-item"><span class="resumen-label">V en la carga</span><span class="resumen-valor">${res.V_carga.toFixed(1)} V</span></div>
                        <div class="resumen-item"><span class="resumen-label">Caída ΔV</span><span class="resumen-valor">${res.deltaV_porcentaje.toFixed(2)} %</span></div>
                        <div class="resumen-item"><span class="resumen-label">P útil</span><span class="resumen-valor">${res.P_carga.toFixed(0)} W</span></div>
                        <div class="resumen-item"><span class="resumen-label">P pérdida (calor)</span><span class="resumen-valor">${(res.P_perdida + res.P_perdida_ext).toFixed(1)} W</span></div>
                        <div class="resumen-item"><span class="resumen-label">R cable</span><span class="resumen-valor">${res.R_cable_total.toFixed(4)} Ω</span></div>
                    </div>
                    ${res.problemas.length ? `<ul class="rama-problemas">${res.problemas.map(p => `<li class="problema-${p.nivel}">${escapeHtml(p.mensaje)}</li>`).join('')}</ul>` : ''}
                </div>
            `;

            els.panelRamas.appendChild(card);
            bindRamaEvents(card, rama._id);
            bindCargaEvents(card, rama._id);
        });
    }

    function bindRamaEvents(card, ramaId) {
        // abrir / cerrar
        card.querySelector('.rama-header').addEventListener('click', e => {
            if (e.target.closest('button, .rama-arrastre')) return;
            card.classList.toggle('abierta');
            if (card.classList.contains('abierta')) ramasAbiertas.add(ramaId); else ramasAbiertas.delete(ramaId);
        });
        card.querySelector('.btn-eliminar-rama').addEventListener('click', () => {
            if (confirm('¿Eliminar esta rama?')) eliminarRama(ramaId);
        });
        card.querySelector('.btn-duplicar-rama').addEventListener('click', () => duplicarRama(ramaId));
        card.querySelector('.btn-subir').addEventListener('click', () => moverRamaUnPaso(ramaId, -1, '.btn-subir'));
        card.querySelector('.btn-bajar').addEventListener('click', () => moverRamaUnPaso(ramaId, 1, '.btn-bajar'));

        // datos de la rama
        card.querySelector('.inp-nombre').addEventListener('change', e => actualizarRama(ramaId, 'nombre', e.target.value.trim().slice(0, 30) || 'Rama'));
        card.querySelector('.inp-longitud').addEventListener('change', e => actualizarRama(ramaId, 'longitud', acotar(e.target.value, LIMITES.longitud, 10)));
        card.querySelector('.inp-seccion').addEventListener('change', e => actualizarRama(ramaId, 'seccion', seccionValida(e.target.value, 2.5)));
        card.querySelector('.inp-automatico').addEventListener('change', e => actualizarRama(ramaId, 'automatico', Number(e.target.value) || 16));

        // extension
        card.querySelector('.chk-extension').addEventListener('change', e => actualizarRama(ramaId, 'extension.activa', e.target.checked));
        card.querySelector('.inp-ext-longitud').addEventListener('change', e => actualizarRama(ramaId, 'extension.longitud', acotar(e.target.value, LIMITES.longitudExt, 5)));
        card.querySelector('.inp-ext-seccion').addEventListener('change', e => actualizarRama(ramaId, 'extension.seccion', seccionValida(e.target.value, 1.5)));

        // agregar equipo del catalogo
        card.querySelector('.btn-add-artefacto').addEventListener('click', () => {
            const sel = card.querySelector('.sel-artefacto');
            const cant = card.querySelector('.inp-cant-artefacto');
            if (sel.value) agregarCarga(ramaId, sel.value, cant.value);
        });

        // equipo personalizado
        card.querySelector('.btn-add-custom').addEventListener('click', () => abrirFormularioEquipo(ramaId));
    }

    // ==================== EQUIPO PERSONALIZADO (formulario) ====================
    function abrirFormularioEquipo(ramaId) {
        const rama = buscarRama(ramaId);
        if (!rama) return;
        ramaEquipoId = ramaId;
        els.formEquipo.reset();
        els.eqNombre.setCustomValidity('');
        els.eqPotencia.min = LIMITES.potencia[0];
        els.eqPotencia.max = LIMITES.potencia[1];
        els.eqCantidad.min = LIMITES.cantidad[0];
        els.eqCantidad.max = LIMITES.cantidad[1];
        els.eqCantidad.value = 1;
        els.equipoRama.textContent = `Se agregará a la rama «${rama.nombre}» (${state.voltajeFuente} V).`;
        actualizarEstimacionEquipo();
        els.modalEquipo.showModal();
        els.eqNombre.focus();
    }

    function actualizarEstimacionEquipo() {
        const p = Number(els.eqPotencia.value);
        const c = Math.round(Number(els.eqCantidad.value)) || 1;
        const V = state.voltajeFuente;
        if (!(p > 0)) {
            els.eqEstimacion.textContent = 'Ingresa la potencia para estimar la corriente.';
            return;
        }
        const I = (p * c) / V;
        els.eqEstimacion.textContent = `Corriente aproximada: ${c} × ${p} W / ${V} V ≈ ${I.toFixed(2)} A (sin contar la caída en el cable).`;
    }

    function guardarEquipoPersonalizado(e) {
        e.preventDefault();
        els.eqNombre.value = els.eqNombre.value.trim();
        els.eqNombre.setCustomValidity(els.eqNombre.value ? '' : 'Escribe el nombre del equipo.');
        if (!els.formEquipo.reportValidity()) return;
        const datos = { nombre: els.eqNombre.value, potencia: Number(els.eqPotencia.value) };
        const cantidad = Number(els.eqCantidad.value);
        els.modalEquipo.close();
        if (ramaEquipoId !== null) agregarCarga(ramaEquipoId, null, cantidad, datos);
        ramaEquipoId = null;
    }

    function renderCargasLista(rama, res) {
        if (!rama.cargas.length) return '<p class="sin-equipos">Sin equipos agregados</p>';
        return rama.cargas.map((c, i) => {
            const detalle = res.cargas[i];
            const I = detalle ? detalle.corrienteTotal : 0;
            return `
                <div class="carga-item ${c.encendido ? '' : 'apagada'}" data-index="${i}">
                    <input type="checkbox" class="chk-carga" ${c.encendido ? 'checked' : ''} title="Encender / apagar">
                    <div class="carga-info">
                        <span class="carga-nombre">${escapeHtml(c.nombre)}</span>
                        <span class="carga-detalle">${c.potencia} W c/u${c.cantidad > 1 ? ' × ' + c.cantidad + ' = ' + (c.potencia * c.cantidad) + ' W' : ''}${c._custom ? ' (personalizado)' : ''}</span>
                    </div>
                    <input type="number" class="carga-cant" value="${c.cantidad}" min="1" max="${LIMITES.cantidad[1]}" title="Cantidad">
                    <span class="carga-corriente" title="Corriente de este equipo">${c.encendido ? I.toFixed(2) + ' A' : 'apagado'}</span>
                    <button class="carga-eliminar" title="Eliminar equipo">x</button>
                </div>
            `;
        }).join('');
    }

    function bindCargaEvents(card, ramaId) {
        card.querySelectorAll('.carga-item').forEach(item => {
            const idx = Number(item.dataset.index);
            item.querySelector('.chk-carga').addEventListener('change', e => toggleCarga(ramaId, idx, e.target.checked));
            item.querySelector('.carga-cant').addEventListener('change', e => actualizarCantidadCarga(ramaId, idx, e.target.value));
            item.querySelector('.carga-eliminar').addEventListener('click', () => eliminarCarga(ramaId, idx));
        });
    }

    // ==================== RENDER DIAGRAMA ====================
    function renderDiagrama(instalacion, resultado) {
        const anterior = document.getElementById('svg-diagrama');
        if (anterior) anterior.remove();
        els.contenedorSvg.insertAdjacentHTML('afterbegin', window.GeneradorDiagrama.generarDiagrama(instalacion, resultado));
        els.leyendaDiagrama.innerHTML = window.GeneradorDiagrama.generarLeyendaHTML(resultado);
        aplicarZoom();
    }

    // ==================== ZOOM Y DESPLAZAMIENTO DEL DIAGRAMA ====================
    // tamaño completo del dibujo (el alto cambia con la cantidad de ramas)
    function tamanoDiagrama(svg) {
        const vb = (svg.getAttribute('data-base') || svg.getAttribute('viewBox') || '0 0 900 500').split(/[\s,]+/).map(Number);
        if (!svg.getAttribute('data-base')) svg.setAttribute('data-base', vb.join(' '));
        return { W: vb[2], H: vb[3] };
    }

    function aplicarZoom() {
        const svg = document.getElementById('svg-diagrama');
        if (!svg) return;
        const { W, H } = tamanoDiagrama(svg);
        zoom.k = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom.k));
        const w = W / zoom.k, h = H / zoom.k;
        zoom.x = Math.max(0, Math.min(W - w, zoom.x));
        zoom.y = Math.max(0, Math.min(H - h, zoom.y));
        svg.setAttribute('viewBox', `${zoom.x.toFixed(2)} ${zoom.y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`);

        els.zoomNivel.textContent = `${Math.round(zoom.k * 100)} %`;
        els.btnZoomMenos.disabled = zoom.k <= ZOOM_MIN;
        els.btnZoomMas.disabled = zoom.k >= ZOOM_MAX;
        els.contenedorSvg.classList.toggle('con-zoom', zoom.k > ZOOM_MIN);
    }

    // acerca o aleja manteniendo fijo el punto (fx, fy) del diagrama visible (fracciones 0..1)
    function zoomEn(factor, fx = 0.5, fy = 0.5) {
        const svg = document.getElementById('svg-diagrama');
        if (!svg) return;
        const { W, H } = tamanoDiagrama(svg);
        const nuevoK = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom.k * factor));
        const px = zoom.x + fx * (W / zoom.k);
        const py = zoom.y + fy * (H / zoom.k);
        zoom.k = nuevoK;
        zoom.x = px - fx * (W / nuevoK);
        zoom.y = py - fy * (H / nuevoK);
        aplicarZoom();
    }

    function reiniciarZoom() {
        zoom.k = 1; zoom.x = 0; zoom.y = 0;
        aplicarZoom();
    }

    function bindZoom() {
        const cont = els.contenedorSvg;
        els.btnZoomMas.addEventListener('click', () => zoomEn(PASO_ZOOM));
        els.btnZoomMenos.addEventListener('click', () => zoomEn(1 / PASO_ZOOM));
        els.btnZoomReset.addEventListener('click', reiniciarZoom);

        // Ctrl + rueda (el pellizco del touchpad tambien llega asi); la rueda sola sigue desplazando la pagina
        cont.addEventListener('wheel', e => {
            if (!e.ctrlKey) return;
            const svg = document.getElementById('svg-diagrama');
            if (!svg) return;
            e.preventDefault();
            const caja = svg.getBoundingClientRect();
            const delta = Math.max(-100, Math.min(100, e.deltaY));
            zoomEn(Math.exp(-delta * 0.004), (e.clientX - caja.left) / caja.width, (e.clientY - caja.top) / caja.height);
        }, { passive: false });

        // arrastrar para moverse cuando hay zoom
        let arrastre = null;
        cont.addEventListener('pointerdown', e => {
            if (zoom.k <= ZOOM_MIN || e.button !== 0 || e.target.closest('.zoom-controles')) return;
            const svg = document.getElementById('svg-diagrama');
            if (!svg) return;
            arrastre = { id: e.pointerId, x0: e.clientX, y0: e.clientY, zx: zoom.x, zy: zoom.y, escala: tamanoDiagrama(svg).W / zoom.k / svg.getBoundingClientRect().width };
            try { cont.setPointerCapture(e.pointerId); } catch (err) { /* puntero no capturable */ }
            cont.classList.add('moviendo');
        });
        cont.addEventListener('pointermove', e => {
            if (!arrastre || e.pointerId !== arrastre.id) return;
            zoom.x = arrastre.zx - (e.clientX - arrastre.x0) * arrastre.escala;
            zoom.y = arrastre.zy - (e.clientY - arrastre.y0) * arrastre.escala;
            aplicarZoom();
        });
        const soltar = e => {
            if (!arrastre || e.pointerId !== arrastre.id) return;
            arrastre = null;
            cont.classList.remove('moviendo');
        };
        cont.addEventListener('pointerup', soltar);
        cont.addEventListener('pointercancel', soltar);

        // doble clic: ver todo el diagrama
        cont.addEventListener('dblclick', e => {
            if (e.target.closest('.zoom-controles')) return;
            reiniciarZoom();
        });
    }

    // ==================== TEMA (auto / claro / oscuro) ====================
    function temaActual() {
        const t = document.documentElement.getAttribute('data-tema');
        return t === 'claro' || t === 'oscuro' ? t : 'auto';
    }

    function actualizarBotonTema() {
        els.btnTema.textContent = `Tema: ${temaActual()}`;
    }

    function cambiarTema() {
        const siguiente = TEMAS[(TEMAS.indexOf(temaActual()) + 1) % TEMAS.length];
        if (siguiente === 'auto') document.documentElement.removeAttribute('data-tema');
        else document.documentElement.setAttribute('data-tema', siguiente);
        try {
            if (siguiente === 'auto') localStorage.removeItem(CLAVE_TEMA); else localStorage.setItem(CLAVE_TEMA, siguiente);
        } catch (e) { /* sin almacenamiento */ }
        actualizarBotonTema();
    }

    // ==================== RENDER DIAGNOSTICO ====================
    function renderDiagnostico(r) {
        if (!state.ramas.length) {
            els.panelDiagnostico.innerHTML = vacio('Sin análisis disponible', 'Configura al menos una rama con equipos para ver el diagnóstico.');
            return;
        }
        const alertas = r.estadoGlobal.alertas;
        let html = '';
        if (!alertas.length) {
            html += `<div class="alerta-item alerta-normal"><span class="alerta-icon">✓</span><div class="alerta-texto"><strong>Instalación segura</strong>Todas las ramas y el automático general están dentro de los límites.</div></div>`;
        } else {
            html += alertas.map(a => `
                <div class="alerta-item alerta-${a.nivel}">
                    <span class="alerta-icon">!</span>
                    <div class="alerta-texto"><strong>${escapeHtml(a.nombre || 'Automático general')}</strong>${escapeHtml(a.mensaje)}</div>
                </div>
            `).join('');
        }

        const recs = [];
        r.ramas.forEach(rama => rama.recomendaciones.forEach(rec => recs.push(`<div class="recomendacion"><strong>${escapeHtml(rama.nombre)}:</strong> ${escapeHtml(rec.mensaje)}</div>`)));
        if (recs.length) html += `<h4 class="subtitulo-panel">Recomendaciones</h4>${recs.join('')}`;

        els.panelDiagnostico.innerHTML = html;
    }

    // ==================== RENDER MATEMATICAS ====================
    function renderMatematicasSelector() {
        const anterior = els.selRamaMatematicas.value;
        els.selRamaMatematicas.innerHTML =
            '<option value="todo">Toda la instalación (nodo del tablero)</option>' +
            state.ramas.map((rama, i) => `<option value="${i}">${escapeHtml(rama.nombre)}</option>`).join('');
        els.selRamaMatematicas.disabled = state.ramas.length === 0;
        const sigueExistiendo = anterior === 'todo' || (anterior !== '' && Number(anterior) < state.ramas.length);
        els.selRamaMatematicas.value = sigueExistiendo ? anterior : 'todo';
    }

    function renderMatematicas(r, inst) {
        if (!state.ramas.length) {
            els.matematicasContenido.innerHTML = vacio('Sin ramas', 'Agrega una rama para ver el desarrollo paso a paso de Ohm, Kirchhoff y potencia.');
            return;
        }
        if (els.selRamaMatematicas.value === 'todo') {
            els.matematicasContenido.innerHTML = matematicasInstalacion(r, inst);
        } else {
            els.matematicasContenido.innerHTML = matematicasRama(r, inst, Number(els.selRamaMatematicas.value));
        }
    }

    function matematicasInstalacion(r, inst) {
        const V_f = inst.voltajeFuente;
        const t = r.totales;
        const sumaTexto = r.ramas.map(x => x.I_rama.toFixed(4)).join(' + ');
        const nombres = r.ramas.map((x, i) => `I${i + 1}`).join(' + ');
        const detalleRamas = r.ramas.map((x, i) => `I${i + 1} (${x.nombre}) = ${x.I_rama.toFixed(4)} A`).join('\n');
        const eg = r.estadoGlobal;
        let html = '';

        html += paso('1. Corriente de cada rama (Ley de Ohm)',
            'I_rama = V_f / (R_cable + R_cargas)',
            detalleRamas,
            'Elige una rama en el selector para ver su desarrollo completo.');

        html += paso('2. 1ra Ley de Kirchhoff en el nodo del tablero',
            `I_total = ${nombres}`,
            `I_total = ${sumaTexto}`,
            `I_total = ${t.I_total.toFixed(4)} A   (error de la suma: ${r.verificaciones.KCL_global.toFixed(6)} A)`);

        html += paso('3. Comparación con el automático general',
            'I_total ≤ I_general  → sin sobrecarga general\nI_total ≥ 0,8 · I_general → advertencia',
            `I_total = ${t.I_total.toFixed(2)} A, I_general = ${inst.automaticoGeneral} A (${((t.I_total / inst.automaticoGeneral) * 100).toFixed(1)} %)`,
            `Automático general: ${ETIQUETAS[eg.estadoTablero]}`);

        html += paso('4. Balance de potencia de la instalación',
            'P_fuente = V_f · I_total = Σ (P_carga + P_pérdida)',
            `P_fuente = ${V_f} · ${t.I_total.toFixed(4)} = ${t.P_total_fuente.toFixed(2)} W\nΣ P_carga = ${t.P_carga_total.toFixed(2)} W, Σ P_pérdida = ${t.P_perdida_total.toFixed(2)} W`,
            `P_carga + P_pérdida = ${r.verificaciones.sumaPotencias.toFixed(2)} W  ·  rendimiento = ${t.rendimiento.toFixed(2)} %`);

        html += `<div class="paso-calculo paso-estado estado-borde-${eg.estado}"><div class="paso-titulo">Estado de la instalación: ${ETIQUETAS[eg.estado]}</div><div class="paso-valores">${eg.ramasPeligro} rama(s) en peligro, ${eg.ramasAdvertencia} en advertencia. Automático general: ${ETIQUETAS[eg.estadoTablero]}.</div></div>`;
        return html;
    }

    function matematicasRama(r, inst, idx) {
        const rama = r.ramas[idx];
        const ramaInst = inst.ramas[idx];
        if (!rama || !ramaInst) return vacio('Selecciona una rama', '');
        const V_f = inst.voltajeFuente;
        const lim = inst.limitesCaida;
        let html = '';

        html += paso('1. Resistencia del cable (ida y vuelta)',
            'R_cable = ρ · (2 · L) / A',
            `ρ = 0.0172 Ω·mm²/m, L = ${ramaInst.longitud} m, A = ${ramaInst.seccion} mm²\nR_cable = 0.0172 · (2 · ${ramaInst.longitud}) / ${ramaInst.seccion}`,
            `R_cable = ${rama.R_cable_rama.toFixed(6)} Ω`);

        if (rama.extension) {
            html += paso('1b. Resistencia de la extensión',
                'R_ext = ρ · (2 · L_ext) / A_ext',
                `L_ext = ${rama.extension.longitud} m, A_ext = ${rama.extension.seccion} mm²`,
                `R_ext = ${rama.R_ext.toFixed(6)} Ω   →   R_cable_total = ${rama.R_cable_total.toFixed(6)} Ω`);
        }

        const cargasEnc = rama.cargas.filter(c => c.encendido);
        if (cargasEnc.length) {
            const detalles = cargasEnc.map(c => `${c.nombre}: R = ${V_f}² / ${c.potencia} = ${(c.resistencia).toFixed(2)} Ω  (× ${c.cantidad})`).join('\n');
            html += paso('2. Resistencia equivalente de los equipos (en paralelo)',
                'R_equipo = V_f² / P   ;   1 / R_cargas = Σ (c_j / R_equipo,j)',
                detalles,
                `R_cargas = ${rama.R_cargas.toFixed(4)} Ω`);

            html += paso('3. Ley de Ohm: corriente de la rama',
                'R_total = R_cable_total + R_cargas\nI_rama = V_f / R_total',
                `R_total = ${rama.R_cable_total.toFixed(4)} + ${rama.R_cargas.toFixed(4)} = ${rama.R_total_rama.toFixed(4)} Ω\nI_rama = ${V_f} / ${rama.R_total_rama.toFixed(4)}`,
                `I_rama = ${rama.I_rama.toFixed(4)} A`);

            html += paso('4. 2da Ley de Kirchhoff (malla): caída de voltaje',
                'ΔV_cable = I_rama · R_cable_total\nV_carga = V_f − ΔV_cable\nΔV % = (ΔV_cable / V_f) · 100',
                `ΔV_cable = ${rama.I_rama.toFixed(4)} · ${rama.R_cable_total.toFixed(6)}\nComprobación de la malla: ${V_f} − ${rama.deltaV_cable.toFixed(2)} − ${rama.V_carga.toFixed(2)} = ${(V_f - rama.verificacionKVL).toFixed(2)} V`,
                `ΔV_cable = ${rama.deltaV_cable.toFixed(2)} V  ·  V_carga = ${rama.V_carga.toFixed(2)} V  ·  ΔV % = ${rama.deltaV_porcentaje.toFixed(2)} %`);

            const corrientesEq = cargasEnc.map(c => `${c.nombre}: ${c.cantidad} × ${c.corriente.toFixed(4)} = ${c.corrienteTotal.toFixed(4)} A`).join('\n');
            html += paso('5. 1ra Ley de Kirchhoff (nodo de la rama)',
                'Σ (c_j · I_equipo,j) = I_rama   con   I_equipo = V_carga / R_equipo',
                corrientesEq,
                `Suma = ${rama.sumaCorrientesEquipos.toFixed(4)} A  =  I_rama ${rama.I_rama.toFixed(4)} A  (error: ${rama.errorKCL_rama.toFixed(6)} A)`);

            html += paso('6. Potencia: útil y disipada en calor (efecto Joule)',
                'P_carga = V_carga · I_rama\nP_pérdida = I_rama² · R_cable_total',
                `P_carga = ${rama.V_carga.toFixed(2)} · ${rama.I_rama.toFixed(4)}\nP_pérdida = ${rama.I_rama.toFixed(4)}² · ${rama.R_cable_total.toFixed(6)}`,
                `P_carga = ${rama.P_carga.toFixed(2)} W  ·  P_pérdida = ${(rama.P_perdida + rama.P_perdida_ext).toFixed(2)} W`);
        } else {
            html += paso('2. Sin equipos encendidos', 'R_cargas = ∞  →  I_rama = 0 A', 'La rama está abierta: no circula corriente.', 'I_rama = 0 A, ΔV = 0 V, P = 0 W');
        }

        const comparaciones = [
            `I_rama = ${rama.I_rama.toFixed(2)} A  vs  automático ${rama.I_proteccion} A (${pctTexto(rama.I_rama, rama.I_proteccion)})`,
            rama.I_cable !== null ? `I_rama = ${rama.I_rama.toFixed(2)} A  vs  ampacidad del cable ${rama.I_cable} A (${pctTexto(rama.I_rama, rama.I_cable)})` : 'Sin ampacidad registrada para este cable',
            rama.I_ext !== null && rama.I_ext !== undefined ? `I_rama = ${rama.I_rama.toFixed(2)} A  vs  ampacidad de la extensión ${rama.I_ext} A (${pctTexto(rama.I_rama, rama.I_ext)})` : null,
            `ΔV % = ${rama.deltaV_porcentaje.toFixed(2)} %  vs  límites ${lim.advertencia} % (advertencia) y ${lim.peligro} % (peligro)`
        ].filter(Boolean).join('\n');
        html += paso('7. Comparación con los límites',
            'I_rama ≤ I_automático   ;   I_rama ≤ I_cable   ;   I_automático ≤ I_cable   ;   ΔV % ≤ límite',
            comparaciones,
            ETIQUETAS[rama.estado]);

        const problemas = rama.problemas.length ? rama.problemas.map(p => `<li class="problema-${p.nivel}">${escapeHtml(p.mensaje)}</li>`).join('') : `<li>${escapeHtml(rama.mensajeEstado)}</li>`;
        html += `<div class="paso-calculo paso-estado estado-borde-${rama.estado}"><div class="paso-titulo">Estado: ${ETIQUETAS[rama.estado]}</div><ul class="rama-problemas">${problemas}</ul></div>`;
        return html;
    }

    function pctTexto(valor, limite) {
        return limite > 0 ? `${((valor / limite) * 100).toFixed(0)} %` : '—';
    }

    function paso(titulo, formula, valores, resultado) {
        return `<div class="paso-calculo"><div class="paso-titulo">${escapeHtml(titulo)}</div><div class="paso-formula">${escapeHtml(formula)}</div><div class="paso-valores">${escapeHtml(valores)}</div><div class="paso-resultado"><strong>Resultado:</strong> ${escapeHtml(resultado)}</div></div>`;
    }

    function vacio(titulo, texto) {
        return `<div class="matematicas-vacio"><h4>${escapeHtml(titulo)}</h4><p>${escapeHtml(texto)}</p></div>`;
    }

    // ==================== TABS ====================
    function cambiarTab(tab) {
        els.tabBtns.forEach(b => { b.classList.toggle('active', b.dataset.tab === tab); b.setAttribute('aria-selected', b.dataset.tab === tab); });
        els.tabPanels.forEach(p => p.classList.toggle('active', p.id === `panel-${tab}`));
    }

    // ==================== REINICIAR ====================
    function reiniciarSimulador() {
        aplicarDatos({ voltajeFuente: 220, automaticoGeneral: 32, limitesCaida: { advertencia: 3, peligro: 5 }, ramas: [] });
        try { localStorage.removeItem(CLAVE_STORAGE); } catch (e) { /* sin almacenamiento */ }
        sincronizarInputsGenerales();
        els.selEscenario.value = '';
        els.btnCargarEscenario.disabled = true;
        els.modalConfirmar.close();
        renderTodo();
    }

    // ==================== UTILIDADES ====================
    function opcionesConductores(selected) {
        return window.CatalogoElectrico.CONDUCTORES.map(c => `<option value="${c.seccion}" ${c.seccion === Number(selected) ? 'selected' : ''}>${c.seccion} mm² (${c.ampacidad} A)</option>`).join('');
    }

    function opcionesProteccionesRama(selected) {
        return window.CatalogoElectrico.PROTECCIONES_RAMA.map(a => `<option value="${a}" ${a === Number(selected) ? 'selected' : ''}>${a} A</option>`).join('');
    }

    function opcionesArtefactos() {
        const CAT = window.CatalogoElectrico;
        const grupo = (titulo, lista) => `<optgroup label="${titulo}">${lista.map(a => `<option value="${a.id}">${escapeHtml(a.nombre)} (${a.potencia} W)</option>`).join('')}</optgroup>`;
        return grupo('Vivienda', CAT.ARTEFACTOS_VIVIENDA) + grupo('Taller', CAT.ARTEFACTOS_TALLER);
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    // ==================== ARRANQUE ====================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
