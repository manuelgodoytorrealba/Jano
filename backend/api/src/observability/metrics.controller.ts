import {
  Controller,
  Get,
  Headers,
  NotFoundException,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { Public } from '../auth/public.decorator';
import { MetricsService } from './metrics';

@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly config: ConfigService,
    private readonly metrics: MetricsService,
  ) {}

  @Public()
  @Get()
  getMetrics(
    @Headers('authorization') authorization: string | undefined,
    @Res() response: Response,
  ) {
    const token = this.config.get<string>('METRICS_TOKEN');
    if (!token) throw new NotFoundException();
    if (authorization !== `Bearer ${token}`) throw new UnauthorizedException();

    response.type('text/plain; version=0.0.4; charset=utf-8').send(this.metrics.renderPrometheus());
  }
}
