import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'];

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: SCOPES,
});

const calendar = google.calendar({ version: 'v3', auth });

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

export interface CalendarEvent {
  summary: string;
  description?: string;
  start: { date: string; dateTime?: string };
  end: { date: string; dateTime?: string };
  attendees?: { email: string }[];
}

export async function createCalendarEvent(event: CalendarEvent) {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    console.warn("Google Calendar credentials not missing. Skipping event creation.");
    return null;
  }

  try {
    const response = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: event,
    });
    return response.data;
  } catch (error) {
    console.error("Error creating Google Calendar event:", error);
    throw error;
  }
}

export async function listCalendarEvents(timeMin?: string, maxResults: number = 20) {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.warn("Google Calendar credentials missing. returning empty list");
      return [];
  }

  try {
    const response = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin: timeMin || new Date().toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });
    return response.data.items;
  } catch (error) {
    console.error("Error listing Google Calendar events:", error);
    return [];
  }
}
