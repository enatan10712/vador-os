export function logInfo(message: string, meta?: Record<string, unknown>) {
  console.info(JSON.stringify({ level: 'info', message, ...meta, timestamp: new Date().toISOString() }));
}

export function logError(message: string, meta?: Record<string, unknown>) {
  console.error(JSON.stringify({ level: 'error', message, ...meta, timestamp: new Date().toISOString() }));
}
