import * as winston from 'winston';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';

const { combine, timestamp, errors, json } = winston.format;

export const loggerConfig = {
  transports: [
    new winston.transports.Console({
      format: combine(
        timestamp(),
        errors({ stack: true }),
        nestWinstonModuleUtilities.format.nestLike('Rendiciones', {
          prettyPrint: true,
          colors: true,
        }),
      ),
    }),
    new winston.transports.File({
      filename: `${process.env.LOG_DIR || 'logs'}/error.log`,
      level: 'error',
      format: combine(timestamp(), errors({ stack: true }), json()),
    }),
    new winston.transports.File({
      filename: `${process.env.LOG_DIR || 'logs'}/combined.log`,
      format: combine(timestamp(), json()),
    }),
  ],
  level: process.env.LOG_LEVEL || 'debug',
};
