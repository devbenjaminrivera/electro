// presets.js - escenarios predefinidos para cargar rapido
// estructura compatible con estado de app.js

window.EscenariosPredefinidos = (function() {
    'use strict';

    // Escenario 1: Sobrecarga en enchufes vivienda
    // 1 rama 1.5mm2 15m auto 10A: estufa 2000W + hervidor 1800W + pc 400W
    // Esperado: I ~19A, dispara auto 10A, sobrecarga termica
    const ESCENARIO_1 = {
        id: 'escenario-1',
        nombre: 'Sobrecarga en enchufes de vivienda',
        descripcion: 'Una sola rama de 1.5 mm2 con 3 equipos de alto consumo. Demuestra disparo de automatico y sobrecarga termica.',
        parametros: { voltajeFuente: 220, automaticoGeneral: 25, limitesCaida: { advertencia: 3, peligro: 5 } },
        ramas: [{ nombre: 'Enchufes Sala/Comedor', longitud: 15, seccion: 1.5, automatico: 10, extension: { activa: false, longitud: 0, seccion: 1.5 }, cargas: [{ nombre: 'Estufa electrica / Termoventilador', potencia: 2000, cantidad: 1, encendido: true }, { nombre: 'Hervidor electrico', potencia: 1800, cantidad: 1, encendido: true }, { nombre: 'Computador de escritorio', potencia: 400, cantidad: 1, encendido: true }] }]
    };

    // Escenario 2: Taller con extension larga
    // Rama 2.5mm2 12m auto 16A + extension 0.75mm2 25m: sierra 1600W + taladro 800W
    // Esperado: dV% > 5%, voltaje reducido, mucha perdida en extension
    const ESCENARIO_2 = {
        id: 'escenario-2',
        nombre: 'Pequeño taller con extension larga',
        descripcion: 'Rama de taller con extension larga y delgada (0.75 mm2, 25 m). Demuestra caida de voltaje critica y riesgo en alargador.',
        parametros: { voltajeFuente: 220, automaticoGeneral: 32, limitesCaida: { advertencia: 3, peligro: 5 } },
        ramas: [{ nombre: 'Taller - Sierra y Taladro', longitud: 12, seccion: 2.5, automatico: 16, extension: { activa: true, longitud: 25, seccion: 0.75 }, cargas: [{ nombre: 'Sierra circular', potencia: 1600, cantidad: 1, encendido: true }, { nombre: 'Taladro percutor', potencia: 800, cantidad: 1, encendido: true }] }]
    };

    // Escenario 3: Instalacion residencial equilibrada (segura)
    // 3 ramas: alumbrado 1.5mm2, cocina 2.5mm2, taller 2.5mm2
    // Esperado: todo verde, dV% < 3%, corriente total ok
    const ESCENARIO_3 = {
        id: 'escenario-3',
        nombre: 'Instalación residencial equilibrada (Segura)',
        descripcion: 'Instalación bien dimensionada con 3 ramas. Demuestra operacion segura con margenes adecuados.',
        parametros: { voltajeFuente: 220, automaticoGeneral: 32, limitesCaida: { advertencia: 3, peligro: 5 } },
        ramas: [
            { nombre: 'Alumbrado + TV', longitud: 15, seccion: 1.5, automatico: 10, extension: { activa: false, longitud: 0, seccion: 1.5 }, cargas: [{ nombre: 'Ampolleta LED', potencia: 15, cantidad: 6, encendido: true }, { nombre: 'Televisor / Monitor', potencia: 120, cantidad: 1, encendido: true }] },
            { nombre: 'Cocina', longitud: 10, seccion: 2.5, automatico: 16, extension: { activa: false, longitud: 0, seccion: 2.5 }, cargas: [{ nombre: 'Refrigerador', potencia: 350, cantidad: 1, encendido: true }, { nombre: 'Hervidor electrico', potencia: 1800, cantidad: 1, encendido: true }] },
            { nombre: 'Escritorio / Taller', longitud: 12, seccion: 2.5, automatico: 16, extension: { activa: false, longitud: 0, seccion: 2.5 }, cargas: [{ nombre: 'Computador de escritorio', potencia: 400, cantidad: 1, encendido: true }, { nombre: 'Taladro percutor', potencia: 800, cantidad: 1, encendido: false }] }
        ]
    };

    // Escenario 4: Cocina microondas + hervidor
    // 1 rama 2.5mm2 8m auto 16A: micro 1200W + hervidor 1800W + refri 350W
    // Esperado: cerca limite auto 16A, dV% moderada
    const ESCENARIO_4 = {
        id: 'escenario-4',
        nombre: 'Cocina: Microondas + Hervidor simultaneos',
        descripcion: 'Dos equipos de alto consumo en cocina. Demuestra advertencia por cercania al limite de proteccion.',
        parametros: { voltajeFuente: 220, automaticoGeneral: 25, limitesCaida: { advertencia: 3, peligro: 5 } },
        ramas: [{ nombre: 'Cocina Principal', longitud: 8, seccion: 2.5, automatico: 16, extension: { activa: false, longitud: 0, seccion: 2.5 }, cargas: [{ nombre: 'Microondas', potencia: 1200, cantidad: 1, encendido: true }, { nombre: 'Hervidor electrico', potencia: 1800, cantidad: 1, encendido: true }, { nombre: 'Refrigerador', potencia: 350, cantidad: 1, encendido: true }] }]
    };

    // Escenario 5: Caso prueba A validacion matematica
    // Vf=220V, L=10m, A=2.5mm2, 1 equipo 2200W
    // Esperado: R_cable=0.1376, R_carga=22, I~9.94A, dV~1.37V (0.62%)
    const ESCENARIO_VALIDACION_A = {
        id: 'validacion-a',
        nombre: 'Caso Prueba A: Rama simple 2200W (Validación)',
        descripcion: 'Caso de prueba del plan para verificacion matematica exacta.',
        parametros: { voltajeFuente: 220, automaticoGeneral: 32, limitesCaida: { advertencia: 3, peligro: 5 } },
        ramas: [{ nombre: 'Test Validacion A', longitud: 10, seccion: 2.5, automatico: 16, extension: { activa: false, longitud: 0, seccion: 2.5 }, cargas: [{ nombre: 'Carga 2200W', potencia: 2200, cantidad: 1, encendido: true }] }]
    };

    const TODOS_ESCENARIOS = [ESCENARIO_1, ESCENARIO_2, ESCENARIO_3, ESCENARIO_4, ESCENARIO_VALIDACION_A];

    function obtenerTodos() {
        return TODOS_ESCENARIOS.map(e => ({ id: e.id, nombre: e.nombre, descripcion: e.descripcion }));
    }

    function obtenerPorId(id) {
        return TODOS_ESCENARIOS.find(e => e.id === id) || null;
    }

    function obtenerEscenarioPrincipal() {
        return [ESCENARIO_1, ESCENARIO_2, ESCENARIO_3];
    }

    return { ESCENARIO_1, ESCENARIO_2, ESCENARIO_3, ESCENARIO_4, ESCENARIO_VALIDACION_A, TODOS_ESCENARIOS, obtenerTodos, obtenerPorId, obtenerEscenarioPrincipal };
})();