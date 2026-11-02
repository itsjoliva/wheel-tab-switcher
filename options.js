const DEF = globalThis.RUEDA_DEFECTO;
const invertir = document.querySelector("#invertir");
const ciclo = document.querySelector("#ciclo");
const nuevaPestana = document.querySelector("#nuevaPestana");
const estado = document.querySelector("#estado");
let ocultar = 0;

chrome.storage.local.get(DEF, (o) => {
  const orden = o.orden === "reciente" ? "reciente" : "posicion";
  document.querySelector(`input[name="orden"][value="${orden}"]`).checked = true;
  invertir.checked = !!o.invertirRueda;
  ciclo.checked = o.ciclo !== false;
  nuevaPestana.checked = o.nuevaPestana !== false;
});

function guardar() {
  const orden = document.querySelector('input[name="orden"]:checked');
  chrome.storage.local.set({
    orden: orden && orden.value === "reciente" ? "reciente" : "posicion",
    invertirRueda: invertir.checked,
    ciclo: ciclo.checked,
    nuevaPestana: nuevaPestana.checked,
  }, () => {
    estado.textContent = "Guardado";
    estado.classList.add("visible");
    clearTimeout(ocultar);
    ocultar = setTimeout(() => estado.classList.remove("visible"), 1500);
  });
}

document.querySelector("main").addEventListener("change", guardar);
