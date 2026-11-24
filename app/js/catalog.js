// catalogo.js - datos base: cables, protecciones, artefactos
// solo expone window.CatalogoElectrico, no toca el DOM

window.CatalogoElectrico = (function() {
    'use strict';

    // constantes fisicas basicas
    const CONSTANTES = {
        RHO_COBRE: 0.0172,        // resistividad cobre a 20°C (Ω·mm²/m)
        VOLTAJE_NOMINAL: 220,     // Chile
        FRECUENCIA: 50,
        LIMITE_CAIDA_ADVERTENCIA: 3,
        LIMITE_CAIDA_PELIGRO: 5,
        FACTOR_ADVERTENCIA: 0.8   // 80% capacidad = advertencia
    };

    // conductores cobre: seccion mm², ampacidad max referencia
    const CONDUCTORES = [
        { seccion: 0.75, uso: 'Alargador / zapatilla liviana', ampacidad: 6, descripcion: 'Muy propenso a sobrecalentamiento con estufas o herramientas' },
        { seccion: 1.0, uso: 'Extension domestica estandar', ampacidad: 10, descripcion: 'Alerta temprana si supera 8-10 A' },
        { seccion: 1.5, uso: 'Circuito de alumbrado', ampacidad: 15, descripcion: 'Estandar alumbrado (proteccion tipica 10 A)' },
        { seccion: 2.5, uso: 'Circuito de enchufes', ampacidad: 20, descripcion: 'Estandar enchufes hogar/taller (proteccion tipica 16 A)' },
        { seccion: 4.0, uso: 'Linea reforzada / cocina / taller', ampacidad: 25, descripcion: 'Para cargas altas o tramos largos' },
        { seccion: 6.0, uso: 'Alimentador / tablero / soldadora', ampacidad: 32, descripcion: 'Linea principal o maquinaria pesada' }
    ];

    // automaticos comerciales
    const PROTECCIONES_RAMA = [6, 10, 16, 20, 25, 32];
    const PROTECCIONES_GENERAL = [16, 25, 32, 40, 50];

    // artefactos tipicos 220V (sin emojis)
    const ARTEFACTOS_VIVIENDA = [
        { id: 'v1', nombre: 'Ampolleta LED', potencia: 15, categoria: 'Vivienda' },
        { id: 'v2', nombre: 'Televisor / Monitor', potencia: 120, categoria: 'Vivienda' },
        { id: 'v3', nombre: 'Computador de escritorio', potencia: 400, categoria: 'Vivienda' },
        { id: 'v4', nombre: 'Refrigerador', potencia: 350, categoria: 'Vivienda' },
        { id: 'v5', nombre: 'Microondas', potencia: 1200, categoria: 'Vivienda' },
        { id: 'v6', nombre: 'Hervidor electrico', potencia: 1800, categoria: 'Vivienda' },
        { id: 'v7', nombre: 'Estufa electrica / Termoventilador', potencia: 2000, categoria: 'Vivienda' },
        { id: 'v8', nombre: 'Plancha', potencia: 1600, categoria: 'Vivienda' },
        { id: 'v9', nombre: 'Lavadora', potencia: 1500, categoria: 'Vivienda' }
    ];

    const ARTEFACTOS_TALLER = [
        { id: 't1', nombre: 'Taladro percutor', potencia: 800, categoria: 'Taller' },
        { id: 't2', nombre: 'Esmeril angular / Galletera', potencia: 1100, categoria: 'Taller' },
        { id: 't3', nombre: 'Sierra circular', potencia: 1600, categoria: 'Taller' },
        { id: 't4', nombre: 'Compresor pequeno', potencia: 1500, categoria: 'Taller' },
        { id: 't5', nombre: 'Soldadora inverter basica', potencia: 3200, categoria: 'Taller' }
    ];

    const TODOS_ARTEFACTOS = [...ARTEFACTOS_VIVIENDA, ...ARTEFACTOS_TALLER];

    // utilidades
    function getAmpacidad(seccion) {
        const c = CONDUCTORES.find(c => c.seccion === seccion);
        return c ? c.ampacidad : null;
    }

    function getConductor(seccion) {
        return CONDUCTORES.find(c => c.seccion === seccion) || null;
    }

    function getArtefacto(id) {
        return TODOS_ARTEFACTOS.find(a => a.id === id) || null;
    }

    function buscarArtefactos(termino) {
        const t = termino.toLowerCase();
        return TODOS_ARTEFACTOS.filter(a => a.nombre.toLowerCase().includes(t));
    }

    // R = rho * (2*L) / A  (ida y vuelta)
    function calcularResistenciaCable(longitud, seccion) {
        if (longitud <= 0 || seccion <= 0) return 0;
        return CONSTANTES.RHO_COBRE * (2 * longitud) / seccion;
    }

    // R = V^2 / P
    function calcularResistenciaEquipo(potencia, voltaje = CONSTANTES.VOLTAJE_NOMINAL) {
        if (potencia <= 0) return Infinity;
        return (voltaje * voltaje) / potencia;
    }

    function esProteccionValida(amperaje, tipo = 'rama') {
        const lista = tipo === 'general' ? PROTECCIONES_GENERAL : PROTECCIONES_RAMA;
        return lista.includes(amperaje);
    }

    return {
        CONSTANTES,
        CONDUCTORES,
        PROTECCIONES_RAMA,
        PROTECCIONES_GENERAL,
        ARTEFACTOS_VIVIENDA,
        ARTEFACTOS_TALLER,
        TODOS_ARTEFACTOS,
        getAmpacidad,
        getConductor,
        getArtefacto,
        buscarArtefactos,
        calcularResistenciaCable,
        calcularResistenciaEquipo,
        esProteccionValida
    };
})();