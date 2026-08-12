# Research entity extraction benchmark

Dataset controlado para medir el pipeline actual `research.extract_findings`. Los documentos son ficticios y el GOLD es la única verdad editorial. El harness no cambia prompts, modelo, segmentación, persistencia ni contratos de producción.

## Ejecutar

Desde `backend/api`:

```bash
npm run research:benchmark -- validate
npm run research:benchmark -- run --run-id baseline-current
npm run research:benchmark -- run --run-id baseline-maxout-2400 --max-output-tokens 2400
npm run research:benchmark -- run --run-id baseline-contract-v2 --max-output-tokens 2400
npm run research:benchmark -- run --run-id baseline-relation-enum-v1 --max-output-tokens 2400
npm run research:benchmark -- run --run-id baseline-evidence-enum-v1 --max-output-tokens 2400
```

El runner exige una `DATABASE_URL` local no productiva y un provider disponible. Crea un usuario, Research, Sources, Materials y un `ResearchJob` propios; ejecuta `ResearchAIService.extractFindings` directamente y atribuye resultados exclusivamente por ese `jobId`. Por defecto elimina de la base todos sus registros después de exportar. `--keep` conserva los registros para inspección.

Para limpiar un run conservado:

```bash
npm run research:benchmark -- cleanup test/fixtures/research-benchmark/outputs/baseline-current
```

El cleanup verifica el prefijo y el email exactos del benchmark antes de borrar. Nunca selecciona registros por fechas o por patrones amplios.

## Artefactos

Cada run genera:

- `manifest.json`: commit, dirty hash, provider, modelo, configuración del pipeline e IDs exactos.
- `ai-executions.json`: inputs, outputs o errores de cada ejecución del job.
- `ai-attempts.json`: diagnóstico de cada intento recibido, incluido raw hash y metadata de Ollama.
- `failures.json`: clasificación por intento, metadata de Ollama y referencia al raw aislado.
- `raw-attempts/`: respuestas raw aisladas del benchmark; artefacto explícito dev, nunca stdout.
- `raw-proposals.json`: todas las proposals del job.
- `entity-proposals.json`: vista ENTITY con Evidence y documento.
- `gold-comparison.json`: matching raw y collapsed contra GOLD.
- `metrics.json`: precision, recall, F1, duplicación, kind, naming, summary y cobertura.
- `report.md`: lectura compacta global, por documento y muestras.

Los scores de summary son heurísticas léxicas deterministas y se marcan `manualReviewRequired`. Sirven para comparar runs con el mismo GOLD; no sustituyen juicio editorial semántico.

## Añadir un documento

1. Añadir texto natural en `documents/`.
2. Registrar archivo, género y título en `gold/document-metadata.json`.
3. Añadir entidades a `gold/entities.json`; cada `sourceSpans` debe existir literalmente tras normalizar espacios y acentos.
4. Añadir negativos y relaciones reutilizables cuando correspondan.
5. Ejecutar `validate` y los tests del evaluator.

Los kinds válidos son los de `KnowledgeEntityKind`: `PERSON`, `WORK`, `ABSTRACTION`, `EVENT`, `PLACE` y `ORGANIZATION`.

## Comparar runs

Conservar dos directorios de output y comparar sus `metrics.json` y `gold-comparison.json`. El manifest permite comprobar si cambiaron commit, prompt/contract hash, provider, modelo o constantes antes de atribuir una diferencia al extractor.
