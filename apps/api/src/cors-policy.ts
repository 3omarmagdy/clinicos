export function buildAllowedOrigins(env: NodeJS.ProcessEnv = process.env): Set<string> {
  const configured = [env.FRONTEND_URL, env.FRONTEND_URLS]
    .filter(Boolean)
    .flatMap((value) => value!.split(',').map((origin) => origin.trim()).filter(Boolean));
  if (env.NODE_ENV !== 'production') configured.push('http://localhost:3000');
  return new Set(configured);
}
