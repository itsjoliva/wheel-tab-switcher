importScripts("defaults.js", "gesture.js");

const OPCIONES_DEFECTO = globalThis.RUEDA_DEFECTO;
const { ordenarPestanas } = globalThis.gestureApi;

// Gesto armado por pestaña, para que un iframe pueda tragarse el menú sin esperar al marco principal.
const armado = new Map();
let colaMru = Promise.resolve();

function tocarMru(fn) {
  colaMru = colaMru.then(fn).catch(() => {});
}

function ponerAlFrente(windowId, tabId) {
  tocarMru(async () => {
    const data = await chrome.storage.session.get("mru");
    const mru = data.mru || {};
    const key = String(windowId);
    const prev = Array.isArray(mru[key]) ? mru[key] : [];
    // ponytail: 500 ids por ventana; se caen los más viejos. Una sesión normal no llega.
    mru[key] = [tabId, ...prev.filter((id) => id !== tabId)].slice(0, 500);
    await chrome.storage.session.set({ mru });
  });
}

function quitarDeMru(tabId, windowId) {
  tocarMru(async () => {
    const data = await chrome.storage.session.get("mru");
    const mru = data.mru || {};
    const keys = windowId == null ? Object.keys(mru) : [String(windowId)];
    let cambio = false;
    for (const key of keys) {
      if (!Array.isArray(mru[key])) continue;
      const next = mru[key].filter((id) => id !== tabId);
      if (next.length !== mru[key].length) {
        mru[key] = next;
        cambio = true;
      }
    }
    if (cambio) await chrome.storage.session.set({ mru });
  });
}

chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  ponerAlFrente(windowId, tabId);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  armado.delete(tabId);
  quitarDeMru(tabId);
});

chrome.tabs.onDetached.addListener((tabId, info) => {
  quitarDeMru(tabId, info.oldWindowId);
});

chrome.windows.onRemoved.addListener((windowId) => {
  tocarMru(async () => {
    const data = await chrome.storage.session.get("mru");
    const mru = data.mru || {};
    const key = String(windowId);
    if (!mru[key]) return;
    delete mru[key];
    await chrome.storage.session.set({ mru });
  });
});

function inyectarAbiertas() {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id == null) continue;
      const target = { tabId: tab.id, allFrames: true };
      chrome.scripting
        .executeScript({ target, files: ["gesture.js", "defaults.js", "content.js"] })
        .catch(() => {});
      chrome.scripting.insertCSS({ target, files: ["host.css"] }).catch(() => {});
    }
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(OPCIONES_DEFECTO, (cur) => {
    chrome.storage.local.set({ ...OPCIONES_DEFECTO, ...cur });
  });
  inyectarAbiertas();
});

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

async function responderPestanas(windowId) {
  const [tabs, stored, session] = await Promise.all([
    chrome.tabs.query({ windowId }),
    chrome.storage.local.get(OPCIONES_DEFECTO),
    chrome.storage.session.get("mru"),
  ]);
  // La ventana es la del mensaje: currentWindow en el service worker es otra cosa.
  const opciones = { ...OPCIONES_DEFECTO, ...stored };
  const mru = (session.mru || {})[String(windowId)] || [];
  const ordenadas = ordenarPestanas(tabs, opciones.orden, mru);
  return {
    opciones,
    tabs: ordenadas.map((t) => ({
      id: t.id,
      title: t.title || "",
      url: t.url || "",
      active: !!t.active,
    })),
  };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !sender.tab || sender.tab.id == null) return;
  const tabId = sender.tab.id;

  if (msg.type === "armar") {
    if (msg.armed) armado.set(tabId, true);
    else armado.delete(tabId);
    sendResponse({ ok: true });
    return;
  }

  if (msg.type === "ventanaEnfocada") {
    chrome.windows.get(sender.tab.windowId, (win) => {
      const err = chrome.runtime.lastError;
      // Si la consulta falla, no cancelar: un fallo no es "la ventana perdió el foco".
      sendResponse({ enfocada: err ? true : !!(win && win.focused) });
    });
    return true;
  }

  if (msg.type === "relay") {
    // Un mousedown nuevo borra un "armado" colgado de una página anterior. "ping" solo pregunta.
    if (msg.kind === "down") armado.delete(tabId);
    if (sender.frameId !== 0) {
      chrome.tabs.sendMessage(tabId, msg, { frameId: 0 }, () => {
        void chrome.runtime.lastError;
      });
    }
    sendResponse({ armed: armado.get(tabId) === true });
    return;
  }

  if (msg.type === "getTabs") {
    responderPestanas(sender.tab.windowId)
      .then(sendResponse)
      .catch(() => sendResponse({ tabs: [], opciones: OPCIONES_DEFECTO }));
    return true;
  }

  if (msg.type === "activate" && typeof msg.tabId === "number") {
    chrome.tabs.update(msg.tabId, { active: true }, () => {
      void chrome.runtime.lastError;
    });
    sendResponse({ ok: true });
  }
});
