import { MetricsService } from './metrics';

describe('MetricsService', () => {
  it('exports bounded request and duration metrics without paths', () => {
    const metrics = new MetricsService();
    metrics.recordRequest('get', 200, 80);
    metrics.recordRequest('get', 503, 1_200);

    const output = metrics.renderPrometheus();
    expect(output).toContain('jano_http_requests_total{method="GET",status_class="2xx"} 1');
    expect(output).toContain('jano_http_requests_total{method="GET",status_class="5xx"} 1');
    expect(output).toContain('jano_http_request_duration_seconds_bucket{le="0.1"} 1');
    expect(output).toContain('jano_http_request_duration_seconds_bucket{le="2.5"} 2');
    expect(output).toContain('jano_http_request_duration_seconds_count 2');
  });
});
