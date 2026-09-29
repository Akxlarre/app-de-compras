# Decision Log — wikiflow

> Este índice actúa como el **Map of Decisions** solicitado. 
> Rastrea las decisiones arquitectónicas, de negocio y tecnológicas que han dado forma a la versión actual.

| ID | Fecha | Decisión | Estado | Impacto | Resumen |
|:---|:---|:---|:---|:---|:---|
| ADR-001 | 2026-04-18 | **Context Enrichment Guardrails** | ✅ Aceptada | Crítico | Se bloquea la generación de código hasta que el dominio y DB estén documentados. |
| ADR-002 | 2026-04-18 | **Bento Grid como Standard Layout** | ✅ Aceptada | Alto | Uso obligatorio de contenedores Bento para toda la UI administrativa para consistencia. |
| ADR-003 | 2026-04-19 | **Failure Memory System (Intelligence)** | 🏗️ En curso | Crítico | El agente debe aprender de errores de compilación y guardarlos en `ANTI-PATTERNS.md`. |
| ADR-004 | 2026-04-19 | **Decision Log Tracking (This file)** | ✅ Aceptada | Bajo | Creación de este índice para dar contexto evolutivo al agente en cada sesión. |
| ADR-005 | 2026-05-07 | **Non-Blocking Stop Hooks** | ✅ Aceptada | Medio | Los hooks de tipo Stop (Context Guardian, Sync Check) ahora salen con exit 0 para evitar loops infinitos en Claude Code. |

---

## Próximos pasos de mejora (Roadmap de Decisiones)
- [ ] Integrar el Decision Log con los hooks de commit.
- [ ] Automatizar la creación del `ADR-XXX.md` cuando se detecta un cambio mayor.
- [ ] Vincular decisiones con `context/learnings.md`.
