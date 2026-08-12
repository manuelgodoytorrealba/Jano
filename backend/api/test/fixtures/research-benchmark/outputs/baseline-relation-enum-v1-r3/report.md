# Research Entity Extraction Benchmark — baseline-relation-enum-v1-r3

> Los scores de summary son heurísticas léxicas reproducibles y requieren revisión humana; no son una evaluación semántica perfecta.

## Freeze

- Commit: `7b2206e3fddfd6d15284964623998ef9a3302750` (worktree dirty)
- Provider/model: ollama / qwen2.5:7b
- Dataset: 1.0.0
- Run status: SUCCEEDED
- Pipeline: `{"task":"research.extract_findings","contractVersion":"3","maxCorpusSegments":80,"maxSegmentChars":1400,"evidenceBatchSize":5,"maxOutputTokens":2400,"entityOutputLimitPerBatch":6,"temperature":0.2,"promptAndContractHash":"b2c30166ba90f4bcacb82cbb97599168383234267e6c5fa24e58868196597f38","providerImplementationHash":"98af91c51414fd0aba56cb70b55545aa95ac6bb2af8bf53ab2807501e683aecc","providerMetadata":{"provider":"ollama","model":"qwen2.5:7b"}}`

## Global metrics

- Documents: 6
- GOLD identities expected: 43
- Raw ENTITY proposals: 31
- Detected GOLD identities: 25
- Precision: 90.3%
- Recall: 58.1%
- F1: 70.7%
- Central recall: 66.7%
- Kind accuracy: 96.4%
- Duplicate proposals: 3 (9.7%)
- False/unmatched entities: 3
- Draft score average (heuristic): 1.29/5
- Forbidden fact hits (literal): 0

## Per document

### 01-monograph — Iria Sorel y la memoria porosa

- GOLD: 7; central: 4
- Raw proposals: 6; matched identities: 6
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
- Raw proposals: 5; matched identities: 5
- False/unmatched: 0; duplicates: 0
- Central recall: 4/6
- Coverage: 100.0% (4/4 segmentos)

### 04-education — El cuaderno no responde solo

- GOLD: 6; central: 4
- Raw proposals: 1; matched identities: 0
- False/unmatched: 1; duplicates: 0
- Central recall: 0/4
- Coverage: 100.0% (4/4 segmentos)

### 05-aliases — Elena Varo: tres nombres para una continuidad de trabajo

- GOLD: 6; central: 4
- Raw proposals: 6; matched identities: 5
- False/unmatched: 1; duplicates: 0
- Central recall: 4/4
- Coverage: 100.0% (4/4 segmentos)

### 06-long-ambiguity — Cartografía del intervalo: nombres cercanos, identidades distintas

- GOLD: 8; central: 6
- Raw proposals: 12; matched identities: 8
- False/unmatched: 1; duplicates: 3
- Central recall: 6/6
- Coverage: 100.0% (6/6 segmentos)

## Five strongest drafts (heuristic)

### Ana Soler

- GOLD: person-ana-soler; kind: PERSON (correcto)
- Score: 3/5; contexto: CONTEXT_PARTIAL
- Summary: Crea 'El eco quieto'.
- Forbidden hits: ninguno

### Faro Bajo

- GOLD: place-faro-bajo; kind: PLACE (correcto)
- Score: 3/5; contexto: CONTEXT_PARTIAL
- Summary: Lugar donde se organiza y aloja las Jornadas del Eco en Faro Bajo.
- Forbidden hits: ninguno

### Casa Faro

- GOLD: organization-casa-faro; kind: ORGANIZATION (correcto)
- Score: 3/5; contexto: CONTEXT_COMPLETE
- Summary: Organización que organiza y aloja las Jornadas del Eco en Faro Bajo.
- Forbidden hits: ninguno

### Cartografía del intervalo

- GOLD: concept-cartografia-intervalo; kind: ABSTRACTION (correcto)
- Score: 2/5; contexto: CONTEXT_PARTIAL
- Summary: El método de comparación utilizado en el documento.
- Forbidden hits: ninguno

### Aina Soler

- GOLD: person-aina-soler; kind: PERSON (correcto)
- Score: 2/5; contexto: CONTEXT_PARTIAL
- Summary: Coordina el documento.
- Forbidden hits: ninguno

## Five weakest drafts (heuristic)

### Jornadas del Eco

- GOLD: event-jornadas-eco; kind: EVENT (correcto)
- Score: 1/5; contexto: CONTEXT_COMPLETE
- Summary: —
- Forbidden hits: ninguno

### Eco quieto

- GOLD: concept-eco-quieto; kind: ABSTRACTION (correcto)
- Score: 1/5; contexto: CONTEXT_COMPLETE
- Summary: —
- Forbidden hits: ninguno

### Cartografía del intervalo

- GOLD: concept-cartografia-intervalo; kind: ABSTRACTION (correcto)
- Score: 1/5; contexto: CONTEXT_COMPLETE
- Summary: —
- Forbidden hits: ninguno

### El eco quieto

- GOLD: work-el-eco-quieto; kind: WORK (correcto)
- Score: 1/5; contexto: CONTEXT_COMPLETE
- Summary: —
- Forbidden hits: ninguno

### Ana Soler

- GOLD: person-ana-soler; kind: PERSON (correcto)
- Score: 1/5; contexto: CONTEXT_COMPLETE
- Summary: —
- Forbidden hits: ninguno
