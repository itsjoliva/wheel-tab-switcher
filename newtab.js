const DEF = globalThis.RUEDA_DEFECTO;

chrome.storage.local.get(DEF, (o) => {
  if (o.nuevaPestana === false) {
    // ponytail: el override del manifiesto no se puede quitar en tiempo de ejecución; se salta a la de Chrome.
    chrome.tabs.getCurrent((tab) => {
      if (tab) chrome.tabs.update(tab.id, { url: "chrome://new-tab-page" });
    });
    return;
  }
  document.body.classList.add("lista");
  pintarSitios();
});

document.querySelector("form").addEventListener("submit", (e) => {
  e.preventDefault();
  const text = document.querySelector("#q").value.trim();
  if (text) chrome.search.query({ text, disposition: "CURRENT_TAB" });
});

function pintarSitios() {
  chrome.topSites.get((sitios) => {
    const ul = document.querySelector("#sitios");
    for (const s of sitios.slice(0, 8)) {
      const a = document.createElement("a");
      a.href = s.url;
      const icono = document.createElement("span");
      icono.className = "icono";
      const img = document.createElement("img");
      img.alt = "";
      const favicon = new URL(chrome.runtime.getURL("/_favicon/"));
      favicon.searchParams.set("pageUrl", s.url);
      favicon.searchParams.set("size", "32");
      img.src = favicon.toString();
      icono.append(img);
      const nombre = document.createElement("span");
      nombre.className = "nombre";
      nombre.textContent = s.title || new URL(s.url).hostname;
      a.append(icono, nombre);
      const li = document.createElement("li");
      li.append(a);
      ul.append(li);
    }
  });
}
