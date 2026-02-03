// =============================================================================
// GovBid Pro - Calendar Configuration
// =============================================================================
// Google Calendar and Microsoft Outlook integration configuration
// =============================================================================

// =============================================================================
// CALENDAR CONFIGURATION INTERFACES
// =============================================================================

export interface GoogleCalendarConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface MicrosoftCalendarConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  tenantId: string;
  scopes: string[];
}

export interface CalendarConfig {
  google: GoogleCalendarConfig;
  microsoft: MicrosoftCalendarConfig;
  defaultReminderMinutes: number[];
  syncIntervalMinutes: number;
  maxEventsPerSync: number;
}

// =============================================================================
// CONFIGURATION VALUES
// =============================================================================

export const googleCalendarConfig: GoogleCalendarConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback',
  scopes: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ],
};

export const microsoftCalendarConfig: MicrosoftCalendarConfig = {
  clientId: process.env.MICROSOFT_CLIENT_ID || '',
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
  redirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3000/auth/microsoft/callback',
  tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
  scopes: [
    'openid',
    'profile',
    'email',
    'offline_access',
    'Calendars.ReadWrite',
    'User.Read',
  ],
};

export const calendarConfig: CalendarConfig = {
  google: googleCalendarConfig,
  microsoft: microsoftCalendarConfig,
  defaultReminderMinutes: [10080, 4320, 1440], // 7 days, 3 days, 1 day
  syncIntervalMinutes: parseInt(process.env.CALENDAR_SYNC_INTERVAL || '15', 10),
  maxEventsPerSync: parseInt(process.env.CALENDAR_MAX_EVENTS_SYNC || '100', 10),
};

// =============================================================================
// OAUTH URL GENERATORS
// =============================================================================

/**
 * Generate Google OAuth authorization URL
 */
export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: googleCalendarConfig.clientId,
    redirect_uri: googleCalendarConfig.redirectUri,
    response_type: 'code',
    scope: googleCalendarConfig.scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Generate Microsoft OAuth authorization URL
 */
export function getMicrosoftAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: microsoftCalendarConfig.clientId,
    redirect_uri: microsoftCalendarConfig.redirectUri,
    response_type: 'code',
    scope: microsoftCalendarConfig.scopes.join(' '),
    response_mode: 'query',
    state,
  });

  return `https://login.microsoftonline.com/${microsoftCalendarConfig.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
}

// =============================================================================
// TOKEN EXCHANGE
// =============================================================================

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  scope?: string;
}

/**
 * Exchange Google authorization code for tokens
 */
export async function exchangeGoogleCode(code: string): Promise<TokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: googleCalendarConfig.clientId,
      client_secret: googleCalendarConfig.clientSecret,
      redirect_uri: googleCalendarConfig.redirectUri,
      grant_type: 'authorization_code',
      code,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google token exchange failed: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
    scope: data.scope,
  };
}

/**
 * Exchange Microsoft authorization code for tokens
 */
export async function exchangeMicrosoftCode(code: string): Promise<TokenResponse> {
  const response = await fetch(
    `https://login.microsoftonline.com/${microsoftCalendarConfig.tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: microsoftCalendarConfig.clientId,
        client_secret: microsoftCalendarConfig.clientSecret,
        redirect_uri: microsoftCalendarConfig.redirectUri,
        grant_type: 'authorization_code',
        code,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Microsoft token exchange failed: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
    scope: data.scope,
  };
}

/**
 * Refresh Google access token
 */
export async function refreshGoogleToken(refreshToken: string): Promise<TokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: googleCalendarConfig.clientId,
      client_secret: googleCalendarConfig.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google token refresh failed: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
    scope: data.scope,
  };
}

/**
 * Refresh Microsoft access token
 */
export async function refreshMicrosoftToken(refreshToken: string): Promise<TokenResponse> {
  const response = await fetch(
    `https://login.microsoftonline.com/${microsoftCalendarConfig.tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: microsoftCalendarConfig.clientId,
        client_secret: microsoftCalendarConfig.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Microsoft token refresh failed: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
    scope: data.scope,
  };
}

// =============================================================================
// CALENDAR EVENT TYPES
// =============================================================================

export interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  isAllDay?: boolean;
  location?: string;
  reminders?: number[]; // Minutes before event
  metadata?: Record<string, string>;
}

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  extendedProperties?: {
    private?: Record<string, string>;
  };
}

export interface MicrosoftCalendarEvent {
  id?: string;
  subject: string;
  body?: {
    contentType: 'text' | 'html';
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
  };
  isAllDay?: boolean;
  reminderMinutesBeforeStart?: number;
}

// =============================================================================
// EVENT CONVERSION HELPERS
// =============================================================================

/**
 * Convert internal event to Google Calendar format
 */
export function toGoogleCalendarEvent(
  event: CalendarEvent,
  timezone: string = 'America/New_York'
): GoogleCalendarEvent {
  const googleEvent: GoogleCalendarEvent = {
    summary: event.title,
    description: event.description,
    location: event.location,
  };

  if (event.isAllDay) {
    googleEvent.start = {
      date: event.start.toISOString().split('T')[0],
    };
    googleEvent.end = {
      date: event.end.toISOString().split('T')[0],
    };
  } else {
    googleEvent.start = {
      dateTime: event.start.toISOString(),
      timeZone: timezone,
    };
    googleEvent.end = {
      dateTime: event.end.toISOString(),
      timeZone: timezone,
    };
  }

  if (event.reminders && event.reminders.length > 0) {
    googleEvent.reminders = {
      useDefault: false,
      overrides: event.reminders.map((minutes) => ({
        method: 'popup' as const,
        minutes,
      })),
    };
  }

  if (event.metadata) {
    googleEvent.extendedProperties = {
      private: event.metadata,
    };
  }

  return googleEvent;
}

/**
 * Convert internal event to Microsoft Calendar format
 */
export function toMicrosoftCalendarEvent(
  event: CalendarEvent,
  timezone: string = 'America/New_York'
): MicrosoftCalendarEvent {
  return {
    subject: event.title,
    body: event.description
      ? {
          contentType: 'text',
          content: event.description,
        }
      : undefined,
    start: {
      dateTime: event.start.toISOString(),
      timeZone: timezone,
    },
    end: {
      dateTime: event.end.toISOString(),
      timeZone: timezone,
    },
    location: event.location
      ? {
          displayName: event.location,
        }
      : undefined,
    isAllDay: event.isAllDay,
    reminderMinutesBeforeStart:
      event.reminders && event.reminders.length > 0
        ? Math.min(...event.reminders)
        : undefined,
  };
}

/**
 * Convert Google Calendar event to internal format
 */
export function fromGoogleCalendarEvent(googleEvent: GoogleCalendarEvent): CalendarEvent {
  const isAllDay = !googleEvent.start.dateTime;

  return {
    id: googleEvent.id,
    title: googleEvent.summary,
    description: googleEvent.description,
    start: new Date(googleEvent.start.dateTime || googleEvent.start.date || ''),
    end: new Date(googleEvent.end.dateTime || googleEvent.end.date || ''),
    isAllDay,
    location: googleEvent.location,
    reminders: googleEvent.reminders?.overrides?.map((r) => r.minutes),
    metadata: googleEvent.extendedProperties?.private,
  };
}

/**
 * Convert Microsoft Calendar event to internal format
 */
export function fromMicrosoftCalendarEvent(msEvent: MicrosoftCalendarEvent): CalendarEvent {
  return {
    id: msEvent.id,
    title: msEvent.subject,
    description: msEvent.body?.content,
    start: new Date(msEvent.start.dateTime),
    end: new Date(msEvent.end.dateTime),
    isAllDay: msEvent.isAllDay,
    location: msEvent.location?.displayName,
    reminders: msEvent.reminderMinutesBeforeStart
      ? [msEvent.reminderMinutesBeforeStart]
      : undefined,
  };
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate calendar configuration
 */
export function validateCalendarConfig(): {
  google: { valid: boolean; errors: string[] };
  microsoft: { valid: boolean; errors: string[] };
} {
  const googleErrors: string[] = [];
  const microsoftErrors: string[] = [];

  if (!googleCalendarConfig.clientId) {
    googleErrors.push('GOOGLE_CLIENT_ID is required');
  }
  if (!googleCalendarConfig.clientSecret) {
    googleErrors.push('GOOGLE_CLIENT_SECRET is required');
  }

  if (!microsoftCalendarConfig.clientId) {
    microsoftErrors.push('MICROSOFT_CLIENT_ID is required');
  }
  if (!microsoftCalendarConfig.clientSecret) {
    microsoftErrors.push('MICROSOFT_CLIENT_SECRET is required');
  }

  return {
    google: {
      valid: googleErrors.length === 0,
      errors: googleErrors,
    },
    microsoft: {
      valid: microsoftErrors.length === 0,
      errors: microsoftErrors,
    },
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  config: calendarConfig,
  google: googleCalendarConfig,
  microsoft: microsoftCalendarConfig,
  auth: {
    getGoogleAuthUrl,
    getMicrosoftAuthUrl,
    exchangeGoogleCode,
    exchangeMicrosoftCode,
    refreshGoogleToken,
    refreshMicrosoftToken,
  },
  convert: {
    toGoogleCalendarEvent,
    toMicrosoftCalendarEvent,
    fromGoogleCalendarEvent,
    fromMicrosoftCalendarEvent,
  },
  validateConfig: validateCalendarConfig,
};
