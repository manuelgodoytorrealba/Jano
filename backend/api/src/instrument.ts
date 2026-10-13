import * as Sentry from '@sentry/nestjs';
import { sentryOptions } from './observability/sentry-config';

Sentry.init(sentryOptions(process.env));
