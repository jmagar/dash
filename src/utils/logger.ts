import winston from 'winston';
import 'winston-daily-rotate-file';

const { createLogger, format, transports } = winston;

const transport = new transports.DailyRotateFile({
  filename: 'logs/application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
});

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json(),
  ),
  transports: [
    transport,
    new transports.Console({
      format: format.simple(),
    }),
  ],
});

export default logger;
