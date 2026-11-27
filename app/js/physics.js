// physics.js - motor de calculo puro (Ohm, Kirchhoff, Joule, alertas)
// recibe instalacion, devuelve resultado. sin DOM, determinista

window.MotorCalculo = (function() {
    'use strict';

    const CAT = window.CatalogoElectrico;
    const RHO = CAT.CONSTANTES.RHO_COBRE;
    const V_NOMINAL = CAT.CONSTANTES.VOLTAJE_NOMINAL;
    const FACTOR_ADV = CAT.CONSTANTES.FACTOR_ADVERTENCIA;
    const GRAVEDAD = { normal: 0, advertencia: 1, peligro: 2 };

    // redondeo para evitar basura flotante
    function redondear(valor, decimales = 4) {
        if (!isFinite(valor)) return valor;
        const factor = Math.pow(10, decimales);
        return Math.round(valor * factor) / factor;
    }

    function peorEstado(estados) {
        return estados.reduce((peor, e) => (GRAVEDAD[e] > GRAVEDAD[peor] ? e : peor), 'normal');
    }

    // resistencia cable ida y vuelta
    function calcResistenciaCable(longitud, seccion) {
        if (longitud <= 0 || seccion <= 0) return 0;
        return RHO * (2 * longitud) / seccion;
    }

    // resistencia equipo desde potencia nominal
    function calcResistenciaEquipo(potencia, voltaje = V_NOMINAL) {
        if (potencia <= 0) return Infinity;
        return (voltaje * voltaje) / potencia;
    }

    // resistencia equivalente cargas en paralelo (solo encendidas)
    function calcResistenciaEquivalente(cargas, voltaje = V_NOMINAL) {
        if (!cargas || cargas.length === 0) return Infinity;
        let sumaConductancias = 0;
        for (const carga of cargas) {
            if (!carga.encendido) continue;
            const R = calcResistenciaEquipo(carga.potencia, voltaje);
            if (R > 0 && isFinite(R)) {
                sumaConductancias += (carga.cantidad || 1) / R;
            }
        }
        if (sumaConductancias <= 0) return Infinity;
        return 1 / sumaConductancias;
    }

    // evalua una rama y devuelve TODOS los problemas encontrados.
    // estado = el peor problema; mensaje/codigo = el primero de ese nivel.
    // I_ext: ampacidad de la extension (null si no hay extension activa)
    function evaluarEstadoRama(I_rama, I_proteccion, I_cable, deltaV_porcentaje, limites, I_ext = null) {
        const limAdv = limites?.advertencia ?? CAT.CONSTANTES.LIMITE_CAIDA_ADVERTENCIA;
        const limPeligro = limites?.peligro ?? CAT.CONSTANTES.LIMITE_CAIDA_PELIGRO;
        const I = redondear(I_rama, 2);
        const problemas = [];
        const agregar = (nivel, codigo, mensaje) => problemas.push({ nivel, codigo, mensaje });

        // PELIGRO
        if (I_rama > I_proteccion) {
            agregar('peligro', 'SOBRECARGA_PROTECCION', `Disparo de protección: la corriente (${I} A) supera el automático de ${I_proteccion} A.`);
        }
        if (I_cable === null) {
            agregar('advertencia', 'SIN_AMPACIDAD', 'No hay ampacidad registrada en el catálogo para la sección de este cable.');
        } else {
            if (I_rama > I_cable) {
                agregar('peligro', 'SOBRECARGA_TERMICA', `Sobrecarga térmica en el conductor: ${I} A supera su ampacidad de ${I_cable} A (riesgo de incendio).`);
            }
            if (I_proteccion > I_cable) {
                agregar('peligro', 'PROTECCION_SOBREDIMENSIONADA', `El automático de ${I_proteccion} A es mayor que la ampacidad del cable (${I_cable} A): el cable puede sobrecalentarse sin que el automático se dispare.`);
            }
        }
        if (I_ext !== null) {
            if (I_rama > I_ext) {
                agregar('peligro', 'SOBRECARGA_EXTENSION', `Sobrecarga térmica en la extensión: ${I} A supera su ampacidad de ${I_ext} A (riesgo de incendio en la zapatilla).`);
            } else if (I_proteccion > I_ext) {
                agregar('advertencia', 'EXTENSION_SIN_PROTECCION', `El automático de ${I_proteccion} A no protege la extensión de ${I_ext} A: si se conectan más equipos puede sobrecalentarse antes de que el automático actúe.`);
            }
        }
        if (deltaV_porcentaje > limPeligro) {
            agregar('peligro', 'CAIDA_VOLTAJE_CRITICA', `Caída de voltaje crítica: ${redondear(deltaV_porcentaje, 2)} % > ${limPeligro} % (riesgo de daño a los equipos).`);
        }

        // ADVERTENCIA (solo si ese mismo valor no esta ya en peligro)
        const limitesCorriente = [I_proteccion, I_cable, I_ext].filter(v => v !== null && v > 0);
        const I_limite = Math.min(...limitesCorriente);
        const umbral = I_limite * FACTOR_ADV;
        if (I_rama >= umbral && I_rama <= I_limite) {
            agregar('advertencia', 'CERCA_LIMITE_CORRIENTE', `Cerca del límite: ${I} A ≥ ${redondear(umbral, 1)} A (80 % de ${I_limite} A). Evitar conectar más equipos.`);
        }
        if (deltaV_porcentaje > limAdv && deltaV_porcentaje <= limPeligro) {
            agregar('advertencia', 'CAIDA_VOLTAJE_ELEVADA', `Caída de voltaje elevada: ${redondear(deltaV_porcentaje, 2)} % > ${limAdv} % recomendado.`);
        }

        const estado = peorEstado(problemas.map(p => p.nivel));
        if (estado === 'normal') {
            return { estado, codigo: 'NORMAL', mensaje: 'Operación segura: corriente y caída de tensión dentro de los límites.', critico: false, problemas: [] };
        }
        const principal = problemas.find(p => p.nivel === estado);
        return { estado, codigo: principal.codigo, mensaje: principal.mensaje, critico: estado === 'peligro', problemas };
    }

    // recomendaciones contextuales
    function generarRecomendaciones(rama, resultado) {
        const recs = [];
        const { I_rama, deltaV_porcentaje, I_cable, I_prot_rama, I_ext, limites } = resultado;
        const limAdv = limites?.advertencia ?? CAT.CONSTANTES.LIMITE_CAIDA_ADVERTENCIA;

        if (I_cable !== null && I_rama > I_cable) {
            const sugerida = CAT.CONDUCTORES.find(c => c.ampacidad >= I_rama * 1.25);
            recs.push({ tipo: 'cambiar_cable', prioridad: 'alta', mensaje: sugerida
                ? `Cambiar el cable de ${rama.seccion} mm² a ${sugerida.seccion} mm² (ampacidad ${sugerida.ampacidad} A) o repartir los equipos en otra rama.`
                : 'La corriente supera todos los cables del catálogo: repartir los equipos en varias ramas.' });
        }

        if (I_cable !== null && I_prot_rama > I_cable) {
            const protAdecuada = [...CAT.PROTECCIONES_RAMA].reverse().find(a => a <= I_cable);
            recs.push({ tipo: 'bajar_proteccion', prioridad: 'alta', mensaje: protAdecuada
                ? `Usar un automático de ${protAdecuada} A (no mayor que los ${I_cable} A del cable) o aumentar la sección del cable.`
                : 'Aumentar la sección del cable para que soporte la corriente del automático.' });
        }

        if (I_rama > I_prot_rama) {
            recs.push({ tipo: 'repartir_cargas', prioridad: 'alta', mensaje: 'Apagar o mover a otra rama algún equipo de alto consumo para no disparar el automático.' });
        }

        if (I_ext !== null && I_rama > I_ext * FACTOR_ADV) {
            const sugerida = CAT.CONDUCTORES.find(c => c.ampacidad >= I_rama * 1.25);
            const verbo = I_rama > I_ext ? 'supera' : 'está cerca de';
            recs.push({ tipo: 'extension_peligro', prioridad: 'alta', mensaje: `Con ${redondear(I_rama, 2)} A la extensión de ${rama.extension.seccion} mm² ${verbo} su límite de ${I_ext} A. ` +
                (sugerida ? `Usar una extensión de al menos ${sugerida.seccion} mm² o conectar los equipos directo al enchufe.` : 'Conectar los equipos directo al enchufe.') });
        }

        if (deltaV_porcentaje > limAdv) {
            if (I_ext !== null) {
                recs.push({ tipo: 'quitar_extension', prioridad: 'alta', mensaje: 'La extensión aumenta la caída de voltaje: acortarla, usar una de mayor sección o quitarla.' });
            } else {
                recs.push({ tipo: 'aumentar_seccion', prioridad: 'media', mensaje: `Caída de voltaje de ${redondear(deltaV_porcentaje, 2)} %: aumentar la sección del cable o acortar el tramo.` });
            }
        }

        const limitesCorriente = [I_prot_rama, I_cable, I_ext].filter(v => v !== null && v > 0);
        const I_limite = Math.min(...limitesCorriente);
        if (I_rama >= I_limite * FACTOR_ADV && I_rama <= I_limite) {
            recs.push({ tipo: 'no_agregar_cargas', prioridad: 'media', mensaje: 'Rama cerca de su capacidad: evitar conectar más equipos en esta rama.' });
        }

        return recs;
    }

    // funcion principal: calcula toda la instalacion
    function calcularInstalacion(instalacion) {
        const V_f = Number(instalacion.voltajeFuente) || V_NOMINAL;
        const I_general = Number(instalacion.automaticoGeneral) || 32;
        const limites = instalacion.limitesCaida || {};
        const ramas = instalacion.ramas || [];

        const resultadosRamas = [];
        let I_total = 0;
        let P_carga_total = 0;
        let P_perdida_total = 0;
        const alertasGlobales = [];

        for (let i = 0; i < ramas.length; i++) {
            const rama = ramas[i];
            const nombre = rama.nombre || `Rama ${i + 1}`;
            const L_rama = Number(rama.longitud) || 0;
            const A_rama = Number(rama.seccion) || 2.5;
            const I_prot_rama = Number(rama.automatico) || 16;
            const cargas = rama.cargas || [];
            const extension = rama.extension || { activa: false };

            // resistencia cable rama
            const R_cable_rama = calcResistenciaCable(L_rama, A_rama);

            // resistencia extension si hay
            const extActiva = !!(extension.activa && Number(extension.longitud) > 0 && Number(extension.seccion) > 0);
            const R_ext = extActiva ? calcResistenciaCable(Number(extension.longitud), Number(extension.seccion)) : 0;
            const R_cable_total = R_cable_rama + R_ext;

            // resistencia equivalente cargas
            const R_cargas = calcResistenciaEquivalente(cargas, V_f);

            let I_rama = 0;
            let V_carga = V_f;
            let deltaV_cable = 0;
            let deltaV_porcentaje = 0;
            let P_carga = 0;
            let P_perdida = 0;
            let P_perdida_ext = 0;
            let verificacionKVL = V_f;

            if (isFinite(R_cargas) && R_cargas > 0) {
                // Ley de Ohm en la rama
                const R_total_rama = R_cable_total + R_cargas;
                I_rama = V_f / R_total_rama;

                // caida de voltaje (2da ley de Kirchhoff en la malla)
                deltaV_cable = I_rama * R_cable_total;
                V_carga = V_f - deltaV_cable;
                deltaV_porcentaje = (deltaV_cable / V_f) * 100;
                verificacionKVL = V_carga + deltaV_cable;

                // potencia (Joule)
                P_perdida = I_rama * I_rama * R_cable_rama;
                P_perdida_ext = I_rama * I_rama * R_ext;
                P_carga = V_carga * I_rama;
            }

            const I_cable = CAT.getAmpacidad(A_rama);
            const I_ext = extActiva ? CAT.getAmpacidad(Number(extension.seccion)) : null;
            const estado = evaluarEstadoRama(I_rama, I_prot_rama, I_cable, deltaV_porcentaje, limites, I_ext);

            // detalle por equipo, en el mismo orden que las cargas (los apagados quedan con 0 A)
            const equiposDetalle = cargas.map(carga => {
                const R_eq = calcResistenciaEquipo(carga.potencia, V_f);
                const I_eq = carga.encendido && isFinite(R_eq) && R_eq > 0 ? V_carga / R_eq : 0;
                const cantidad = carga.cantidad || 1;
                return {
                    ...carga,
                    cantidad,
                    resistencia: redondear(R_eq, 4),
                    corriente: redondear(I_eq, 4),                 // por unidad
                    corrienteTotal: redondear(I_eq * cantidad, 4), // todas las unidades
                    potenciaReal: redondear(I_eq * V_carga * cantidad, 2)
                };
            });

            // 1ra ley de Kirchhoff en el nodo de la rama: suma de corrientes de los equipos = I_rama
            const sumaCorrientesEquipos = equiposDetalle.reduce((sum, eq) => sum + eq.corrienteTotal, 0);
            const errorKCL_rama = Math.abs(sumaCorrientesEquipos - I_rama);

            const recomendaciones = generarRecomendaciones(rama, { I_rama, deltaV_porcentaje, I_cable, I_prot_rama, I_ext, limites });

            resultadosRamas.push({
                indice: i, nombre,
                longitud: L_rama, seccion: A_rama, automatico: I_prot_rama,
                extension: extActiva ? { longitud: Number(extension.longitud), seccion: Number(extension.seccion) } : null,
                cargas: equiposDetalle,
                R_cable_rama: redondear(R_cable_rama, 6), R_ext: redondear(R_ext, 6), R_cable_total: redondear(R_cable_total, 6),
                R_cargas: isFinite(R_cargas) ? redondear(R_cargas, 4) : Infinity,
                R_total_rama: isFinite(R_cargas) ? redondear(R_cable_total + R_cargas, 4) : Infinity,
                I_rama: redondear(I_rama, 4), V_carga: redondear(V_carga, 2), deltaV_cable: redondear(deltaV_cable, 2),
                deltaV_porcentaje: redondear(deltaV_porcentaje, 2), P_carga: redondear(P_carga, 2), P_perdida: redondear(P_perdida, 2),
                P_perdida_ext: redondear(P_perdida_ext, 2), verificacionKVL: redondear(verificacionKVL, 2),
                sumaCorrientesEquipos: redondear(sumaCorrientesEquipos, 4),
                errorKCL_rama: redondear(errorKCL_rama, 6),
                estado: estado.estado, codigoEstado: estado.codigo, mensajeEstado: estado.mensaje, critico: estado.critico,
                problemas: estado.problemas,
                I_cable, I_ext, I_proteccion: I_prot_rama, recomendaciones
            });

            I_total += I_rama;
            P_carga_total += P_carga;
            P_perdida_total += P_perdida + P_perdida_ext;

            estado.problemas.forEach(p => alertasGlobales.push({ tipo: 'rama', indice: i, nombre, nivel: p.nivel, codigo: p.codigo, mensaje: p.mensaje }));
        }

        // automatico general (1ra ley de Kirchhoff en el nodo del tablero: I_total = suma de las ramas)
        const estadoTablero = I_total > I_general ? 'peligro' : (I_total >= I_general * FACTOR_ADV ? 'advertencia' : 'normal');
        if (estadoTablero === 'peligro') {
            alertasGlobales.unshift({ tipo: 'general', nivel: 'peligro', mensaje: `Sobrecarga general: la corriente total de ${redondear(I_total, 2)} A supera el automático general de ${I_general} A. Se disparará el automático principal.` });
        } else if (estadoTablero === 'advertencia') {
            alertasGlobales.unshift({ tipo: 'general', nivel: 'advertencia', mensaje: `Cerca del límite general: ${redondear(I_total, 2)} A ≥ ${redondear(I_general * FACTOR_ADV, 1)} A (80 % de ${I_general} A).` });
        }

        // estado de toda la instalacion = el peor entre el tablero y las ramas
        const estadoInstalacion = peorEstado([estadoTablero, ...resultadosRamas.map(r => r.estado)]);

        const sumaIrama = resultadosRamas.reduce((sum, r) => sum + r.I_rama, 0);
        const errorKCL_global = Math.abs(sumaIrama - redondear(I_total, 4));
        const P_total_fuente = V_f * I_total;

        return {
            parametros: { voltajeFuente: V_f, automaticoGeneral: I_general, limitesCaida: limites, numRamas: ramas.length },
            ramas: resultadosRamas,
            totales: { I_total: redondear(I_total, 4), P_carga_total: redondear(P_carga_total, 2), P_perdida_total: redondear(P_perdida_total, 2), P_total_fuente: redondear(P_total_fuente, 2), rendimiento: I_total > 0 ? redondear((P_carga_total / P_total_fuente) * 100, 2) : 100 },
            estadoGlobal: {
                estado: estadoInstalacion,          // peor estado de toda la instalacion
                estadoTablero,                      // solo el automatico general
                alertas: alertasGlobales,
                conteoPeligro: alertasGlobales.filter(a => a.nivel === 'peligro').length,
                conteoAdvertencia: alertasGlobales.filter(a => a.nivel === 'advertencia').length,
                ramasPeligro: resultadosRamas.filter(r => r.estado === 'peligro').length,
                ramasAdvertencia: resultadosRamas.filter(r => r.estado === 'advertencia').length
            },
            verificaciones: { KCL_global: redondear(errorKCL_global, 6), KVL_todas_ok: resultadosRamas.every(r => Math.abs(r.verificacionKVL - V_f) < 0.01), sumaPotencias: redondear(P_carga_total + P_perdida_total, 2), P_total_fuente: redondear(P_total_fuente, 2) },
            timestamp: new Date().toISOString()
        };
    }

    // validaciones para consola (casos de prueba del plan)
    function validarCasoPruebaA() {
        console.group('Validacion Caso Prueba A');
        const inst = { voltajeFuente: 220, automaticoGeneral: 32, ramas: [{ nombre: 'Test A', longitud: 10, seccion: 2.5, automatico: 16, extension: { activa: false }, cargas: [{ nombre: 'Carga 2200W', potencia: 2200, cantidad: 1, encendido: true }] }] };
        const r = calcularInstalacion(inst);
        const ra = r.ramas[0];
        console.log('R_cable (esp 0.1376):', ra.R_cable_rama);
        console.log('R_carga (esp 22.0):', ra.R_cargas);
        console.log('I_rama (esp ~9.94):', ra.I_rama);
        console.log('dV (esp ~1.37V):', ra.deltaV_cable);
        console.log('dV% (esp ~0.62%):', ra.deltaV_porcentaje);
        console.log('V_carga (esp ~218.63):', ra.V_carga);
        console.log('P_perdida (esp ~13.6):', ra.P_perdida);
        console.log('KVL (esp 220):', ra.verificacionKVL);
        console.groupEnd();
        return r;
    }

    function validarCasoPruebaB() {
        console.group('Validacion Caso Prueba B (KCL 2 ramas)');
        const inst = { voltajeFuente: 220, automaticoGeneral: 32, ramas: [{ nombre: 'R1', longitud: 10, seccion: 2.5, automatico: 16, extension: { activa: false }, cargas: [{ nombre: 'Carga 2200W', potencia: 2200, cantidad: 1, encendido: true }] }, { nombre: 'R2', longitud: 1, seccion: 6.0, automatico: 16, extension: { activa: false }, cargas: [{ nombre: 'Carga 1100W', potencia: 1100, cantidad: 1, encendido: true }] }] };
        const r = calcularInstalacion(inst);
        console.log('I_rama1:', r.ramas[0].I_rama);
        console.log('I_rama2:', r.ramas[1].I_rama);
        console.log('I_total:', r.totales.I_total);
        console.log('Suma I_rama:', r.ramas[0].I_rama + r.ramas[1].I_rama);
        console.log('Error KCL global:', r.verificaciones.KCL_global);
        console.groupEnd();
        return r;
    }

    function validarCasoPruebaC() {
        console.group('Validacion Caso Prueba C (sin cargas)');
        const inst = { voltajeFuente: 220, automaticoGeneral: 32, ramas: [{ nombre: 'Test C', longitud: 10, seccion: 2.5, automatico: 16, extension: { activa: false }, cargas: [{ nombre: 'Carga apagada', potencia: 2200, cantidad: 1, encendido: false }] }] };
        const r = calcularInstalacion(inst);
        const ra = r.ramas[0];
        console.log('I_rama (esp 0):', ra.I_rama);
        console.log('dV (esp 0):', ra.deltaV_cable);
        console.log('V_carga (esp 220):', ra.V_carga);
        console.log('P_perdida (esp 0):', ra.P_perdida);
        console.log('Sin NaN:', !isNaN(ra.I_rama) && !isNaN(ra.V_carga));
        console.groupEnd();
        return r;
    }

    return {
        calcularInstalacion,
        validarCasoPruebaA,
        validarCasoPruebaB,
        validarCasoPruebaC,
        _internals: { calcResistenciaCable, calcResistenciaEquipo, calcResistenciaEquivalente, evaluarEstadoRama, redondear }
    };
})();
