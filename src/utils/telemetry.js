import posthog from 'posthog-js';

// Initialize PostHog
// Beta users will need to add VITE_POSTHOG_KEY to their .env file
export const initTelemetry = () => {
  const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
  const posthogHost = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (posthogKey) {
    posthog.init(posthogKey, {
      api_host: posthogHost,
      autocapture: false, // We will manually capture important events
      capture_pageview: false, // We will handle this via React Router
    });
    console.log("PostHog Telemetry Initialized");
  } else {
    console.warn("PostHog Telemetry is disabled. Set VITE_POSTHOG_KEY to enable.");
  }
};

export const trackEvent = (eventName, properties = {}) => {
  if (posthog.__loaded) {
    posthog.capture(eventName, properties);
  } else {
    // Fallback logging for local testing if PostHog isn't configured
    console.log(`[Telemetry Event] ${eventName}:`, properties);
  }
};

export const trackPageView = (pageName) => {
  trackEvent('$pageview', { page: pageName });
};
