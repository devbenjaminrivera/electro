// pruebas.js - pruebas automaticas del motor de calculo (sin dependencias)
// Uso:  node tests/pruebas.js
// Carga catalog.js y physics.js tal como lo hace el navegador y revisa los casos del plan (seccion 8).

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

global.window = {};
for (const archivo of ['catalog.js', 'physics.js', 'presets.js']) {
    vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'app', 'js', archivo), 'utf8'), { filename: archivo });
}
const M = window.MotorCalculo;
const E = window.EscenariosPredefinidos;

let fallidas = 0;
let total = 0;
function prueba(nombre, fn) {
    total++;
    try {
        fn();
        console.log(`  OK     ${nombre}`);
    } catch (e) {
        fallidas++;
        console.log(`  FALLA  ${nombre}\n         ${e.message}`);
    }
}
function cerca(real, esperado, tolerancia, etiqueta) {
    if (Math.abs(real - esperado) > tolerancia) {
        throw new Error(`${etiqueta}: se esperaba ${esperado} (±${tolerancia}) y se obtuvo ${real}`);
    }
}
function igual(real, esperado, etiqueta) {
    if (real !== esperado) throw new Error(`${etiqueta}: se esperaba ${JSON.stringify(esperado)} y se obtuvo ${JSON.stringify(real)}`);
}
function rama(datos) {
    return Object.assign({ nombre: 'Rama', longitud: 10, seccion: 2.5, automatico: 16, extension: { activa: false }, cargas: [] }, datos);
}
function carga(potencia, cantidad = 1, encendido = true) {
    return { nombre: `Equipo ${potencia} W`, potencia, cantidad, encendido };
}
function calcular(ramas, extra = {}) {
    return M.calcularInstalacion(Object.assign({ voltajeFuente: 220, automaticoGeneral: 32, limitesCaida: { advertencia: 3, peligro: 5 }, ramas }, extra));
}

console.log('\nCasos de prueba del plan (seccion 8)');

prueba('Caso A: rama simple de 2200 W coincide con el calculo a mano', () => {
    const r = calcular([rama({ cargas: [carga(2200)] })]).ramas[0];
    cerca(r.R_cable_rama, 0.1376, 1e-6, 'R_cable');
    cerca(r.R_cargas, 22.0, 1e-4, 'R_carga');
    cerca(r.I_rama, 9.9378, 1e-4, 'I_rama');
    cerca(r.deltaV_cable, 1.37, 0.01, 'dV');
    cerca(r.deltaV_porcentaje, 0.62, 0.01, 'dV%');
    cerca(r.V_carga, 218.63, 0.01, 'V_carga');
    cerca(r.P_perdida, 13.59, 0.01, 'P_perdida');
    cerca(r.P_carga, 2172.7, 0.5, 'P_carga');
    cerca(r.verificacionKVL, 220, 0.01, 'KVL');
});

prueba('Caso B: la corriente total es la suma de las ramas (1ra ley de Kirchhoff)', () => {
    const res = calcular([rama({ cargas: [carga(2200)] }), rama({ longitud: 1, seccion: 6, cargas: [carga(1100)] })]);
    cerca(res.ramas[0].I_rama, 9.94, 0.01, 'I_rama1');
    cerca(res.ramas[1].I_rama, 5.0, 0.01, 'I_rama2');
    cerca(res.totales.I_total, res.ramas[0].I_rama + res.ramas[1].I_rama, 2e-4, 'I_total');
});

prueba('Caso C: rama con todos los equipos apagados no da NaN ni corriente', () => {
    const r = calcular([rama({ cargas: [carga(2200, 1, false)] })]).ramas[0];
    igual(r.I_rama, 0, 'I_rama');
    igual(r.deltaV_cable, 0, 'dV');
    igual(r.V_carga, 220, 'V_carga');
    igual(r.P_perdida, 0, 'P_perdida');
    igual(r.estado, 'normal', 'estado');
});

console.log('\nLeyes de Kirchhoff y potencia');

prueba('Nodo de la rama: suma de corrientes de los equipos = I_rama (con cantidad > 1)', () => {
    const r = calcular([rama({ cargas: [carga(15, 6), carga(120), carga(1800, 1, false)] })]).ramas[0];
    cerca(r.sumaCorrientesEquipos, r.I_rama, 1e-3, 'KCL rama');
    igual(r.cargas.length, 3, 'equipos en el detalle');
    igual(r.cargas[2].corriente, 0, 'equipo apagado');
});

prueba('Balance de potencia: Vf · I_total = P_carga + P_perdida', () => {
    const res = calcular([rama({ cargas: [carga(2000), carga(1600)], extension: { activa: true, longitud: 10, seccion: 1.5 } })]);
    cerca(res.totales.P_total_fuente, res.totales.P_carga_total + res.totales.P_perdida_total, 0.05, 'potencias');
});

prueba('A mayor largo o menor seccion, mayor caida de voltaje y menor corriente', () => {
    const corto = calcular([rama({ longitud: 5, cargas: [carga(2000)] })]).ramas[0];
    const largo = calcular([rama({ longitud: 40, cargas: [carga(2000)] })]).ramas[0];
    const delgado = calcular([rama({ longitud: 40, seccion: 1.5, cargas: [carga(2000)] })]).ramas[0];
    if (!(largo.deltaV_porcentaje > corto.deltaV_porcentaje && delgado.deltaV_porcentaje > largo.deltaV_porcentaje)) throw new Error('la caida no crece con R');
    if (!(largo.I_rama < corto.I_rama)) throw new Error('la corriente no baja con R');
});

console.log('\nAlertas');

prueba('Corriente mayor que el automatico -> PELIGRO por disparo', () => {
    const r = calcular([rama({ seccion: 4, automatico: 10, cargas: [carga(2500)] })]).ramas[0];
    igual(r.estado, 'peligro', 'estado');
    igual(r.codigoEstado, 'SOBRECARGA_PROTECCION', 'codigo');
});

prueba('Automatico mayor que la ampacidad del cable -> PELIGRO aunque haya poca carga', () => {
    const r = calcular([rama({ seccion: 1.5, automatico: 16, cargas: [carga(100)] })]).ramas[0];
    igual(r.estado, 'peligro', 'estado');
    igual(r.problemas.some(p => p.codigo === 'PROTECCION_SOBREDIMENSIONADA'), true, 'detecta proteccion sobredimensionada');
});

prueba('Extension delgada sobrecargada -> PELIGRO por sobrecarga en la extension', () => {
    const r = calcular([rama({ extension: { activa: true, longitud: 5, seccion: 0.75 }, cargas: [carga(1800)] })]).ramas[0];
    igual(r.problemas.some(p => p.codigo === 'SOBRECARGA_EXTENSION'), true, 'detecta extension sobrecargada');
    igual(r.estado, 'peligro', 'estado');
});

prueba('Caida de voltaje entre 3 % y 5 % -> ADVERTENCIA; sobre 5 % -> PELIGRO', () => {
    // 90 m de 2,5 mm²: R_cable = 1,238 ohm, I ≈ 6,6 A, caida ≈ 3,7 %
    const adv = calcular([rama({ longitud: 90, seccion: 2.5, automatico: 16, cargas: [carga(1500)] })]).ramas[0];
    igual(adv.estado, 'advertencia', 'estado con caida elevada');
    igual(adv.codigoEstado, 'CAIDA_VOLTAJE_ELEVADA', 'codigo');
    // 150 m de 2,5 mm²: caida ≈ 6 %
    const pel = calcular([rama({ longitud: 150, seccion: 2.5, automatico: 16, cargas: [carga(1500)] })]).ramas[0];
    igual(pel.estado, 'peligro', 'estado con caida critica');
});

prueba('Corriente sobre el 80 % del limite -> ADVERTENCIA', () => {
    const r = calcular([rama({ longitud: 8, cargas: [carga(3000)] })]).ramas[0];
    igual(r.estado, 'advertencia', 'estado');
    igual(r.codigoEstado, 'CERCA_LIMITE_CORRIENTE', 'codigo');
});

prueba('El estado general de la instalacion considera las ramas, no solo el automatico general', () => {
    const res = calcular([rama({ seccion: 1.5, automatico: 10, cargas: [carga(2500)] })], { automaticoGeneral: 50 });
    igual(res.estadoGlobal.estadoTablero, 'normal', 'automatico general');
    igual(res.estadoGlobal.estado, 'peligro', 'estado de la instalacion');
});

prueba('Corriente total mayor que el automatico general -> alerta general', () => {
    const res = calcular([rama({ seccion: 4, automatico: 25, cargas: [carga(4000)] }), rama({ seccion: 4, automatico: 25, cargas: [carga(4000)] })], { automaticoGeneral: 32 });
    igual(res.estadoGlobal.estadoTablero, 'peligro', 'automatico general');
    igual(res.estadoGlobal.alertas[0].tipo, 'general', 'primera alerta');
});

console.log('\nEscenarios predefinidos');

const esperados = {
    'escenario-1': 'peligro',
    'escenario-2': 'peligro',
    'escenario-3': 'normal',
    'escenario-4': 'advertencia',
    'validacion-a': 'normal'
};
for (const esc of E.TODOS_ESCENARIOS) {
    prueba(`"${esc.nombre}" queda en ${esperados[esc.id].toUpperCase()}`, () => {
        const res = M.calcularInstalacion({ ...esc.parametros, ramas: esc.ramas });
        igual(res.estadoGlobal.estado, esperados[esc.id], 'estado de la instalacion');
        cerca(res.verificaciones.KCL_global, 0, 1e-3, 'KCL global');
        igual(res.verificaciones.KVL_todas_ok, true, 'KVL');
    });
}

prueba('Escenario 2: la extension de 0,75 mm² se detecta sobrecargada', () => {
    const esc = E.obtenerPorId('escenario-2');
    const r = M.calcularInstalacion({ ...esc.parametros, ramas: esc.ramas }).ramas[0];
    igual(r.problemas.some(p => p.codigo === 'SOBRECARGA_EXTENSION'), true, 'sobrecarga en extension');
    igual(r.problemas.some(p => p.codigo === 'CAIDA_VOLTAJE_CRITICA'), true, 'caida critica');
});

console.log(`\n${total - fallidas} de ${total} pruebas correctas.`);
process.exit(fallidas ? 1 : 0);
