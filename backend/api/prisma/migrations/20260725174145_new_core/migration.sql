-- RenameForeignKey
ALTER TABLE "TaxonomyTerm" RENAME CONSTRAINT "TaxonomyTerm_parentId_fkey" TO "TaxonomyTerm_parentId_taxonomyId_fkey";
