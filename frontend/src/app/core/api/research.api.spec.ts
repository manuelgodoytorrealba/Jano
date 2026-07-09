import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ResearchApi } from './research.api';

describe('ResearchApi', () => {
  it('creates a source preparation job through the research endpoint', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ResearchApi],
    });

    const api = TestBed.inject(ResearchApi);
    const http = TestBed.inject(HttpTestingController);

    api.prepareSource('project-1', 'source-1').subscribe((project) => {
      expect(project.id).toBe('project-1');
    });

    const req = http.expectOne('/api/research/project-1/sources/source-1/jobs/prepare');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ id: 'project-1' });

    http.verify();
  });
});
