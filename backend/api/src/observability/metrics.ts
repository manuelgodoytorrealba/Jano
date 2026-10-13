import { Injectable } from '@nestjs/common';

const DURATION_BUCKETS_SECONDS = [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10] as const;

type RequestKey = `${string}|${string}`;

function metricLine(name: string, labels: Record<string, string>, value: number): string {
  const encoded = Object.entries(labels)
    .map(([key, label]) => `${key}="${label.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`)
    .join(',');
  return `${name}{${encoded}} ${value}`;
}

@Injectable()
export class MetricsService {
  private readonly startedAt = Date.now();
  private readonly requests = new Map<RequestKey, number>();
  private readonly durationBuckets = new Map<number, number>();
  private durationCount = 0;
  private durationSumSeconds = 0;

  recordRequest(method: string, status: number, durationMs: number): void {
    const statusClass = `${Math.floor(status / 100)}xx`;
    const key: RequestKey = `${method.toUpperCase()}|${statusClass}`;
    this.requests.set(key, (this.requests.get(key) ?? 0) + 1);

    const durationSeconds = durationMs / 1_000;
    this.durationCount += 1;
    this.durationSumSeconds += durationSeconds;
    for (const bucket of DURATION_BUCKETS_SECONDS) {
      if (durationSeconds <= bucket) {
        this.durationBuckets.set(bucket, (this.durationBuckets.get(bucket) ?? 0) + 1);
      }
    }
  }

  renderPrometheus(): string {
    const lines = [
      '# HELP jano_http_requests_total Completed HTTP requests.',
      '# TYPE jano_http_requests_total counter',
    ];

    for (const [key, count] of [...this.requests.entries()].sort()) {
      const [method, statusClass] = key.split('|');
      lines.push(
        metricLine('jano_http_requests_total', { method, status_class: statusClass }, count),
      );
    }

    lines.push(
      '# HELP jano_http_request_duration_seconds HTTP request duration without route labels.',
      '# TYPE jano_http_request_duration_seconds histogram',
    );
    for (const bucket of DURATION_BUCKETS_SECONDS) {
      lines.push(
        metricLine(
          'jano_http_request_duration_seconds_bucket',
          { le: String(bucket) },
          this.durationBuckets.get(bucket) ?? 0,
        ),
      );
    }
    lines.push(
      metricLine('jano_http_request_duration_seconds_bucket', { le: '+Inf' }, this.durationCount),
      `jano_http_request_duration_seconds_sum ${this.durationSumSeconds}`,
      `jano_http_request_duration_seconds_count ${this.durationCount}`,
      '# HELP jano_process_uptime_seconds API process uptime.',
      '# TYPE jano_process_uptime_seconds gauge',
      `jano_process_uptime_seconds ${(Date.now() - this.startedAt) / 1_000}`,
      '# HELP jano_process_resident_memory_bytes API resident memory.',
      '# TYPE jano_process_resident_memory_bytes gauge',
      `jano_process_resident_memory_bytes ${process.memoryUsage().rss}`,
    );

    return `${lines.join('\n')}\n`;
  }
}
