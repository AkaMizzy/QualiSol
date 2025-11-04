import API_CONFIG from '@/app/config/api';

interface CreateCalendarEventPayload {
  context: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  heur_debut?: string; // HH:MM | HH:MM:SS
  heur_fin?: string;   // HH:MM | HH:MM:SS
  module?: string;
  function?: string;
}

export async function createCalendarEvent(payload: CreateCalendarEventPayload, token: string) {
  const res = await fetch(`${API_CONFIG.BASE_URL}/calendar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || 'Failed to create calendar event');
  }
  return data;
}

export interface CalendarEventDto {
  id?: string;
  context: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  heur_debut?: string | null;
  heur_fin?: string | null;
}

export async function fetchCalendarEvents(params: { start_date: string; end_date: string; context?: string }, token: string): Promise<CalendarEventDto[]> {
  const url = new URL(`${API_CONFIG.BASE_URL}/calendar`);
  url.searchParams.set('start_date', params.start_date);
  url.searchParams.set('end_date', params.end_date);
  if (params.context) url.searchParams.set('context', params.context);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || 'Failed to fetch calendar events');
  }
  return data as CalendarEventDto[];
}


