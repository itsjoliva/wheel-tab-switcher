// Lógica pura del gesto. Sin APIs de Chrome: content.js y node la comparten.
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.gestureApi = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  // Un notch de ratón en Windows suele ser ~100 px (deltaMode 0).
  const PASO_PX = 100;

  function pasosDesdeDelta(acumulado, deltaY, deltaMode) {
    if (!deltaY || !isFinite(deltaY)) return { acumulado, pasos: 0 };
    // Línea o página: un evento es un paso. No se mezcla con el resto en px.
    if (deltaMode === 1 || deltaMode === 2) {
      return { acumulado, pasos: Math.sign(deltaY) };
    }
    let acc = acumulado + deltaY;
    const pasos = Math.trunc(acc / PASO_PX);
    acc -= pasos * PASO_PX;
    return { acumulado: acc, pasos };
  }

  function siguienteIndice(indice, total, pasos, ciclo) {
    if (!total || total <= 0) return 0;
    if (!pasos) return indice;
    if (ciclo) return ((indice + pasos) % total + total) % total;
    const next = indice + pasos;
    if (next < 0) return 0;
    if (next >= total) return total - 1;
    return next;
  }

  // orden "posicion": barra. "reciente": MRU (más reciente primero) y el resto por índice.
  // Sin historial, la activa queda primera y sigue el resto de la barra, dando la vuelta.
  function ordenarPestanas(tabs, orden, mruIds) {
    const lista = Array.isArray(tabs) ? tabs : [];
    if (orden === "reciente" && mruIds && mruIds.length) {
      const byId = new Map(lista.map((t) => [t.id, t]));
      const ordered = [];
      for (const id of mruIds) {
        const t = byId.get(id);
        if (!t) continue;
        ordered.push(t);
        byId.delete(id);
      }
      const rest = [...byId.values()].sort((a, b) => a.index - b.index);
      return ordered.concat(rest);
    }
    const sorted = [...lista].sort((a, b) => a.index - b.index);
    if (orden !== "reciente") return sorted;
    const i = Math.max(0, sorted.findIndex((t) => t.active));
    return sorted.slice(i).concat(sorted.slice(0, i));
  }

  return { pasosDesdeDelta, siguienteIndice, ordenarPestanas, PASO_PX };
});
