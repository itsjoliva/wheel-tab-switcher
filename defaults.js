// Única copia de las opciones. La leen el service worker, el content script y la página de opciones.
(function (root) {
  const RUEDA_DEFECTO = {
    orden: "posicion",
    invertirRueda: false,
    ciclo: true,
  };
  root.RUEDA_DEFECTO = RUEDA_DEFECTO;
  if (typeof module !== "undefined" && module.exports) module.exports = RUEDA_DEFECTO;
})(typeof globalThis !== "undefined" ? globalThis : this);
