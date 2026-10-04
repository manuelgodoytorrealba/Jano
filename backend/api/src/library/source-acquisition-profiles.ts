export type AcquisitionJournalRecord = {
  domain?: string;
  candidate?: { url: string };
  event?: boolean;
  responseMs?: number;
  status?: number;
  at?: string;
  prepared?: unknown;
  effective?: boolean;
};

export type AcquisitionDomainProfile = {
  domain: string;
  attempts: number;
  successes: number;
  '403_count': number;
  '429_count': number;
  other_failures: number;
  selected_count: number;
  prepared_count: number;
  effective_count: number;
  assessed_count: number;
  response_time_total: number;
  last_success_at: string | null;
  last_failure_at: string | null;
};

const emptyProfile = (domain: string): AcquisitionDomainProfile => ({
  domain,
  attempts: 0,
  successes: 0,
  '403_count': 0,
  '429_count': 0,
  other_failures: 0,
  selected_count: 0,
  prepared_count: 0,
  effective_count: 0,
  assessed_count: 0,
  response_time_total: 0,
  last_success_at: null,
  last_failure_at: null,
});

const latest = (current: string | null, candidate?: string) =>
  [current, candidate]
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;

export function buildAcquisitionProfiles(records: AcquisitionJournalRecord[]) {
  const domains: Record<string, AcquisitionDomainProfile> = {};
  for (const row of records) {
    const domain = row.domain ?? (row.candidate ? new URL(row.candidate.url).hostname : null);
    if (!domain) continue;
    const profile = (domains[domain] ??= emptyProfile(domain));
    if (row.event) {
      profile.attempts++;
      profile.response_time_total += row.responseMs ?? 0;
      if ((row.status ?? 0) >= 200 && (row.status ?? 0) < 400) {
        profile.successes++;
        profile.last_success_at = latest(profile.last_success_at, row.at);
      } else {
        const counter =
          row.status === 403 ? '403_count' : row.status === 429 ? '429_count' : 'other_failures';
        profile[counter]++;
        profile.last_failure_at = latest(profile.last_failure_at, row.at);
      }
    } else if (row.candidate) {
      profile.selected_count++;
      if (row.prepared) profile.prepared_count++;
      if (row.effective !== undefined) profile.assessed_count++;
      if (row.effective) profile.effective_count++;
    }
  }
  return Object.values(domains).map((profile) => ({
    ...profile,
    average_response_time: profile.attempts ? profile.response_time_total / profile.attempts : null,
    acquisition_success_rate: profile.selected_count
      ? profile.prepared_count / profile.selected_count
      : null,
    knowledge_yield_rate:
      profile.assessed_count === profile.prepared_count && profile.prepared_count
        ? profile.effective_count / profile.prepared_count
        : null,
    assessed_knowledge_yield_rate: profile.assessed_count
      ? profile.effective_count / profile.assessed_count
      : null,
    recommended_acquisition_strategy:
      profile['403_count'] / profile.attempts > 0.5
        ? 'OFFICIAL_ALTERNATIVE_OR_MANUAL'
        : profile['429_count'] / profile.attempts > 0.25
          ? 'COOLDOWN_AND_DIVERSIFY'
          : 'DIRECT_PUBLIC',
  }));
}
