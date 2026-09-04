CREATE UNIQUE INDEX "Relation_fromId_relationTypeId_toId_key"
  ON "Relation"("fromId", "relationTypeId", "toId");
