const assert = require("assert");
const { pasosDesdeDelta, siguienteIndice, ordenarPestanas } = require("./gesture.js");

// Ciclo: el último vuelve a la primera, y al revés.
assert.strictEqual(siguienteIndice(0, 3, 1, true), 1);
assert.strictEqual(siguienteIndice(2, 3, 1, true), 0);
assert.strictEqual(siguienteIndice(0, 3, -1, true), 2);

// Sin ciclo: se queda en el extremo.
assert.strictEqual(siguienteIndice(2, 3, 1, false), 2);
assert.strictEqual(siguienteIndice(0, 3, -1, false), 0);
assert.strictEqual(siguienteIndice(1, 5, 10, false), 4);

// Primer paso: avanza una posición desde la pestaña actual.
assert.strictEqual(siguienteIndice(1, 5, 1, true), 2);

// Una sola pestaña no se mueve.
assert.strictEqual(siguienteIndice(0, 1, 1, true), 0);

// Notch de línea (y de página): un evento, un paso. No toca el acumulado en px.
assert.deepStrictEqual(pasosDesdeDelta(40, 1, 1), { acumulado: 40, pasos: 1 });
assert.deepStrictEqual(pasosDesdeDelta(40, -3, 1), { acumulado: 40, pasos: -1 });
assert.deepStrictEqual(pasosDesdeDelta(0, 1, 2), { acumulado: 0, pasos: 1 });

// Trackpad: varios deltas pequeños suman un solo paso y guardan el resto.
let r = pasosDesdeDelta(0, 40, 0);
assert.strictEqual(r.pasos, 0);
r = pasosDesdeDelta(r.acumulado, 40, 0);
assert.strictEqual(r.pasos, 0);
r = pasosDesdeDelta(r.acumulado, 30, 0);
assert.deepStrictEqual(r, { acumulado: 10, pasos: 1 });

// Un flick grande puede ser más de un paso.
assert.deepStrictEqual(pasosDesdeDelta(0, 250, 0), { acumulado: 50, pasos: 2 });

// Hacia arriba el resto queda negativo, no se come un paso de más.
assert.deepStrictEqual(pasosDesdeDelta(0, -150, 0), { acumulado: -50, pasos: -1 });

// Un notch de ratón de 100 px es exactamente un paso.
assert.deepStrictEqual(pasosDesdeDelta(0, 100, 0), { acumulado: 0, pasos: 1 });
assert.deepStrictEqual(pasosDesdeDelta(0, -100, 0), { acumulado: 0, pasos: -1 });

// Sin movimiento no hay paso.
assert.deepStrictEqual(pasosDesdeDelta(20, 0, 0), { acumulado: 20, pasos: 0 });

const tabs = [
  { id: 1, index: 0, active: false },
  { id: 2, index: 1, active: true },
  { id: 3, index: 2, active: false },
];
assert.deepStrictEqual(ordenarPestanas(tabs, "posicion", []).map((t) => t.id), [1, 2, 3]);
assert.deepStrictEqual(ordenarPestanas(tabs, "reciente", []).map((t) => t.id), [2, 3, 1]);
assert.deepStrictEqual(ordenarPestanas(tabs, "reciente", [2]).map((t) => t.id), [2, 1, 3]);
assert.deepStrictEqual(ordenarPestanas(tabs, "reciente", [2, 3, 9]).map((t) => t.id), [2, 3, 1]);
assert.deepStrictEqual(tabs.map((t) => t.id), [1, 2, 3]);

console.log("ok");
