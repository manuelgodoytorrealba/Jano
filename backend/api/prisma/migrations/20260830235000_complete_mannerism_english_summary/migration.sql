UPDATE "EntityTranslation"
SET "shortDescription" = 'Mannerism was an artistic current that developed chiefly in Italy during the sixteenth century and later spread through European courts. Its artists knew the legacy of Raphael and Michelangelo intimately, yet sought to move away from classical balance through elongated figures, difficult poses, unstable spaces, tense colours, and deliberately artificial sophistication. Rather than a simple phase between the Renaissance and Baroque, it helps us study how a tradition changes when its conventions become conscious and debatable.'
WHERE "entityId" = (SELECT id FROM "Entity" WHERE slug = 'manierismo')
  AND locale = 'en';
