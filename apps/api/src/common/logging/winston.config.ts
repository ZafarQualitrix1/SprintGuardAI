import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';

// Structured JSON logging correlated with OpenTelemetry trace IDs (Solution Architecture §26).
// Trace/correlation IDs are attached via the LoggingInterceptor, not here.
export const winstonLoggerOptions: winston.LoggerOptions = {
  level: process.env.LOG_LEVEL ?? 'info',
  transports: [
    new winston.transports.Console({
      format:
        process.env.NODE_ENV === 'production'
          ? winston.format.combine(winston.format.timestamp(), winston.format.json())
          : winston.format.combine(
              winston.format.timestamp(),
              nestWinstonModuleUtilities.format.nestLike('SprintGuard', {
                colors: true,
                prettyPrint: true,
              }),
            ),
    }),
  ],
};
