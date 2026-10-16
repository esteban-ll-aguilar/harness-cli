/**
 * Curated default rule packs seeded by `harness init` and retrofitted with
 * `harness rules preset <name>`.
 *
 * These generalize the kind of behavioral rules a senior engineer enforces
 * by default — data modeling discipline, propose-before-build UI/UX, reuse
 * before duplication, real verification, security/performance baselines and
 * honesty about what was actually checked. They are merged into `.harnessrc`
 * (`rules` array) and synced into AGENTS.md exactly like a manually added
 * rule (`harness rules add`) — the Guardian (`harness review`) enforces them
 * the same way.
 *
 * Each entry: id (stable, used for de-dup), title (the rule itself, shown to
 * every agent), severity (must/should), tag (category) and rationale (the
 * "why", written into the rule's brain/rules/<id>.md file).
 */

const SENIOR = [
    {
        id: 'db-normalizacion-catalogo-vs-empresa',
        severity: 'must',
        tag: 'data-modeling',
        title: 'Verificar buena normalización en BD antes de modelar: separar entidades de catálogo (compartidas/globales) de entidades por-empresa/tenant; nunca mezclar metadata en la entidad equivocada. Si el esquema cambia, documentarlo en un ADR.',
        rationale: 'Mezclar metadata de catálogo con metadata específica de una empresa/tenant rompe el aislamiento multi-tenant y obliga a migraciones destructivas más adelante. Normalizar primero (1NF/2NF/3NF como base) y decidir explícitamente quién es dueño de cada entidad (catálogo compartido vs. por-empresa) antes de escribir la primera migración es mucho más barato que corregirlo después con datos en producción.'
    },
    {
        id: 'proponer-diseno-antes-de-construir-pagina',
        severity: 'must',
        tag: 'ui-ux',
        title: 'Antes de construir cualquier página o vista nueva, PROPONER el diseño (layout, filtros, paginación, búsqueda, ordenamiento, estados vacío/carga/error) y esperar validación antes de codificar. No asumir requisitos de UI/UX.',
        rationale: 'Construir la UI antes de acordar filtros/paginación/búsqueda/estados provoca retrabajo completo cuando el usuario esperaba algo distinto. Una propuesta corta (aunque sean 5 bullets) cuesta segundos y evita reescribir una pantalla entera.'
    },
    {
        id: 'verificar-funcionalidad-end-to-end',
        severity: 'must',
        tag: 'verification',
        title: 'Antes de marcar cualquier feature como terminada, verificar que TODO funcione de verdad: filtros, paginación, búsqueda, ordenamiento y acciones (crear/editar/eliminar) deben probarse (manualmente o con tests), nunca asumirse solo por leer el código.',
        rationale: '"Se ve correcto" y "funciona" son afirmaciones distintas. La constitución del proyecto exige tests reales y gates sin trampas (no fake gates); el mismo estándar aplica al comportamiento de UI que un humano realmente va a usar con el mouse y el teclado.'
    },
    {
        id: 'buscar-reutilizar-antes-de-crear',
        severity: 'must',
        tag: 'reuse',
        title: 'Antes de crear un componente, función, hook, tipo, endpoint o patrón nuevo, buscar si ya existe algo similar en el proyecto (grep / `harness memory search`) y reutilizar o extender en vez de duplicar.',
        rationale: 'Un código base lleno de helpers casi-duplicados que fueron divergiendo con el tiempo es síntoma de haberse saltado esta búsqueda, no una preferencia de estilo. Reutilizar mantiene una sola fuente de verdad para cada comportamiento.'
    },
    {
        id: 'seguir-convenciones-existentes',
        severity: 'must',
        tag: 'consistency',
        title: 'Seguir las convenciones de nombres, estructura de carpetas y patrones arquitectónicos YA presentes en el proyecto, aunque no sean las preferidas del agente. Si se propone cambiar una convención, documentarlo en un ADR antes de aplicarlo.',
        rationale: 'La consistencia dentro de un proyecto vale más que la preferencia individual del agente en turno: reduce la carga cognitiva de quien lee el código después y evita que el estilo derive turno a turno.'
    },
    {
        id: 'proponer-plan-antes-de-cambios-grandes',
        severity: 'must',
        tag: 'process',
        title: 'Para cualquier cambio que toque más de un módulo, la base de datos o la arquitectura, proponer un plan breve (qué se va a tocar, por qué, riesgos) antes de empezar a escribir código.',
        rationale: 'Un plan de un párrafo permite detectar un malentendido de alcance en 30 segundos; descubrirlo después de escribir 500 líneas cuesta mucho más.'
    },
    {
        id: 'no-inventar-alcance',
        severity: 'must',
        tag: 'process',
        title: 'No improvisar alcance fuera de lo pedido o de la spec/interview aprobada. Si aparece una ambigüedad o un requisito faltante, preguntar o dejarlo explícito como asunción documentada — nunca decidirlo en silencio.',
        rationale: 'El flujo Interviewer → Architect existe justamente para capturar el alcance real antes de codificar. Rellenar huecos en silencio con la mejor suposición del agente reintroduce la ambigüedad que la entrevista se propuso eliminar.'
    },
    {
        id: 'documentar-decisiones-y-aprendizajes',
        severity: 'should',
        tag: 'knowledge',
        title: 'Registrar decisiones técnicas relevantes como ADR y anotar en memory/session-logs los aprendizajes o gotchas descubiertos durante la tarea, para que el siguiente agente (o el mismo agente en otra sesión) no repita la misma investigación.',
        rationale: 'La memoria del harness (brain/ + memory/) solo es útil si se alimenta activamente. Un hallazgo no escrito se pierde en cuanto termina la sesión y el próximo agente vuelve a pagar el costo de descubrirlo.'
    },
    {
        id: 'trazabilidad-sdd-bdd-tdd',
        severity: 'must',
        tag: 'quality',
        title: 'Cada requisito normativo REQ-* debe tener al menos un scenario BDD @covers y un test TDD @covers antes de declarar la feature lista. No marcar una etapa como completa si la trazabilidad muestra huecos.',
        rationale: 'La trazabilidad evita que una specification bonita, un archivo Gherkin y pruebas aisladas aparenten calidad sin demostrar que verifican el mismo comportamiento.'
    },
    {
        id: 'memoria-con-procedencia-y-un-escritor',
        severity: 'must',
        tag: 'memory',
        title: 'Los agentes deben enviar observaciones con fuente y evidencia a memory/inbox; solo Memory Steward promueve memoria durable. Nunca sobrescribir decisiones o patrones compartidos directamente desde un subagente.',
        rationale: 'Un único escritor para memoria durable evita colisiones y contaminación entre agentes, mientras el inbox append-only conserva evidencia y permite auditoría.'
    },
    {
        id: 'contexto-acotado-y-relevante',
        severity: 'must',
        tag: 'context',
        title: 'Antes de trabajar, cargar contexto con presupuesto y recibo; no pegar documentos completos ni historial ilimitado al prompt. Investigar solo la memoria relevante para el objetivo y reportar incertidumbre.',
        rationale: 'Más contexto no equivale a mejor razonamiento. El contexto no relevante degrada atención, cuesta tokens y aumenta el riesgo de que un agente siga instrucciones obsoletas.'
    },
    {
        id: 'validar-boundary-y-manejar-errores',
        severity: 'must',
        tag: 'security',
        title: 'Validar todo input en el boundary (API, formulario, CLI) y manejar explícitamente los casos de error/fallo — nunca asumir solo el camino feliz. Los mensajes de error deben ser accionables para quien los recibe.',
        rationale: 'La mayoría de bugs de seguridad y de UX rota nacen en el boundary: datos no validados que llegan al dominio, o errores silenciados que dejan al usuario sin saber qué pasó.'
    },
    {
        id: 'rendimiento-consultas-y-listados',
        severity: 'must',
        tag: 'performance',
        title: 'Evitar N+1 queries (usar eager loading o DataLoader), indexar las foreign keys usadas en filtros, y paginar SIEMPRE los listados que puedan superar ~50-100 items.',
        rationale: 'Estos son los tres problemas de performance más comunes y más baratos de prevenir desde el diseño; corregirlos después de que un listado ya tiene datos reales en producción es mucho más costoso.'
    },
    {
        id: 'honestidad-sobre-estado-real',
        severity: 'must',
        tag: 'honesty',
        title: 'Nunca reportar una tarea como completada, testeada o funcionando si no se verificó de verdad. Si algo no se pudo probar (falta de entorno, dependencia, credenciales, etc.), decirlo explícitamente en vez de asumir que funciona.',
        rationale: 'Un "listo ✅" falso es peor que no reportar nada: genera confianza en algo roto. Decir "no pude verificar X porque Y" mantiene la confianza del sistema y le da al humano la información real que necesita para decidir.'
    },
    {
        id: 'revision-propia-antes-de-entregar',
        severity: 'should',
        tag: 'code-review',
        title: 'Antes de entregar código, hacer una auto-revisión: ¿hay lógica duplicada?, ¿hay código muerto?, ¿los nombres son claros?, ¿falta manejo de un caso borde evidente? Corregir lo encontrado antes de pedir revisión humana.',
        rationale: 'Una pasada de auto-revisión de un minuto atrapa una fracción importante de los comentarios que un revisor humano haría de todas formas, y libera ese tiempo humano para problemas que sí requieren su juicio.'
    },
    {
        id: 'estados-ui-y-accesibilidad-basica',
        severity: 'should',
        tag: 'ui-ux',
        title: 'Toda pantalla debe manejar explícitamente sus estados (carga, vacío, error, éxito) y cumplir accesibilidad básica (labels, contraste suficiente, navegación por teclado).',
        rationale: 'Los estados no-felices (vacío/error/carga) son los que más se olvidan y los que más frustran a un usuario real; la accesibilidad básica es barata de incluir desde el inicio y muy cara de agregar después.'
    }
];

const PRESETS = {
    senior: SENIOR
};

module.exports = { PRESETS };
