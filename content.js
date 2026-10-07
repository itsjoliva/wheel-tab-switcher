(function () {
  if (globalThis.__ruedaPestanas) return;
  if (!globalThis.gestureApi) return;
  globalThis.__ruedaPestanas = true;

  const DEF = globalThis.RUEDA_DEFECTO || {
    orden: "posicion",
    invertirRueda: false,
    ciclo: true,
  };
  const { pasosDesdeDelta, siguienteIndice } = globalThis.gestureApi;

  let esPrincipal = false;
  try {
    esPrincipal = window === window.top;
  } catch (e) {
    esPrincipal = false;
  }

  // reposo | pulsado | activo | cancelado. El marco principal es el único dueño.
  let estado = "reposo";
  let botonDerecho = false;
  let acumulado = 0;
  let armedLocal = false;
  let armedRemoto = false;
  // En Windows el contextmenu llega después del mouseup: hay que recordar el trago.
  let tragarMenu = false;
  let olvido = 0;
  let wheelOn = false;

  let opciones = { ...DEF };
  let pestanas = null;
  let indice = 0;
  let cola = [];
  let soltarPendiente = false;
  let seq = 0;
  let pedidoActivo = false;
  let overlay = null;

  const OVERLAY_CSS = `
    .panel {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      box-sizing: border-box;
      width: min(420px, calc(100vw - 32px));
      max-height: 70vh;
      overflow: auto;
      margin: 0;
      padding: 6px;
      border-radius: 12px;
      border: 1px solid rgba(127, 127, 127, 0.35);
      background: #fff;
      color: #161616;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.28);
      font: 13px/1.35 system-ui, sans-serif;
      user-select: none;
      pointer-events: none;
    }
    @media (prefers-color-scheme: dark) {
      .panel {
        background: #1e1e1e;
        color: #f3f3f3;
        border-color: rgba(255, 255, 255, 0.12);
      }
    }
    ul { list-style: none; margin: 0; padding: 0; }
    li {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      border-radius: 8px;
    }
    li.sel { background: #e8f0fe; }
    @media (prefers-color-scheme: dark) {
      li.sel { background: #2d4a7a; }
    }
    .icono {
      width: 16px;
      height: 16px;
      flex: 0 0 16px;
      position: relative;
    }
    .icono img {
      width: 16px;
      height: 16px;
      display: block;
      position: relative;
      z-index: 1;
    }
    .letra {
      position: absolute;
      inset: 0;
      border-radius: 3px;
      background: #5f6368;
      color: #fff;
      font-size: 10px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .titulo {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }
  `;

  function reenviar(kind, e) {
    return chrome.runtime
      .sendMessage({
        type: "relay",
        kind,
        deltaY: e.deltaY || 0,
        deltaMode: e.deltaMode || 0,
        buttons: e.buttons || 0,
        ctrlKey: !!e.ctrlKey,
        metaKey: !!e.metaKey,
      })
      .then((res) => {
        if (res && res.armed) armedRemoto = true;
        return res;
      })
      .catch(() => null);
  }

  function avisarArmado(armed) {
    chrome.runtime.sendMessage({ type: "armar", armed: !!armed }).catch(() => {});
  }

  function marcarTragar() {
    tragarMenu = true;
    clearTimeout(olvido);
    olvido = setTimeout(() => {
      tragarMenu = false;
      armedLocal = false;
      armedRemoto = false;
    }, 500);
  }

  function olvidarTragar() {
    tragarMenu = false;
    clearTimeout(olvido);
  }

  function engancharRueda() {
    if (wheelOn) return;
    wheelOn = true;
    window.addEventListener("wheel", onWheel, { capture: true, passive: false });
  }

  function soltarRueda() {
    if (!wheelOn) return;
    wheelOn = false;
    window.removeEventListener("wheel", onWheel, true);
  }

  function cortarPedido() {
    seq += 1;
    pedidoActivo = false;
  }

  function ocultar() {
    if (!overlay) return;
    const { host } = overlay;
    try {
      if (host.matches(":popover-open")) host.hidePopover();
    } catch (e) {}
    host.classList.remove("rueda-fallback");
  }

  function limpiarLista() {
    pestanas = null;
    cola = [];
    indice = 0;
    if (overlay) overlay.ul.replaceChildren();
    ocultar();
  }

  function cancelar() {
    if (estado === "reposo" && !botonDerecho && !soltarPendiente) return;
    cortarPedido();
    soltarPendiente = false;
    estado = "reposo";
    botonDerecho = false;
    acumulado = 0;
    armedLocal = false;
    armedRemoto = false;
    olvidarTragar();
    soltarRueda();
    limpiarLista();
    avisarArmado(false);
  }

  function activar(tab) {
    if (!tab || typeof tab.id !== "number") return;
    chrome.runtime.sendMessage({ type: "activate", tabId: tab.id }).catch(() => {});
  }

  function alSoltar() {
    if (estado === "reposo") return;
    const activarAhora = estado === "activo";
    const tragar = estado === "activo" || estado === "cancelado";
    estado = "reposo";
    botonDerecho = false;
    soltarRueda();
    if (tragar) marcarTragar();
    if (!activarAhora) {
      cortarPedido();
      soltarPendiente = false;
      acumulado = 0;
      cola = [];
      limpiarLista();
      avisarArmado(false);
      return;
    }
    if (!pestanas) {
      soltarPendiente = true;
      avisarArmado(false);
      return;
    }
    const tab = pestanas[indice];
    acumulado = 0;
    cola = [];
    limpiarLista();
    avisarArmado(false);
    activar(tab);
  }

  function alEsc() {
    if (estado !== "activo") return;
    cortarPedido();
    soltarPendiente = false;
    acumulado = 0;
    cola = [];
    limpiarLista();
    estado = "cancelado";
  }

  function soltarIframe() {
    if (armedLocal || armedRemoto) marcarTragar();
    acumulado = 0;
    reenviar("up", { deltaY: 0, deltaMode: 0, buttons: 0 });
  }

  function drenar() {
    if (!pestanas || !pestanas.length) return;
    while (cola.length) {
      let pasos = cola.shift();
      if (opciones.invertirRueda) pasos = -pasos;
      indice = siguienteIndice(indice, pestanas.length, pasos, !!opciones.ciclo);
    }
  }

  function falloTabs() {
    soltarPendiente = false;
    cola = [];
    acumulado = 0;
    if (estado === "activo") estado = "pulsado";
    avisarArmado(false);
    limpiarLista();
  }

  function pedirPestanas() {
    if (pedidoActivo) return;
    pedidoActivo = true;
    const mio = seq;
    chrome.runtime
      .sendMessage({ type: "getTabs" })
      .then((res) => {
        if (mio !== seq) return;
        if (!res || !res.tabs || !res.tabs.length) {
          falloTabs();
          return;
        }
        if (estado !== "activo" && !soltarPendiente) return;
        pestanas = res.tabs;
        if (res.opciones) opciones = { ...DEF, ...res.opciones };
        indice = pestanas.findIndex((t) => t.active);
        if (indice < 0) indice = 0;
        drenar();
        if (soltarPendiente) {
          soltarPendiente = false;
          const tab = pestanas[indice];
          acumulado = 0;
          cola = [];
          limpiarLista();
          avisarArmado(false);
          activar(tab);
          return;
        }
        if (estado === "activo") pintar();
      })
      .catch(() => {
        if (mio !== seq) return;
        falloTabs();
      })
      .finally(() => {
        if (mio === seq) pedidoActivo = false;
      });
  }

  function aplicarRueda(deltaY, deltaMode) {
    if (estado === "cancelado") return;
    const r = pasosDesdeDelta(acumulado, deltaY, deltaMode);
    acumulado = r.acumulado;
    if (!r.pasos) return;
    if (estado === "reposo" || estado === "pulsado") {
      estado = "activo";
      avisarArmado(true);
      abrirVacio();
    }
    cola.push(r.pasos);
    if (!pestanas) pedirPestanas();
    else {
      drenar();
      pintar();
    }
  }

  function onWheel(e) {
    const apretado = ((e.buttons || 0) & 2) === 2;
    if (!apretado) {
      const seguir = botonDerecho || (esPrincipal && estado !== "reposo");
      botonDerecho = false;
      soltarRueda();
      if (!seguir) return;
      if (esPrincipal) alSoltar();
      else soltarIframe();
      return;
    }
    if (e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    e.stopPropagation();
    if (esPrincipal) {
      if (e.deltaY) aplicarRueda(e.deltaY, e.deltaMode);
      return;
    }
    if (e.deltaY) {
      const r = pasosDesdeDelta(acumulado, e.deltaY, e.deltaMode);
      acumulado = r.acumulado;
      if (r.pasos) armedLocal = true;
      reenviar("wheel", e);
    }
  }

  function asegurarOverlay() {
    if (overlay) return overlay;
    const padre = document.body || document.documentElement;
    if (!padre) return null;
    try {
      const host = document.createElement("div");
      host.id = "rueda-pestanas-host";
      if (typeof host.showPopover === "function") host.setAttribute("popover", "manual");
      const root = host.attachShadow({ mode: "closed" });
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(OVERLAY_CSS);
      root.adoptedStyleSheets = [sheet];
      const panel = document.createElement("div");
      panel.className = "panel";
      const ul = document.createElement("ul");
      ul.setAttribute("role", "listbox");
      ul.setAttribute("aria-label", "Pestañas");
      panel.append(ul);
      root.append(panel);
      padre.append(host);
      overlay = { host, panel, ul };
      return overlay;
    } catch (e) {
      return null;
    }
  }

  function mostrar(host) {
    if (host.matches(":popover-open")) return;
    try {
      if (typeof host.showPopover === "function" && host.hasAttribute("popover")) {
        host.showPopover();
        return;
      }
    } catch (e) {}
    host.classList.add("rueda-fallback");
  }

  function inicial(url, title) {
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      if (host) return host.charAt(0).toUpperCase();
    } catch (e) {}
    const ch = (title || "?").trim().charAt(0);
    return (ch || "?").toUpperCase();
  }

  function iconoDe(tab) {
    const box = document.createElement("span");
    box.className = "icono";
    const letra = document.createElement("span");
    letra.className = "letra";
    letra.textContent = inicial(tab.url, tab.title);
    box.append(letra);
    if (tab.url && /^https?:/i.test(tab.url)) {
      const img = document.createElement("img");
      img.alt = "";
      img.addEventListener("load", () => {
        letra.hidden = true;
      });
      img.addEventListener("error", () => img.remove());
      const favicon = new URL(chrome.runtime.getURL("/_favicon/"));
      favicon.searchParams.set("pageUrl", tab.url);
      favicon.searchParams.set("size", "32");
      img.src = favicon.toString();
      box.append(img);
    }
    return box;
  }

  function centrar(panel, li) {
    const pr = panel.getBoundingClientRect();
    const lr = li.getBoundingClientRect();
    if (!pr.height || !lr.height) return;
    panel.scrollTop += lr.top - pr.top - (pr.height - lr.height) / 2;
  }

  function pintar() {
    if (!pestanas || estado !== "activo") return;
    const ui = asegurarOverlay();
    if (!ui) return;
    ui.ul.replaceChildren();
    let sel = null;
    for (let i = 0; i < pestanas.length; i++) {
      const tab = pestanas[i];
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      if (i === indice) {
        li.className = "sel";
        li.setAttribute("aria-selected", "true");
        sel = li;
      } else {
        li.setAttribute("aria-selected", "false");
      }
      const titulo = document.createElement("span");
      titulo.className = "titulo";
      titulo.textContent = tab.title || tab.url || "(sin título)";
      li.append(iconoDe(tab), titulo);
      ui.ul.append(li);
    }
    mostrar(ui.host);
    if (sel) centrar(ui.panel, sel);
  }

  function abrirVacio() {
    const ui = asegurarOverlay();
    if (!ui) return;
    if (!ui.ul.childElementCount) {
      const li = document.createElement("li");
      li.textContent = "…";
      ui.ul.append(li);
    }
    mostrar(ui.host);
  }

  function alMover(e) {
    const derecho = ((e.buttons || 0) & 2) === 2;
    if (derecho && !botonDerecho) {
      botonDerecho = true;
      engancharRueda();
      if (esPrincipal) {
        if (estado === "reposo") estado = "pulsado";
      } else {
        reenviar("ping", e);
      }
      return;
    }
    if (!derecho && botonDerecho) {
      botonDerecho = false;
      soltarRueda();
      if (esPrincipal) alSoltar();
      else soltarIframe();
    }
  }

  window.addEventListener("mousedown", (e) => {
    if (e.button !== 2) return;
    olvidarTragar();
    botonDerecho = true;
    engancharRueda();
    if (esPrincipal) {
      if (estado !== "activo" && estado !== "cancelado") avisarArmado(false);
      if (estado === "reposo") estado = "pulsado";
      return;
    }
    acumulado = 0;
    armedLocal = false;
    armedRemoto = false;
    reenviar("down", e);
  }, true);

  window.addEventListener("mouseup", (e) => {
    if (e.button !== 2) return;
    const participa = botonDerecho || armedLocal || armedRemoto;
    botonDerecho = false;
    soltarRueda();
    if (esPrincipal) {
      alSoltar();
      return;
    }
    if (participa) soltarIframe();
  }, true);

  window.addEventListener("mousemove", alMover, true);
  window.addEventListener("mouseover", alMover, true);

  window.addEventListener("contextmenu", (e) => {
    const tragar =
      tragarMenu ||
      armedLocal ||
      armedRemoto ||
      estado === "activo" ||
      estado === "cancelado";
    if (tragar) {
      e.preventDefault();
      e.stopPropagation();
    }
    tragarMenu = false;
    armedLocal = false;
    armedRemoto = false;
    clearTimeout(olvido);
  }, true);

  window.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (esPrincipal) {
      if (estado !== "activo") return;
      e.preventDefault();
      e.stopPropagation();
      alEsc();
      return;
    }
    if (!(armedLocal || armedRemoto || botonDerecho)) return;
    if (armedLocal || armedRemoto) {
      e.preventDefault();
      e.stopPropagation();
    }
    reenviar("esc", e);
  }, true);

  if (esPrincipal) {
    chrome.storage.local.get(DEF, (o) => {
      opciones = { ...DEF, ...o };
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      for (const [k, v] of Object.entries(changes)) {
        if (Object.prototype.hasOwnProperty.call(DEF, k)) opciones[k] = v.newValue;
      }
    });
    chrome.runtime.onMessage.addListener((msg) => {
      if (!msg || msg.type !== "relay") return;
      if (msg.kind === "down" || msg.kind === "ping") {
        botonDerecho = true;
        engancharRueda();
        if (estado === "reposo") estado = "pulsado";
        return;
      }
      if (msg.kind === "wheel") {
        if (msg.ctrlKey || msg.metaKey || !msg.deltaY) return;
        aplicarRueda(msg.deltaY, msg.deltaMode);
        return;
      }
      if (msg.kind === "up") {
        botonDerecho = false;
        soltarRueda();
        alSoltar();
        return;
      }
      if (msg.kind === "esc") alEsc();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") cancelar();
    }, true);
    // blur también salta cuando el foco entra en un iframe. Solo cancela si la ventana de Chrome lo perdió.
    window.addEventListener("blur", () => {
      if (estado === "reposo") return;
      chrome.runtime.sendMessage({ type: "ventanaEnfocada" }, (res) => {
        if (chrome.runtime.lastError) return;
        if (res && res.enfocada === false) cancelar();
      });
    }, true);
    window.addEventListener("pagehide", () => cancelar(), true);
  }
})();
