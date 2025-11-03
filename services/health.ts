import API_CONFIG from '@/app/config/api';

export type ServerHealth = 'ok' | 'down' | 'error';

export type HealthResponse = {
  status: ServerHealth;
  message: string;
};

export async function getHealthStatus(): Promise<HealthResponse> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const base = API_CONFIG?.BASE_URL?.toString() ?? '';
    const url = base ? `${base}/api/health` : '/api/health';
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return { status: 'down', message: `HTTP ${res.status}` };

    let body: any = null;
    try { body = await res.json(); } catch {}
    const ok = body?.status === 'ok' || body?.healthy === true || res.status === 200;
    return { status: ok ? 'ok' : 'down', message: ok ? 'Server is healthy' : 'Server reported unhealthy' };
  } catch (err: any) {
    const aborted = err?.name === 'AbortError';
    return { status: 'error', message: aborted ? 'Request timed out' : 'Network error' };
  }
}

export function startHealthPolling(
  onUpdate: (response: HealthResponse) => void,
  intervalMs = 60000
): () => void {
  let active = true;

  async function tick() {
    if (!active) return;
    const result = await getHealthStatus();
    if (!active) return;
    onUpdate(result);
  }

  // initial fire
  void tick();
  const id = setInterval(tick, intervalMs);
  return () => {
    active = false;
    clearInterval(id);
  };
}


