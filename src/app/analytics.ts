type AnalyticsEventName =
  | 'homepage_cta_click'
  | 'daily_mode_start'
  | 'ai_mode_start'
  | 'invite_creation_start'
  | 'share_button_click'
  | 'seed_challenge_start';

type AnalyticsPayload = Record<string, string | number | boolean | undefined>;

function getDeviceType() {
  return window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768 ? 'mobile' : 'desktop';
}

export function trackEvent(name: AnalyticsEventName, payload: AnalyticsPayload = {}) {
  const event = {
    name,
    payload: { ...payload, device: getDeviceType(), path: window.location.pathname },
    timestamp: new Date().toISOString(),
  };

  window.dispatchEvent(new CustomEvent('pocket-shuffle-analytics', { detail: event }));

  const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT as string | undefined;
  if (!endpoint) return;

  const body = JSON.stringify(event);
  if (navigator.sendBeacon) {
    navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
    return;
  }

  void fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: true,
  });
}
