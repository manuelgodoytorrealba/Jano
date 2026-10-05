# Entity enrichment — movements base batch 002

This batch fills the Spanish base fields and bilingual editorial fields for the next 20 published movements missing `Entity.summary` or `Entity.content`, in alphabetical order. Existing movement essays were retained as the source context for this enrichment and the resulting translations are idempotent.

Entities: Constructivismo, Dadaísmo, De Stijl, Expresionismo, Expresionismo abstracto, Fauvismo, Fluxus, Fotografía moderna, Futurismo, Gótico, Graffiti, Impresionismo, Informalismo, Land Art, Minimalismo, Modernismo brasileño, Muralismo mexicano, Orfismo, Pop Art and Postimpresionismo.

The transactional recovery artifact is `artifacts/editorial-recovery/entity-enrichment-movements-base-batch-002.json`.
