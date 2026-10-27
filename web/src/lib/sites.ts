export const companyOrigin = 'https://www.ylmz.com.cn';
export const platformOrigin = 'https://go.ylmz.com.cn';
export function platformLogin(path = '/learning'): string {
  const target =
    path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/login')
      ? path
      : '/learning';
  return (
    platformOrigin +
    '/#/login?' +
    new URLSearchParams({ from: 'website', redirect: target }).toString()
  );
}
export function companyHashDestination(hash: string): string {
  if (hash.startsWith('#company-')) return '#/' + hash;
  const route = hash.replace(/^#/, '');
  if (/^\/(library|assessment|training)\/?(?:\?.*)?$/.test(route)) return hash;
  if (/^\/login(?:\?|$)/.test(route))
    return platformLogin(
      new URLSearchParams(route.split('?')[1] || '').get('redirect') || '/learning',
    );
  if (
    /^\/(assessment|training|practice|learning|life|mood|application|manage)(?:[/?]|$)/.test(route)
  )
    return platformLogin(route);
  return hash;
}
