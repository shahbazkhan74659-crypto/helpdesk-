import * as Sentry from '@sentry/node';
import { config } from './config';

Sentry.init({
  dsn: config.SENTRY_DSN,
  enabled: Boolean(config.SENTRY_DSN),
  environment: config.SENTRY_ENVIRONMENT ?? config.NODE_ENV,
});
