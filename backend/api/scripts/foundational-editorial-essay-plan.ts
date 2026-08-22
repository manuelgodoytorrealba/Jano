import { foundationalV1TierAEssayPlan } from '../prisma/editorial/foundational-v1-tier-a-essay-plan';

const plan = foundationalV1TierAEssayPlan();

console.log('| Entity | Type | Eligibility | Priority | Existing | Editorial question | Reason |');
console.log('| --- | --- | --- | --- | --- | --- | --- |');
for (const item of plan) {
  console.log(
    `| ${item.title} | ${item.type} | ${item.eligibility} | ${item.priority} | ${item.existing ? 'YES' : 'NO'} | ${item.question} | ${item.reason} |`,
  );
}
console.log(
  JSON.stringify(
    {
      total: plan.length,
      yes: plan.filter((item) => item.eligibility === 'YES').length,
      maybe: plan.filter((item) => item.eligibility === 'MAYBE').length,
      no: plan.filter((item) => item.eligibility === 'NO').length,
    },
    null,
    2,
  ),
);
