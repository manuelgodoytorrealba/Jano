# Research Entity Extraction Benchmark — baseline-observable

> Los scores de summary son heurísticas léxicas reproducibles y requieren revisión humana; no son una evaluación semántica perfecta.

## Freeze

- Commit: `7b2206e3fddfd6d15284964623998ef9a3302750` (worktree dirty)
- Provider/model: ollama / qwen2.5:7b
- Dataset: 1.0.0
- Run status: FAILED — Ollama transport failed [category=PROVIDER_TRANSPORT_ERROR attempts=1 rawLength=0 finishReason=unknown]
- Pipeline: `{"task":"research.extract_findings","contractVersion":"3","maxCorpusSegments":80,"maxSegmentChars":1400,"evidenceBatchSize":5,"maxOutputTokens":1200,"entityOutputLimitPerBatch":6,"temperature":0.2,"promptAndContractHash":"4f020d891c8f50daf1a35078c6e3afaf20acf34cddbec9a529e87dad0455c5e4","providerImplementationHash":"48778a481264cfd78bb22fe5b29f4cdebd3b8c74f9fac2852d36685ca7606914","providerMetadata":{"provider":"ollama","model":"qwen2.5:7b"}}`

## Global metrics

- Documents: 6
- GOLD identities expected: 43
- Quality metrics: **INVALID — the pipeline did not complete.** Partial outputs remain available for diagnosis.

## Per document

### 01-monograph — Iria Sorel y la memoria porosa

- GOLD: 7; central: 4
- Raw proposals: 0; matched identities: 0
- False/unmatched: 0; duplicates: 0
- Central recall: not valid (document not processed completely)
- Coverage: 0.0% (0/4 segmentos)

### 02-theory — Escuchar de lado: notas para un archivo respirante

- GOLD: 6; central: 3
- Raw proposals: 0; matched identities: 0
- False/unmatched: 0; duplicates: 0
- Central recall: not valid (document not processed completely)
- Coverage: 0.0% (0/4 segmentos)

### 03-exhibition — Materia de Casa: crítica de una exposición

- GOLD: 10; central: 6
- Raw proposals: 0; matched identities: 0
- False/unmatched: 0; duplicates: 0
- Central recall: not valid (document not processed completely)
- Coverage: 0.0% (0/4 segmentos)

### 04-education — El cuaderno no responde solo

- GOLD: 6; central: 4
- Raw proposals: 0; matched identities: 0
- False/unmatched: 0; duplicates: 0
- Central recall: not valid (document not processed completely)
- Coverage: 0.0% (0/4 segmentos)

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

## Five weakest drafts (heuristic)
