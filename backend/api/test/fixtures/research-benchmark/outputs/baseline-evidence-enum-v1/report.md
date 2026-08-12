# Research Entity Extraction Benchmark — baseline-evidence-enum-v1

> Los scores de summary son heurísticas léxicas reproducibles y requieren revisión humana; no son una evaluación semántica perfecta.

## Freeze

- Commit: `7b2206e3fddfd6d15284964623998ef9a3302750` (worktree dirty)
- Provider/model: ollama / qwen2.5:7b
- Dataset: 1.0.0
- Run status: SUCCEEDED
- Pipeline: `{"task":"research.extract_findings","contractVersion":"3","maxCorpusSegments":80,"maxSegmentChars":1400,"evidenceBatchSize":5,"maxOutputTokens":2400,"entityOutputLimitPerBatch":6,"temperature":0.2,"promptAndContractHash":"78141905b3c63abc9fdc0380eba3765f2dc699e42f7036164faadef2a42611f1","providerImplementationHash":"98af91c51414fd0aba56cb70b55545aa95ac6bb2af8bf53ab2807501e683aecc","providerMetadata":{"provider":"ollama","model":"qwen2.5:7b"}}`

## Global metrics

- Documents: 6
- GOLD identities expected: 43
- Raw ENTITY proposals: 31
- Detected GOLD identities: 25
- Precision: 93.5%
- Recall: 58.1%
- F1: 71.7%
- Central recall: 63.0%
- Kind accuracy: 93.1%
- Duplicate proposals: 4 (12.9%)
- False/unmatched entities: 2
- Draft score average (heuristic): 1.21/5
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
- Raw proposals: 0; matched identities: 0
- False/unmatched: 0; duplicates: 0
- Central recall: 0/3
- Coverage: 100.0% (4/4 segmentos)

### 03-exhibition — Materia de Casa: crítica de una exposición

- GOLD: 10; central: 6
- Raw proposals: 6; matched identities: 6
- False/unmatched: 0; duplicates: 0
- Central recall: 3/6
- Coverage: 100.0% (4/4 segmentos)

### 04-education — El cuaderno no responde solo

- GOLD: 6; central: 4
- Raw proposals: 3; matched identities: 2
- False/unmatched: 1; duplicates: 0
- Central recall: 1/4
- Coverage: 100.0% (4/4 segmentos)

### 05-aliases — Elena Varo: tres nombres para una continuidad de trabajo

- GOLD: 6; central: 4
- Raw proposals: 6; matched identities: 5
- False/unmatched: 1; duplicates: 0
- Central recall: 4/4
- Coverage: 100.0% (4/4 segmentos)

### 06-long-ambiguity — Cartografía del intervalo: nombres cercanos, identidades distintas

- GOLD: 8; central: 6
- Raw proposals: 10; matched identities: 6
- False/unmatched: 0; duplicates: 4
- Central recall: 5/6
- Coverage: 100.0% (6/6 segmentos)

## Five strongest drafts (heuristic)

### Ana Soler

- GOLD: person-ana-soler; kind: PERSON (correcto)
- Score: 3/5; contexto: CONTEXT_PARTIAL
- Summary: Creadora de El eco quieto.
- Forbidden hits: ninguno

### Casa Faro

- GOLD: organization-casa-faro; kind: ORGANIZATION (correcto)
- Score: 3/5; contexto: CONTEXT_COMPLETE
- Summary: Organización que organiza y aloja las Jornadas del Eco en Faro Bajo.
- Forbidden hits: ninguno

### Cartografía del intervalo

- GOLD: concept-cartografia-intervalo; kind: WORK (esperado ABSTRACTION)
- Score: 2/5; contexto: CONTEXT_PARTIAL
- Summary: El método de comparación utilizado en la investigación.
- Forbidden hits: ninguno

### Aina Soler

- GOLD: person-aina-soler; kind: PERSON (correcto)
- Score: 2/5; contexto: CONTEXT_PARTIAL
- Summary: Coordinadora del documento.
- Forbidden hits: ninguno

### Iria Sorel

- GOLD: person-iria-sorel; kind: PERSON (correcto)
- Score: 1/5; contexto: CONTEXT_COMPLETE
- Summary: —
- Forbidden hits: ninguno

## Five weakest drafts (heuristic)

### Faro Bajo

- GOLD: place-faro-bajo; kind: PLACE (correcto)
- Score: 1/5; contexto: CONTEXT_PARTIAL
- Summary: —
- Forbidden hits: ninguno

### Casa Faro

- GOLD: organization-casa-faro; kind: ORGANIZATION (correcto)
- Score: 1/5; contexto: CONTEXT_COMPLETE
- Summary: —
- Forbidden hits: ninguno

### Cartografía del intervalo

- GOLD: concept-cartografia-intervalo; kind: ABSTRACTION (correcto)
- Score: 1/5; contexto: CONTEXT_PARTIAL
- Summary: —
- Forbidden hits: ninguno

### El eco quieto

- GOLD: work-el-eco-quieto; kind: WORK (correcto)
- Score: 1/5; contexto: CONTEXT_PARTIAL
- Summary: —
- Forbidden hits: ninguno

### Ana Soler

- GOLD: person-ana-soler; kind: PERSON (correcto)
- Score: 1/5; contexto: CONTEXT_COMPLETE
- Summary: —
- Forbidden hits: ninguno
