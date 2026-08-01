import { apiResponse } from '../../../lib/response';

export async function GET() {
  return apiResponse({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
}
