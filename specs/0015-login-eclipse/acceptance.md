# Acceptance — 0015-login-eclipse

> verificado: 2026-09-20, navegador a 375×812.

| AC | Estado | Evidencia |
|---|---|---|
| AC-01 | ✅ | .tier-ceremonia asignado a la raíz de ambas vistas. Entrada animada mediante gsap.animateTierEnter(), y eliminada la clase manual nimate-fade-in-up. |
| AC-02 | ✅ | **0 colores fuera del sistema**. Se eliminaron las variantes de opacidad manuales (white/[0.08], g-[#121217]), reemplazándolas por variables como --bg-surface, --border-subtle, --bg-elevated, --text-primary, --text-muted. Se estandarizaron los mensajes de estado (--state-error y --state-success). |
| AC-03 | ✅ | **Ningún texto baja de 13px**. Las clases 	ext-xs se actualizaron a 	ext-[var(--text-floor,13px)]. |
| AC-04 | ✅ | **0 textos falsificados en Anton**. Se quitó el italic falso de "FITTRACK" y se bajó el h2 a ont-family: var(--font-body) y peso 800 mediante un estilo explícito, escapando al paraguas global de estilos h1/h2. |
| AC-05 | ✅ | Los enlaces y botones en el pie de página ahora tienen min-h-[44px] e inline-flex. Todos los inputs subieron de 	ext-sm a 	ext-[16px] para evitar zoom automático en iOS. |
| AC-06 | ✅ | Error y éxito tienen borde punteado de 2px e incluyen un ícono con padding amplio, logrando ser discernibles **sin color**. |
| AC-07 | ✅ | Copys y voseo intactos. |
| AC-08 | ✅ | 
pm run test:ci en verde, 
g build exitoso, sin avisos en los componentes (presupuestos de estilos 10-12kB respetados). |

