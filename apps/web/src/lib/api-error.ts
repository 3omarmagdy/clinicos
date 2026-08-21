interface ApiErrorPayload {
  message?: string | string[];
}

export async function getApiErrorMessage(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => null) as ApiErrorPayload | null;
  if (Array.isArray(body?.message)) return body.message.join(', ');
  return body?.message || fallback;
}
