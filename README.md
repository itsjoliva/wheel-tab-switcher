# Rueda de pestañas

Extensión de Chrome (Manifest V3) para cambiar de pestaña manteniendo el clic derecho y girando la rueda, al estilo de Vivaldi. Pensada para Windows y para cargarse sin empaquetar.

## Cargar

1. Abrir `chrome://extensions`.
2. Activar **Modo de desarrollador**.
3. **Cargar descomprimida** y elegir esta carpeta.
4. Al instalarse, la extensión intenta inyectarse en las pestañas ya abiertas. Si alguna no responde, recárgala.

El icono de la barra abre las opciones.

## Uso

Mantener el clic derecho y mover la rueda. La lista aparece en el primer paso y la selección se mueve con la rueda. Soltar activa la pestaña resaltada y no abre el menú contextual. Soltar sin haber movido la rueda abre el menú normal. Esc cierra la lista sin cambiar de pestaña.

La rueda con Ctrl o Meta (zoom) no cuenta como gesto.

Opciones: orden por posición en la barra o por uso reciente, invertir la dirección y ciclo continuo. El tema claro u oscuro sigue al sistema.

El orden reciente se guarda en la sesión del navegador: sobrevive a que el service worker se duerma, y se pierde al cerrar Chrome (los id de pestaña ya no valen) o al recargar la extensión.

## Dónde no arranca el gesto

En `chrome://`, la Chrome Web Store, la página de nueva pestaña y el visor PDF. Esas pestañas sí salen en la lista y se pueden activar desde otra página. Tampoco funciona sobre la barra de pestañas del navegador, solo sobre el contenido. En `file://` hay que permitir el acceso a archivos en los detalles de la extensión.

## Comprobar

- [ ] El gesto funciona en sitios comunes (Google, YouTube, GitHub, Azure DevOps, M365).
- [ ] El menú contextual sigue apareciendo si no se mueve la rueda.
- [ ] La página no se desplaza durante el gesto.
- [ ] Funciona con el cursor sobre un iframe.
- [ ] Con una pestaña no cambia; con muchas, la lista hace scroll y deja ver la selección.
- [ ] Una pestaña descartada o suspendida se activa al soltar.
- [ ] Esc y perder la ventana durante el gesto no dejan el estado pillado.
- [ ] Con CSP estricta la lista se ve; si el icono falla, aparece la inicial del dominio.
- [ ] El orden reciente aguanta el reinicio del service worker y se olvida al cerrar el navegador.
