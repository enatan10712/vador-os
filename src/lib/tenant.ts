export const DEFAULT_TENANT_SLUG = 'robusta-coffee';

export function getTenantIdFromHost(host?: string) {
  if (!host) {
    return DEFAULT_TENANT_SLUG;
  }

  const normalizedHost = host.toLowerCase();
  const hostWithoutPort = normalizedHost.split(':')[0];
  const segments = hostWithoutPort.split('.');

  if (segments.length >= 3) {
    const [candidate] = segments;
    return candidate === 'app' ? DEFAULT_TENANT_SLUG : candidate;
  }

  return DEFAULT_TENANT_SLUG;
}
