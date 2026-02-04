export type LogContext = Record<string, unknown>;

const formatContext = (context?: LogContext): string => {
  if (!context || Object.keys(context).length === 0) {
    return "";
  }
  return ` ${JSON.stringify(context)}`;
};

export const logger = {
  info(message: string, context?: LogContext) {
    console.info(`[sam-gov] ${message}${formatContext(context)}`);
  },
  warn(message: string, context?: LogContext) {
    console.warn(`[sam-gov] ${message}${formatContext(context)}`);
  },
  error(message: string, context?: LogContext) {
    console.error(`[sam-gov] ${message}${formatContext(context)}`);
  }
};
