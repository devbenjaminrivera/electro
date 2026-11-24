// physics.js - motor de calculo puro (Ohm, Kirchhoff, Joule, alertas)
// recibe instalacion, devuelve resultado. sin DOM, determinista

window.MotorCalculo = (function() {
    'use strict';

    const CAT = window.CatalogoElectrico;
    const RHO = CAT.CONSTANTES.RHO_COBRE;
    const V_NOMINAL = CAT.CONSTANTES.VOLTAJE_NOMINAL;

    // redondeo para evitar basura flotante
    function redondear(valor, decimales = 4) {
        if (!isFinite(valor)) return valor;
        const factor = Math.pow(10, decimales);
        return Math.round(valor * factor) / factor;
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

    // evalua estado: normal / advertencia / peligro
    function evaluarEstadoRama(I_rama, I_proteccion, I_cable, deltaV_porcentaje, limites) {
        const I_limite = Math.min(I_proteccion, I_cable);
        const umbralAdvertencia = I_limite * CAT.CONSTANTES.FACTOR_ADVERTENCIA;
        const limAdv = limites?.advertencia ?? CAT.CONSTANTES.LIMITE_CAIDA_ADVERTENCIA;
        const limPeligro = limites?.peligro ?? CAT.CONSTANTES.LIMITE_CAIDA_PELIGRO;

        // PELIGRO: sobrecorriente
        if (I_rama > I_proteccion) {
            return { estado: 'peligro', codigo: 'SOBRECARGA_PROTECCION', mensaje: `Disparo de proteccion: la corriente (${redondear(I_rama,2)} A) supera el automatico de ${I_proteccion} A`, critico: true };
        }
        if (I_rama > I_cable) {
            return { estado: 'peligro', codigo: 'SOBRECARGA_TERMICA', mensaje: `Sobrecarga termica en conductor: ${redondear(I_rama,2)} A supera ampacidad de ${I_cable} A (riesgo incendio)`, critico: true };
        }
        if (deltaV_porcentaje > limPeligro) {
            return { estado: 'peligro', codigo: 'CAIDA_VOLTAJE_CRITICA', mensaje: `Caida de voltaje critica: ${redondear(deltaV_porcentaje,2)}% > ${limPeligro}% (riesgo daño equipos)`, critico: true };
        }
        // ADVERTENCIA: cerca del limite
        if (I_rama >= umbralAdvertencia) {
            return { estado: 'advertencia', codigo: 'CERCA_LIMITE_CORRIENTE', mensaje: `Cerca del limite (${redondear(I_rama,2)} A ≥ ${redondear(umbralAdvertencia,1)} A = 80% de ${I_limite} A)`, critico: false };
        }
        if (deltaV_porcentaje > limAdv) {
            return { estado: 'advertencia', codigo: 'CAIDA_VOLTAJE_ELEVADA', mensaje: `Caida de voltaje elevada: ${redondear(deltaV_porcentaje,2)}% > ${limAdv}% (recomendado)`, critico: false };
        }
        // NORMAL
        return { estado: 'normal', codigo: 'NORMAL', mensaje: 'Operacion segura: corriente y caida de tension dentro de limites', critico: false };
    }

    // recomendaciones contextuales
    function generarRecomendaciones(rama, resultado, instalacion) {
        const recs = [];
        const I_rama = resultado.I_rama;
        const I_cable = CAT.getAmpacidad(rama.seccion) || 0;
        const I_prot = rama.automatico || 0;
        const deltaV_pct = resultado.deltaV_porcentaje;

        if (I_rama > I_cable) {
            const seccionSugerida = CAT.CONDUCTORES.find(c => c.ampacidad >= I_rama * 1.25);
            if (seccionSugerida) {
                recs.push({ tipo: 'cambiar_cable', prioridad: 'alta', mensaje: `Cambiar cable de ${rama.seccion} mm2 a ${seccionSugerida.seccion} mm2 (ampacidad ${seccionSugerida.ampacidad} A)` });
            }
        }

        if (deltaV_pct > CAT.CONSTANTES.LIMITE_CAIDA_ADVERTENCIA) {
            if (rama.extension && rama.extension.longitud > 0) {
                recs.push({ tipo: 'quitar_extension', prioridad: 'alta', mensaje: 'La extension/zapatilla causa caida de voltaje excesiva. Quitala o usa una de mayor seccion.' });
            } else {
                recs.push({ tipo: 'aumentar_seccion', prioridad: 'media', mensaje: `Caida de voltaje ${redondear(deltaV_pct,2)}%. Aumenta seccion del cable o reduce el largo.` });
            }
        }

        if (I_rama >= Math.min(I_prot, I_cable) * CAT.CONSTANTES.FACTOR_ADVERTENCIA && I_rama <= Math.min(I_prot, I_cable)) {
            recs.push({ tipo: 'no_agregar_cargas', prioridad: 'media', mensaje: 'Rama cerca de su capacidad. Evita conectar mas equipos en esta rama.' });
        }

        if (rama.extension && rama.extension.longitud > 0) {
            const I_ext = I_rama;
            const I_cable_ext = CAT.getAmpacidad(rama.extension.seccion) || 0;
            if (I_ext > I_cable_ext * CAT.CONSTANTES.FACTOR_ADVERTENCIA) {
                recs.push({ tipo: 'extension_peligro', prioridad: 'alta', mensaje: `La extension de ${rama.extension.seccion} mm2 (${I_cable_ext} A) esta cerca de su limite con ${redondear(I_ext,2)} A. Riesgo de sobrecalentamiento.` });
            }
        }

        return recs;
    }

    // funcion principal: calcula toda la instalacion
    function calcularInstalacion(instalacion) {
        const V_f = instalacion.voltajeFuente || V_NOMINAL;
        const I_general = instalacion.automaticoGeneral || 32;
        const limites = instalacion.limitesCaida || {};
        const ramas = instalacion.ramas || [];

        const resultadosRamas = [];
        let I_total = 0;
        let P_carga_total = 0;
        let P_perdida_total = 0;
        let alertasGlobales = [];

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
            let R_ext = 0;
            if (extension.activa && extension.longitud > 0 && extension.seccion > 0) {
                R_ext = calcResistenciaCable(Number(extension.longitud), Number(extension.seccion));
            }
            const R_cable_total = R_cable_rama + R_ext;

            // resistencia equivalente cargas
            const R_cargas = calcResistenciaEquivalente(cargas, V_f);

            // corriente rama (Ohm)
            let I_rama = 0;
            let V_carga = V_f;
            let deltaV_cable = 0;
            let deltaV_porcentaje = 0;
            let P_carga = 0;
            let P_perdida = 0;
            let P_perdida_ext = 0;
            let verificacionKVL = V_f;

            if (isFinite(R_cargas) && R_cargas > 0) {
                const R_total_rama = R_cable_total + R_cargas;
                I_rama = V_f / R_total_rama;

                // caida voltaje (Kirchhoff malla)
                deltaV_cable = I_rama * R_cable_total;
                V_carga = V_f - deltaV_cable;
                deltaV_porcentaje = (deltaV_cable / V_f) * 100;
                verificacionKVL = V_carga + deltaV_cable;

                // potencia (Joule)
                P_perdida = I_rama * I_rama * R_cable_rama;
                P_carga = V_carga * I_rama;
                if (extension.activa && R_ext > 0) {
                    P_perdida_ext = I_rama * I_rama * R_ext;
                }
            }

            const I_cable = CAT.getAmpacidad(A_rama) || 0;
            const estado = evaluarEstadoRama(I_rama, I_prot_rama, I_cable, deltaV_porcentaje, limites);

            // detalle por equipo (para KCL nodo rama)
            const equiposDetalle = cargas.filter(c => c.encendido).map(carga => {
                const R_eq = calcResistenciaEquipo(carga.potencia, V_f);
                const I_eq = isFinite(R_eq) && R_eq > 0 ? V_carga / R_eq : 0;
                const P_eq = I_eq * V_carga;
                return { ...carga, resistencia: redondear(R_eq, 4), corriente: redondear(I_eq, 4), potencia: redondear(P_eq, 2) };
            });

            const sumaCorrientesEquipos = equiposDetalle.reduce((sum, eq) => sum + eq.corriente, 0);
            const errorKCL_rama = Math.abs(sumaCorrientesEquipos - I_rama);

            const recomendaciones = generarRecomendaciones(rama, { I_rama, deltaV_porcentaje, I_cable, I_prot_rama }, instalacion);

            const resultadoRama = {
                indice: i, nombre,
                longitud: L_rama, seccion: A_rama, automatico: I_prot_rama,
                extension: extension.activa ? { longitud: extension.longitud, seccion: extension.seccion } : null,
                cargas: equiposDetalle,
                R_cable_rama: redondear(R_cable_rama, 6), R_ext: redondear(R_ext, 6), R_cable_total: redondear(R_cable_total, 6),
                R_cargas: isFinite(R_cargas) ? redondear(R_cargas, 4) : Infinity,
                R_total_rama: isFinite(R_cargas) ? redondear(R_cable_total + R_cargas, 4) : Infinity,
                I_rama: redondear(I_rama, 4), V_carga: redondear(V_carga, 2), deltaV_cable: redondear(deltaV_cable, 2),
                deltaV_porcentaje: redondear(deltaV_porcentaje, 2), P_carga: redondear(P_carga, 2), P_perdida: redondear(P_perdida, 2),
                P_perdida_ext: redondear(P_perdida_ext, 2), verificacionKVL: redondear(verificacionKVL, 2),
                errorKCL_rama: redondear(errorKCL_rama, 6),
                estado: estado.estado, codigoEstado: estado.codigo, mensajeEstado: estado.mensaje, critico: estado.critico,
                I_cable, I_proteccion: I_prot_rama, recomendaciones
            };

            resultadosRamas.push(resultadoRama);
            I_total += I_rama;
            P_carga_total += P_carga;
            P_perdida_total += P_perdida + P_perdida_ext;

            if (estado.critico) {
                alertasGlobales.push({ tipo: 'rama', indice: i, nombre, nivel: 'peligro', mensaje: estado.mensaje });
            } else if (estado.estado === 'advertencia') {
                alertasGlobales.push({ tipo: 'rama', indice: i, nombre, nivel: 'advertencia', mensaje: estado.mensaje });
            }
        }

        // estado global (Kirchhoff nodo principal)
        const estadoGlobal = I_total > I_general ? 'peligro' : (I_total >= I_general * CAT.CONSTANTES.FACTOR_ADVERTENCIA ? 'advertencia' : 'normal');

        if (I_total > I_general) {
            alertasGlobales.push({ tipo: 'general', nivel: 'peligro', mensaje: `SOBRECARGA GENERAL: Corriente total ${redondear(I_total,2)} A supera automatico general de ${I_general} A. Se disparara el automatico principal.` });
        } else if (I_total >= I_general * CAT.CONSTANTES.FACTOR_ADVERTENCIA) {
            alertasGlobales.push({ tipo: 'general', nivel: 'advertencia', mensaje: `Cerca del limite general: ${redondear(I_total,2)} A ≥ ${redondear(I_general * CAT.CONSTANTES.FACTOR_ADVERTENCIA,1)} A (80% de ${I_general} A)` });
        }

        const sumaIrama = resultadosRamas.reduce((sum, r) => sum + r.I_rama, 0);
        const errorKCL_global = Math.abs(sumaIrama - I_total);
        const P_total_fuente = V_f * I_total;

        return {
            parametros: { voltajeFuente: V_f, automaticoGeneral: I_general, limitesCaida: limites, numRamas: ramas.length },
            ramas: resultadosRamas,
            totales: { I_total: redondear(I_total, 4), P_carga_total: redondear(P_carga_total, 2), P_perdida_total: redondear(P_perdida_total, 2), P_total_fuente: redondear(P_total_fuente, 2), rendimiento: I_total > 0 ? redondear((P_carga_total / P_total_fuente) * 100, 2) : 100 },
            estadoGlobal: { estado: estadoGlobal, alertas: alertasGlobales, conteoPeligro: alertasGlobales.filter(a => a.nivel === 'peligro').length, conteoAdvertencia: alertasGlobales.filter(a => a.nivel === 'advertencia').length },
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