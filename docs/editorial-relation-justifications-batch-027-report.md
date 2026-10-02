# Justificaciones editoriales de relaciones — Batch 027

## Alcance

Se revisaron las 25 relaciones `INFLUENCED_BY` pendientes y se aprobaron únicamente 10 con evidencia documental específica y una afirmación causal identificable. Cada aprobación se registró en español e inglés.

## Relaciones aprobadas

- Expresionismo abstracto → Surrealismo
- Renacimiento italiano → Arte griego
- Renacimiento italiano → Arte romano
- Neoclasicismo → Arte griego
- Neoclasicismo → Arte romano
- Pablo Picasso → Paul Cézanne
- Postimpresionismo → Impresionismo
- Fauvismo → Postimpresionismo
- Cubismo → Postimpresionismo
- Surrealismo → Dadaísmo

## Verificación

- Script validado con `node --check`.
- Aplicación transaccional: 10 relaciones y 20 justificaciones bilingües.
- El script se puede volver a ejecutar de forma idempotente.
- Pendientes `INFLUENCED_BY` después del batch: 15.
