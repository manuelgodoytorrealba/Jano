# Research Entity Extraction Benchmark — baseline-contract-v2-r3

> Los scores de summary son heurísticas léxicas reproducibles y requieren revisión humana; no son una evaluación semántica perfecta.

## Freeze

- Commit: `7b2206e3fddfd6d15284964623998ef9a3302750` (worktree dirty)
- Provider/model: ollama / qwen2.5:7b
- Dataset: 1.0.0
- Run status: FAILED — Ollama transport failed [category=PROVIDER_TRANSPORT_ERROR attempts=1 rawLength=0 finishReason=unknown]
- Pipeline: `{"task":"research.extract_findings","contractVersion":"3","maxCorpusSegments":80,"maxSegmentChars":1400,"evidenceBatchSize":5,"maxOutputTokens":2400,"entityOutputLimitPerBatch":6,"temperature":0.2,"promptAndContractHash":"eb4f34c993c9d318745696709d8a1a1676c05b6ed9a75dacf787d8e11e14b8ad","providerImplementationHash":"98af91c51414fd0aba56cb70b55545aa95ac6bb2af8bf53ab2807501e683aecc","providerMetadata":{"provider":"ollama","model":"qwen2.5:7b"}}`

## Global metrics

- Documents: 6
- GOLD identities expected: 43
- Quality metrics: **INVALID — the pipeline did not complete.** Partial outputs remain available for diagnosis.

## Per document

### 01-monograph — Iria Sorel y la memoria porosa

- GOLD: 7; central: 4
- Raw proposals: 4; matched identities: 4
- False/unmatched: 0; duplicates: 0
- Central recall: 4/4
- Coverage: 100.0% (4/4 segmentos)

### 02-theory — Escuchar de lado: notas para un archivo respirante

- GOLD: 6; central: 3
- Raw proposals: 1; matched identities: 1
- False/unmatched: 0; duplicates: 0
- Central recall: 0/3
- Coverage: 100.0% (4/4 segmentos)

### 03-exhibition — Materia de Casa: crítica de una exposición

- GOLD: 10; central: 6
- Raw proposals: 8; matched identities: 7
- False/unmatched: 1; duplicates: 0
- Central recall: 5/6
- Coverage: 100.0% (4/4 segmentos)

### 04-education — El cuaderno no responde solo

- GOLD: 6; central: 4
- Raw proposals: 3; matched identities: 2
- False/unmatched: 1; duplicates: 0
- Central recall: not valid (document not processed completely)
- Coverage: 75.0% (3/4 segmentos)

### 05-aliases — Elena Varo: tres nombres para una continuidad de trabajo

- GOLD: 6; central: 4
- Raw proposals: 0; matched identities: 0
- False/unmatched: 0; duplicates: 0
- Central recall: not valid (document not processed completely)
- Coverage: 0.0% (0/4 segmentos)

### 06-long-ambiguity — Cartografía del intervalo: nombres cercanos, identidades distintas

- GOLD: 8; central: 6
- Raw proposals: 0; matched identities: 0
- False/unmatched: 0; duplicates: 0
- Central recall: not valid (document not processed completely)
- Coverage: 0.0% (0/6 segmentos)

## Five strongest drafts (heuristic)

### Iria Sorel

- GOLD: person-iria-sorel; kind: PERSON (correcto)
- Score: 1/5; contexto: CONTEXT_COMPLETE
- Summary: —
- Forbidden hits: ninguno

### Casa de sal

- GOLD: work-casa-de-sal; kind: WORK (correcto)
- Score: 1/5; contexto: CONTEXT_PARTIAL
- Summary: —
- Forbidden hits: ninguno

### Atlas del umbral

- GOLD: work-atlas-del-umbral; kind: WORK (correcto)
- Score: 1/5; contexto: CONTEXT_SEVERELY_FRAGMENTED
- Summary: —
- Forbidden hits: ninguno

### Memoria porosa

- GOLD: concept-memoria-porosa; kind: ABSTRACTION (correcto)
- Score: 1/5; contexto: CONTEXT_COMPLETE
- Summary: —
- Forbidden hits: ninguno

### Materia de Casa

- GOLD: event-materia-casa; kind: WORK (esperado EVENT)
- Score: 1/5; contexto: CONTEXT_COMPLETE
- Summary: —
- Forbidden hits: ninguno

## Five weakest drafts (heuristic)

### Escuela Delta

- GOLD: organization-escuela-delta; kind: ORGANIZATION (correcto)
- Score: 1/5; contexto: CONTEXT_COMPLETE
- Summary: —
- Forbidden hits: ninguno

### Noa Mir

- GOLD: person-noa-mir; kind: PERSON (correcto)
- Score: 1/5; contexto: CONTEXT_COMPLETE
- Summary: —
- Forbidden hits: ninguno

### Inventario del humo

- GOLD: work-inventario-humo; kind: WORK (correcto)
- Score: 1/5; contexto: CONTEXT_COMPLETE
- Summary: —
- Forbidden hits: ninguno

### Mesa para una ausencia

- GOLD: work-mesa-ausencia; kind: WORK (correcto)
- Score: 1/5; contexto: CONTEXT_COMPLETE
- Summary: —
- Forbidden hits: ninguno

### Instituto Lumen

- GOLD: organization-instituto-lumen; kind: ORGANIZATION (correcto)
- Score: 1/5; contexto: CONTEXT_COMPLETE
- Summary: —
- Forbidden hits: ninguno
