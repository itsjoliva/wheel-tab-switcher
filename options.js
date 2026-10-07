const DEF = globalThis.RUEDA_DEFECTO;
const orden = document.querySelector("#orden");
const invertir = document.querySelector("#invertir");
const ciclo = document.querySelector("#ciclo");

chrome.storage.local.get(DEF, (o) => {
  orden.value = o.orden === "reciente" ? "reciente" : "posicion";
  invertir.checked = !!o.invertirRueda;
  ciclo.checked = o.ciclo !== false;
});

function guardar() {
  chrome.storage.local.set({
    orden: orden.value === "reciente" ? "reciente" : "posicion",
    invertirRueda: invertir.checked,
    ciclo: ciclo.checked,
  });
}

orden.addEventListener("change", guardar);
invertir.addEventListener("change", guardar);
ciclo.addEventListener("change", guardar);
