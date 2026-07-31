# ADR-ERS-001 — Editorial Research Studio

Estado: **HISTÓRICO — sustituido como autoridad por `docs/architecture/`**

Fecha: **2026-07-06**

Ámbito: arquitectura conceptual, límites de dominio y reglas de evolución del Editorial Research Studio de JANO.

> Autoridad vigente: [`docs/architecture/README.md`](./architecture/README.md) y sus documentos vinculados son la North Star para nueva implementación. Este ADR se conserva como registro histórico de decisiones anteriores; las contradicciones de dominio están registradas en [`01-domain-overview.md`](./architecture/01-domain-overview.md).

Los términos **DEBE**, **NO DEBE**, **SIEMPRE** y **NUNCA** son vinculantes.

---

## 1. Propósito

El Editorial Research Studio existe para convertir investigación documental en conocimiento histórico riguroso, trazable, revisable y publicable dentro de JANO.

El sistema resuelve el cuello de botella editorial anterior a la creación de una entidad:

- reunir y comprender fuentes;
- conservar evidencia localizable;
- distinguir hallazgos de conocimiento aceptado;
- formular hipótesis y relaciones;
- convertir decisiones editoriales en borradores;
- publicar sin perder procedencia, incertidumbre ni responsabilidad humana.

Un CMS tradicional no es suficiente porque presupone que el conocimiento ya está definido y que el trabajo consiste en rellenar campos. JANO parte de la condición contraria: antes de existir como entidad, el conocimiento es incompleto, discutible, contextual y dependiente de fuentes.

El Editorial Research Studio NO es:

- un segundo Admin;
- un importador masivo de entidades;
- un generador automático de artículos;
- un gestor de documentos aislado;
- una visualización decorativa del grafo;
- un agente autónomo;
- un sustituto del criterio historiográfico.

El Editorial Research Studio extiende el Editorial Desk existente y conduce al mismo dominio canónico de entidades, relaciones, fuentes, media y publicación que utiliza el flujo clásico.

---

## 2. Filosofía

El conocimiento no nace como entidad. Nace como una interpretación humana respaldada por fuentes.

El flujo normativo es:

```text
Fuentes
  ↓
Evidencias
  ↓
Hallazgos
  ↓
Decisiones editoriales
  ↓
Hipótesis y relaciones de trabajo
  ↓
Borradores
  ↓
Entidades y relaciones canónicas
  ↓
Publicación
```

Cada transición reduce incertidumbre y aumenta responsabilidad editorial.

### 2.1 Fuentes antes que afirmaciones

Toda investigación comienza con materiales identificables. Un resultado automático sin fuente no constituye conocimiento de JANO.

### 2.2 Evidencia antes que estructura

La evidencia es un pasaje localizable dentro de una versión concreta de una fuente. Una nota de María interpreta la evidencia, pero no la reemplaza. El sistema conserva ambas y nunca las confunde.

### 2.3 Hallazgo no equivale a entidad

Un hallazgo es una propuesta privada y provisional. Puede representar una mención incidental, una variante, un homónimo, una hipótesis o una entidad potencial. No forma parte del dominio canónico y no entra en el Canvas por haber sido detectado.

### 2.4 La decisión editorial crea compromiso

Solo una acción explícita de María incorpora un hallazgo al trabajo activo, lo vincula a una entidad existente, lo convierte en borrador o acepta una relación.

### 2.5 El Canvas representa decisiones, no detecciones

El Canvas es la proyección visual del conocimiento activo de un proyecto. Contiene aquello que María ha decidido investigar, conectar, redactar o publicar. No representa la totalidad del material extraído.

### 2.6 El documento conserva la narración

El grafo expresa estructura y relación. El editor expresa secuencia, argumento, voz, matiz y lectura. Ninguno sustituye al otro.

### 2.7 La publicación establece conocimiento canónico

La publicación es una frontera explícita. Antes de ella existen propuestas, hipótesis y borradores. Después de ella existe conocimiento público de JANO. La frontera solo se cruza mediante una decisión humana validada por el servicio canónico de publicación.

### 2.8 La incertidumbre forma parte del conocimiento

Las contradicciones, atribuciones discutidas, periodizaciones alternativas y lagunas no son errores que el sistema deba ocultar. JANO las conserva, las explica y permite expresarlas editorialmente.

---

## 3. Principios innegociables

1. **La IA nunca publica.** Ningún proceso automático tiene autoridad para cambiar contenido público.
2. **María siempre decide.** Crear una entidad, aceptar una relación, resolver una coincidencia, incorporar una propuesta y publicar requieren una acción humana explícita.
3. **La IA siempre propone.** Toda salida automática permanece separada del dominio canónico hasta ser aceptada.
4. **Toda propuesta automática conserva procedencia.** Debe conocerse fuente, pasaje, ejecución, proveedor y versión de origen.
5. **Toda evidencia es localizable.** Debe abrir su fuente y posición original.
6. **Una nota no es evidencia.** Interpretación y pasaje documental mantienen identidades distintas.
7. **Frecuencia no equivale a importancia.** Ninguna prioridad se decide únicamente por número de menciones, relaciones o documentos.
8. **Confianza no equivale a verdad.** Los valores internos no se presentan como certeza histórica.
9. **La incertidumbre nunca se elimina para simplificar.** Se representa como hipótesis, conflicto, matiz o evidencia insuficiente.
10. **El dominio canónico es único.** Solo existe un propietario de Entity, Relation, Source, SourceRef, Media y Publication.
11. **Research no duplica Entity, Relation, Source ni Publication.**
12. **El editor de entidades sigue siendo el editor canónico.** Research prepara y contextualiza; no crea un editor paralelo.
13. **El flujo clásico permanece operativo.**
14. **El Research Studio pertenece al Admin actual.** No tiene autenticación, navegación, shell, diseño ni despliegue independientes.
15. **El Canvas evoluciona el renderer existente.** No existe un segundo motor visual del grafo.
16. **El Canvas no sustituye a la Biblioteca ni al editor.**
17. **El Canvas no es un inventario.** Los hallazgos no aprobados permanecen fuera.
18. **El Canvas no es un diagrama manual.** María no mantiene una composición para que el sistema funcione.
19. **Las posiciones aceptadas son estables.** Una tarea automática no reorganiza el mapa mental.
20. **La atención editorial es finita.** JANO agrupa, prioriza y silencia antes de pedir decisiones.
21. **Los rechazos se respetan.** Solo reaparecen ante evidencia materialmente nueva y con explicación.
22. **Los procesos son incrementales e idempotentes.** Una fuente sin cambios no se reprocesa y un reintento no duplica.
23. **Una nueva fuente no reconstruye el proyecto.** Solo marca los objetos afectados.
24. **El AIProvider no contiene criterio editorial.** Ejecuta contratos; los servicios editoriales definen significado.
25. **La ausencia de IA no bloquea el trabajo manual.**
26. **La sustitución de proveedor no altera el dominio.**
27. **Los outputs automáticos se validan contra sus fuentes.**
28. **Las tareas prolongadas no bloquean la interacción.**
29. **La publicación no depende de IA en tiempo real.**
30. **Los contratos públicos no exponen estado privado de investigación.**
31. **La accesibilidad es obligatoria.** Estado y selección no dependen exclusivamente de color, hover o movimiento.
32. **El contexto de trabajo se conserva al navegar.**
33. **Se optimiza para una editora.** No se construyen workflows de equipo sin necesidad real.
34. **Se mide antes de escalar.** No se añade infraestructura por previsión.
35. **Una excepción exige un ADR.** La presión de entrega no autoriza desviaciones silenciosas.

---

## 4. Responsabilidades

### 4.1 Research Projects

**Hace:** delimita la investigación; conserva objetivo, alcance, estado y contexto; asocia fuentes, evidencias, hallazgos, decisiones y entidades.

**No hace:** definir entidades canónicas; publicar; duplicar contenido; gestionar equipos o aprobaciones multinivel.

### 4.2 Biblioteca

**Hace:** reúne fuentes y notas; conserva assets y versiones; prepara materiales; permite lectura, búsqueda y navegación.

**No hace:** decidir qué afirma una fuente; declarar autoridad historiográfica; crear entidades o relaciones; publicar referencias.

### 4.3 Fuentes

**Hace:** representa la identidad bibliográfica canónica; conserva autoría, título, edición, fecha y localización; distingue obra bibliográfica de asset adquirido.

**No hace:** contener decisiones de proyecto; sustituir Evidence; duplicarse por cada uso.

### 4.4 Evidencias

**Hace:** representa un pasaje exacto y localizable; conserva fuente, versión, página y contexto; respalda hallazgos, hipótesis, relaciones y borradores.

**No hace:** declarar verdad; determinar relevancia; convertirse automáticamente en cita publicada; existir sin fuente.

### 4.5 Hallazgos

**Hace:** representa resultados provisionales; consolida menciones; conserva evidencia; propone coincidencias; permanece revisable y rechazable.

**No hace:** actuar como Entity; entrar automáticamente en el Canvas; modificar contenido canónico; crear relaciones.

### 4.6 Decisiones editoriales

**Hace:** registra la autoridad humana sobre incorporar, vincular, posponer, rechazar, promover y aceptar; gobierna la transición entre propuesta y dominio canónico.

**No hace:** sustituir evidencia; almacenar contenido de entidad; ser inferida silenciosamente por IA.

### 4.7 Canvas

**Hace:** representa conocimiento activo, hipótesis, relaciones de trabajo, frames y contradicciones; facilita navegación, foco e inspección; conserva organización espacial.

**No hace:** almacenar Entity o Relation canónicas; mostrar todo lo detectado; sustituir lectura o redacción; decidir qué entra; exigir orden manual.

### 4.8 Entity Editor

**Hace:** edita la entidad canónica; gestiona contenido, traducciones, detalles, media, fuentes, relaciones y preview; sirve al flujo clásico y Research.

**No hace:** ingerir bibliotecas; extraer hallazgos; contener el Canvas; decidir promociones; publicar automáticamente.

### 4.9 Relaciones

**Hace:** representa conexiones canónicas; utiliza tipos gobernados; conserva dirección, justificación y evidencia; explica por qué existe la conexión.

**No hace:** representar coaparición; convertir similitud en significado; aceptar propuestas; ocultar contradicciones.

Una hipótesis y una Relation canónica son estados distintos. La primera permanece en Research; la segunda nace mediante aceptación humana.

### 4.10 Publicación

**Hace:** constituye la única frontera pública; valida invariantes; aplica la transición; sirve a ambos flujos; registra actor y resultado.

**No hace:** generar contenido; elegir fuentes; resolver contradicciones; ser invocada por tareas automáticas.

### 4.11 IA

**Hace:** orienta sobre fuentes; extrae hallazgos; propone agrupaciones, borradores y relaciones; identifica cambios; registra proveedor, modelo, versión, entradas, salidas, coste y error.

**No hace:** definir dominio; crear entidades canónicas; aceptar relaciones; elegir la interpretación correcta; modificar texto aprobado; publicar; operar autónomamente.

### 4.12 AIProvider

**Hace:** ejecuta solicitudes estructuradas; expone disponibilidad y metadatos; devuelve el contrato común; aísla particularidades del proveedor.

**No hace:** contener lógica editorial; conocer Entity, Relation, Canvas o Publication; escribir persistencia canónica.

### 4.13 Procesamiento en segundo plano

**Hace:** ejecuta preparación documental e IA sin bloquear; conserva estado, intentos y errores; garantiza idempotencia; reanuda tras reinicios.

**No hace:** tomar decisiones editoriales; publicar; justificar infraestructura distribuida.

---

## 5. Límites del sistema

- **Colaboración y workflows de equipo:** quedan fuera porque el sistema se optimiza para una editora.
- **OCR avanzado:** queda fuera porque manuscritos, escaneos degradados y layouts históricos exigen evaluación propia.
- **Embeddings y búsqueda vectorial:** quedan fuera hasta que casos medidos superen búsqueda textual y aliases.
- **Base de grafos adicional:** queda fuera porque duplicaría persistencia sin un límite medido.
- **Recomendaciones bibliográficas automáticas:** quedan fuera porque María controla el corpus.
- **Publicación automática:** no existe, no se planifica y no se habilita por configuración.
- **Agentes autónomos:** quedan fuera; toda tarea de IA es acotada, observable y revisable.
- **Generación completa de entidades:** queda fuera; la unidad de generación es una sección.
- **Traducción automática editorial:** queda fuera hasta definir criterios propios de fidelidad y revisión.
- **Inteligencia global entre proyectos:** queda fuera hasta existir volumen real y reglas de contexto.
- **Mantenimiento autónomo del grafo:** queda fuera; todo diagnóstico futuro solo propone.
- **Escala multi-tenant:** queda fuera; no existen organizaciones, billing, sharding ni aislamiento multi-tenant.
- **Constructor genérico de plantillas:** queda fuera; JANO gobierna plantillas editoriales versionadas.
- **CMS o page builder:** queda fuera; JANO produce conocimiento alrededor de entidades.

---

## 6. Decisiones descartadas

### 6.1 Construir un nuevo CMS

Descartado porque el problema no es introducir contenido conocido, sino producir conocimiento desde fuentes. Un CMS conservaría el cuello de botella fuera de JANO.

### 6.2 Crear una aplicación independiente

Descartado porque duplicaría autenticación, navegación, diseño, permisos, contratos y experiencia. Research es una evolución del Editorial Desk.

### 6.3 Sustituir el flujo clásico

Descartado porque la creación manual sigue siendo válida para correcciones, entidades simples y trabajo sin investigación documental.

### 6.4 Crear un editor específico para Research

Descartado porque produciría dos propietarios de contenido, relaciones, media y fuentes. El editor actual es el único editor canónico.

### 6.5 Crear un grafo separado

Descartado porque produciría dos renderers, dos lenguajes visuales y dos comportamientos de navegación.

### 6.6 Utilizar el grafo público como Canvas

Descartado porque mezclaría conocimiento publicado con hipótesis privadas, candidatos y estado editorial.

### 6.7 Convertir el Canvas en la única interfaz

Descartado porque el grafo no sustituye lectura extensa, bibliografía, redacción, preview o publicación.

### 6.8 Canvas totalmente manual

Descartado porque obligaría a María a gestionar un diagrama. La disposición manual es opcional.

### 6.9 Auto-layout continuo

Descartado porque destruye memoria espacial y confianza. Las tareas automáticas no reorganizan una disposición aceptada.

### 6.10 Volcar todos los candidatos al Canvas

Descartado porque convierte detección en deuda editorial. Los candidatos permanecen fuera hasta una decisión humana.

### 6.11 Revisar candidatos uno por uno

Descartado porque escala el trabajo humano con el volumen extraído. JANO consolida, agrupa y prioriza primero.

### 6.12 Crear entidades automáticamente

Descartado porque una mención no establece identidad, relevancia ni alcance. La promoción es humana e idempotente.

### 6.13 Crear relaciones por coaparición

Descartado porque compartir documento o párrafo no demuestra una relación histórica significativa.

### 6.14 Publicación automática

Descartada porque transfiere autoridad editorial a un proceso probabilístico.

### 6.15 IA escribiendo directamente sobre Entity

Descartado porque elimina preview, comparación, rechazo y trazabilidad. La IA produce propuestas.

### 6.16 IA generando entidades completas

Descartado porque oculta lagunas, aumenta alucinaciones y dificulta revisar procedencia. La unidad de generación es una sección.

### 6.17 Chat como interfaz principal

Descartado porque exige formular instrucciones, oculta estado y produce conversaciones difíciles de auditar. La IA aparece mediante acciones contextuales.

### 6.18 Puntuación universal de confianza

Descartada porque mezcla reconocimiento, identidad, calidad de fuente y verdad histórica. JANO explica evidencia, diversidad, matices y conflicto.

### 6.19 Frecuencia como ranking principal

Descartada porque fuentes repetitivas, corpus sesgados y menciones incidentales distorsionan la importancia.

### 6.20 Ocultar contradicciones

Descartado porque la historiografía contiene desacuerdo real. JANO representa interpretaciones y evidencias enfrentadas.

### 6.21 Duplicar Source para investigación

Descartado porque crearía bibliografías incompatibles. La identidad bibliográfica es canónica; el proyecto añade contexto, assets, evidencia y notas.

### 6.22 Utilizar SourceRef como evidencia

Descartado porque SourceRef representa una cita editorial ligada a una entidad. Evidence representa un pasaje de trabajo reutilizable antes de conocer su destino.

### 6.23 Utilizar Entity DRAFT para toda detección

Descartado porque contaminaría el dominio canónico con ruido, variantes y errores. Entity DRAFT nace tras promoción humana.

### 6.24 Almacenar todo como JSON genérico

Descartado porque oculta invariantes y convierte el dominio en convenciones no verificables. JSON queda limitado a snapshots y payloads que no sean fuente de verdad.

### 6.25 Microservicios desde el inicio

Descartados porque una editora y el volumen previsto no justifican operación distribuida. Los límites modulares viven dentro del sistema actual.

### 6.26 CQRS y event sourcing completos

Descartados porque añaden proyecciones y operación sin necesidad demostrada. JANO conserva auditoría e idempotencia sin adoptar esos frameworks.

### 6.27 Redis como requisito inicial

Descartado porque las tareas pueden apoyarse en la infraestructura persistente existente. Una pieza operativa adicional exige presión medida.

### 6.28 Vector database independiente

Descartada porque no existe un caso que supere búsqueda textual y estructura de proyecto, y añadiría sincronización.

### 6.29 Base de grafos como almacenamiento canónico

Descartada porque el dominio existente ya posee identidad e integridad. Navegación visual no exige duplicar persistencia.

### 6.30 Reprocesar todo ante cada cambio

Descartado por coste, latencia, inestabilidad y reapertura masiva de decisiones. El procesamiento es incremental.

### 6.31 Infraestructura para futuros equipos

Descartada porque roles y workflows especulativos aumentarían cada caso actual. La arquitectura se amplía cuando exista el segundo editor real.

### 6.32 Convertir el roadmap en arquitectura permanente

Descartado porque las fases describen secuencia de entrega. Este ADR gobierna límites y responsabilidades duraderos.

---

## 7. Reglas arquitectónicas

### 7.1 Propiedad del dominio

1. NUNCA se crea un segundo propietario de Entity, Relation, Source, Graph o Publication.
2. NUNCA se crea un editor canónico paralelo.
3. Research orquesta casos de uso y delega mutaciones canónicas a sus propietarios.
4. Un módulo NO accede a persistencia privada de otro para evitar sus invariantes.
5. Los contratos entre módulos expresan dominio, no estructuras internas de proveedor o persistencia.

### 7.2 IA

6. AIProvider NUNCA importa ni conoce Entity, Relation, SourceRef, Canvas o Publication.
7. La lógica editorial NUNCA vive en AIProvider.
8. Cada tarea define entrada y salida estructuradas y validadas.
9. Una salida inválida falla explícitamente; no se repara silenciosamente.
10. Todo fragmento citado por IA se verifica contra la fuente.
11. Toda ejecución conserva proveedor, modelo, versión, inputs relevantes, output, duración, coste y error.
12. Cambiar proveedor NO reprocesa ni modifica decisiones sin una orden explícita.
13. Una tarea automática NUNCA invoca Publication ni crea Entity o Relation canónicas.
14. La aplicación DEBE funcionar con AIProvider desactivado.

### 7.3 Evidencia y trazabilidad

15. Todo hallazgo automático DEBE enlazar evidencia verificable.
16. Toda relación propuesta DEBE enlazar evidencia y explicación revisable.
17. Toda generación DEBE registrar plantilla y evidencias utilizadas.
18. Una evidencia DEBE conservar la versión exacta de su fuente.
19. Actualizar una fuente NO reescribe evidencia histórica.
20. Promover evidencia a SourceRef NO elimina la evidencia de investigación.
21. Eliminar una asociación NO elimina objetos compartidos utilizados en otro contexto.

### 7.4 Canvas y grafo

22. NUNCA se crea un segundo Graph Renderer.
23. El renderer recibe contratos visuales y emite interacción; NO posee reglas editoriales.
24. El estado Research se adapta fuera del contrato público del grafo.
25. Un hallazgo NO aparece como nodo sin decisión humana.
26. Una propuesta NO aparece como Relation canónica.
27. Posición, frame, foco y filtros NO alteran hechos del grafo.
28. Reorganizar o aproximar nodos NO crea relaciones.
29. La evidencia completa NO depende de hover.
30. Una tarea automática NO mueve nodos aceptados.

### 7.5 Procesamiento

31. Toda tarea prolongada es persistente, observable, reintentable e idempotente.
32. El mismo input y versión NO crean resultados duplicados.
33. Una fuente sin cambios NO se reprocesa.
34. El fallo de una fuente NO bloquea las demás.
35. Los reintentos tienen límite y estado final visible.
36. Existe un único mecanismo de tareas hasta demostrar un límite real.
37. La interacción NO espera procesamiento prolongado.

### 7.6 Edición y publicación

38. Toda propuesta se presenta antes de modificar contenido aprobado.
39. Aceptar, editar y descartar son acciones distintas y auditables.
40. La generación se limita a una unidad editorial revisable.
41. El editor puede omitir una sección por evidencia insuficiente.
42. La publicación es un comando específico, no un cambio genérico de estado desde UI.
43. Flujo clásico y Research utilizan la misma publicación.
44. Publication valida invariantes en el owner canónico.
45. El frontend NO duplica reglas de publicación como fuente de verdad.

### 7.7 Compatibilidad y evolución

46. Toda migración preserva datos y admite despliegue compatible.
47. Los contratos públicos no exponen estado privado de Research.
48. Una capacidad Research no obliga a modificar el producto público.
49. Toda compatibilidad temporal tiene condición de retirada documentada.
50. No se añade dependencia, almacenamiento o proceso sin ownership y criterio de salida.
51. No se crea abstracción de una implementación salvo AIProvider, cuya sustitución es decisión explícita.
52. No se introduce configuración para decisiones editoriales invariables.
53. Toda desviación referencia el ADR que la autoriza.

---

## 8. Criterios de calidad

Una feature está bien diseñada únicamente cuando satisface todos los criterios aplicables.

### 8.1 Coherencia de dominio

- Tiene un propietario inequívoco.
- Reutiliza Entity, Relation, Source, SourceRef, Media, Graph y Publication cuando corresponde.
- No introduce una segunda fuente de verdad.
- No confunde propuesta con conocimiento canónico.
- No convierte estado de UI en regla de dominio.

### 8.2 Rigor editorial

- Conserva procedencia hasta fuente y pasaje.
- Representa incertidumbre y contradicción.
- Exige decisión humana en transiciones canónicas.
- Explica por qué una propuesta merece atención.
- Respeta rechazos y decisiones anteriores.

### 8.3 Comportamiento de IA

- Funciona mediante AIProvider.
- El criterio editorial permanece fuera del proveedor.
- La salida se valida.
- El fallo degrada a flujo manual.
- No existe ruta directa hacia publicación.
- Modelo, versión y evidencias quedan registrados.

### 8.4 Simplicidad

- Resuelve una necesidad actual.
- Añade el mínimo estado persistente necesario.
- No prepara workflows, escalas o proveedores no utilizados.
- Utiliza un módulo existente cuando ya posee la responsabilidad.
- Una abstracción nueva mueve una responsabilidad real.

### 8.5 Experiencia integrada

- Permanece dentro del Editorial Desk.
- Conserva navegación y contexto.
- Reutiliza editor y renderer existentes.
- No expone archivos técnicos o estados internos a María.
- No convierte el Canvas en trabajo administrativo.

### 8.6 Operación y seguridad

- Las tareas son idempotentes.
- Los errores son observables y recuperables.
- Los límites de archivo, red y recursos están definidos.
- Los datos privados no aparecen en contratos públicos.
- La eliminación respeta referencias compartidas.
- Las migraciones siguen el flujo de producción y backup de JANO.

### 8.7 Verificación

- Existe una prueba del caso de uso principal.
- Existen pruebas de invariantes y permisos.
- Se prueba el fallo del proveedor de IA.
- Se prueba el reintento sin duplicados.
- Se prueba regresión del flujo clásico cuando se tocan owners compartidos.
- Se prueba accesibilidad cuando existe interacción visual.

Antes de crear código, el desarrollador DEBE responder:

1. ¿Qué módulo posee esta responsabilidad?
2. ¿Qué fuente de verdad utiliza?
3. ¿Es propuesta, decisión, borrador o conocimiento canónico?
4. ¿Cuál es la evidencia y cómo se abre?
5. ¿Qué acción humana autoriza la transición?
6. ¿Qué ocurre sin IA?
7. ¿Es idempotente?
8. ¿Qué reutiliza del producto actual?
9. ¿Qué contrato público afecta?
10. ¿Qué necesidad real justifica esta complejidad?

Una respuesta ambigua bloquea la implementación hasta aclarar ownership y frontera.

---

## 9. Escalabilidad

El sistema crece mediante módulos cohesionados, procesamiento incremental y medición. No crece mediante distribución preventiva.

### 9.1 Escala objetivo

La arquitectura soporta inicialmente:

- una editora activa;
- cientos de proyectos;
- decenas de miles de entidades;
- cientos de miles de relaciones;
- miles de documentos;
- procesamiento concurrente limitado.

Esta escala no exige microservicios, base de grafos adicional ni vector database independiente.

### 9.2 Componentes preparados para crecer

**Preparación documental:** escala mediante workers adicionales que consumen el mismo contrato de tareas.

**IA:** escala mediante límites de concurrencia, selección de proveedor y separación por tipos de tarea. El dominio no cambia.

**Hallazgos:** escala por proyecto, fuente, estado y versión; nunca mediante cargas globales sin filtro.

**Canvas:** escala mediante consultas focales, agrupaciones, filtros y revelado progresivo; nunca renderizando todo simultáneamente.

**Grafo canónico:** escala con índices, consultas acotadas y paginación antes de añadir otro motor.

**Documentos:** los binarios viven fuera de las filas de dominio y mantienen metadatos, checksums y versiones.

### 9.3 Componentes que deben permanecer pequeños

**AIProvider:** transporte, disponibilidad y contrato. No acumula casos editoriales.

**Publication:** frontera explícita y validación. No orquesta investigación ni generación.

**Graph Renderer:** render e interacción. No acumula reglas de Research, ranking o evidencia.

**Entity Editor:** edición canónica. No se convierte en biblioteca, processor o Canvas.

**Research Project:** contexto y asociaciones. No absorbe responsabilidades de todos los módulos.

### 9.4 Umbrales de cambio

Una evolución de infraestructura exige:

- limitación reproducible;
- métricas de latencia, coste o volumen;
- owner operativo;
- estrategia de migración;
- efecto sobre la fuente de verdad;
- ADR específico.

Ninguna previsión comercial sustituye estos requisitos.

---

## 10. Riesgos

### 10.1 Convertir detección en producto

**Fallo:** mostrar cientos de resultados porque el sistema puede extraerlos.

**Síntoma:** la bandeja crece más rápido que las decisiones de María.

### 10.2 Contaminar el dominio canónico

**Fallo:** guardar candidatos como Entity o propuestas como Relation.

**Síntoma:** drafts sin responsable, duplicados y conexiones sin justificación.

### 10.3 Crear propietarios paralelos

**Fallo:** Research reimplementa edición, fuentes, relaciones o publicación.

**Síntoma:** una corrección debe aplicarse dos veces y produce resultados distintos.

### 10.4 Convertir el Canvas en mantenimiento visual

**Fallo:** exigir orden manual, mostrar todo o reorganizar automáticamente.

**Síntoma:** María dedica tiempo a limpiar nodos y recuperar posiciones.

### 10.5 Ocultar incertidumbre

**Fallo:** transformar resultados probabilísticos en hechos o resolver conflictos automáticamente.

**Síntoma:** la prosa adquiere certeza no respaldada.

### 10.6 Acoplar el producto al proveedor

**Fallo:** prompts, formatos o semántica de Ollama se filtran al dominio.

**Síntoma:** cambiar proveedor exige modificar proyectos, hallazgos y editor.

### 10.7 Hacer de la IA un requisito de disponibilidad

**Fallo:** Biblioteca, Canvas o publicación dependen del modelo.

**Síntoma:** una caída del proveedor bloquea la jornada editorial.

### 10.8 Reprocesar sin control

**Fallo:** cada fuente o cambio de modelo reconstruye todo.

**Síntoma:** costes, duplicados, prioridades inestables y decisiones reabiertas.

### 10.9 Sobreingeniería para equipos inexistentes

**Fallo:** introducir roles, eventos distribuidos, workflows y servicios separados.

**Síntoma:** cada feature simple cruza múltiples capas sin aportar valor a María.

### 10.10 Mantener compatibilidad indefinida

**Fallo:** conservar contratos legacy sin condición de retirada.

**Síntoma:** dos contratos expresan la misma verdad y divergen.

### 10.11 Debilitar trazabilidad

**Fallo:** almacenar texto generado sin evidencias o perder la ejecución de origen.

**Síntoma:** nadie puede explicar de dónde salió una afirmación.

### 10.12 Permitir que el roadmap sustituya al ADR

**Fallo:** implementar una fase mediante duplicación porque resulta más rápida localmente.

**Síntoma:** la épica cumple UI pero viola ownership.

Estos síntomas bloquean nuevas funcionalidades hasta corregir la desviación.

---

## 11. Checklist para Pull Requests

Toda Pull Request relacionada con el Editorial Research Studio DEBE responder:

- [ ] ¿Respeta ADR-ERS-001 o referencia el ADR que lo sustituye?
- [ ] ¿Mantiene un único owner para Entity, Relation, Source, Graph y Publication?
- [ ] ¿Reutiliza editor, renderer y servicios canónicos existentes?
- [ ] ¿Evita una segunda fuente de verdad?
- [ ] ¿Mantiene trazabilidad hasta fuente, versión y pasaje?
- [ ] ¿Distingue propuesta, decisión humana, borrador y conocimiento publicado?
- [ ] ¿Garantiza que la IA solo propone y nunca publica?
- [ ] ¿Funciona manualmente cuando la IA falla o está desactivada?
- [ ] ¿Es idempotente y evita duplicados en reintentos?
- [ ] ¿Conserva compatibilidad y regresión del flujo clásico?
- [ ] ¿Mantiene contratos públicos libres de estado privado de Research?
- [ ] ¿Respeta accesibilidad y restauración de contexto?
- [ ] ¿Añade únicamente complejidad necesaria para el alcance actual?
- [ ] ¿Incluye pruebas de invariantes, fallo y permisos aplicables?

Una respuesta negativa bloquea el merge o exige un ADR explícito antes de continuar.

12.Product Principles

El producto debe reducir decisiones.

Nunca aumentarlas.

---

El producto debe mantener el contexto.

Nunca obligar al editor a reconstruirlo.

---

El producto debe ayudar a pensar.

Nunca exigir gestionar información.

---

El producto debe mostrar incertidumbre.

Nunca ocultarla.

---

Cada clic debe acercar al conocimiento.

Nunca a la administración.

---

El usuario debe sentir que trabaja con ideas.

No con formularios.

---

El conocimiento debe sentirse vivo.

No almacenado.

---

La IA debe desaparecer.

Lo importante es el trabajo editorial.

No la tecnología.

North Star

El objetivo del Editorial Research Studio no es producir más entidades.

Es producir mejor conocimiento.
