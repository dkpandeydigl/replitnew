import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { DOMParser } from 'xmldom';
import { log } from './vite';

// Extend axios for WebDAV methods
declare module 'axios' {
  interface AxiosInstance {
    propfind(url: string, config?: AxiosRequestConfig): Promise<any>;
    report(url: string, config?: AxiosRequestConfig): Promise<any>;
  }
}

interface CalDAVAuth {
  type: 'username' | 'token';
  username?: string | null;
  password?: string | null;
  token?: string | null;
}

interface CalDAVCalendar {
  url: string;
  displayName: string;
  color?: string;
}

interface CalDAVEvent {
  uid: string;
  url: string;
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  allDay: boolean;
  recurrence?: string;
  metadata?: any;
}

class CalDAVClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl: string, auth: CalDAVAuth) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/xml; charset=utf-8',
      'Depth': '1',
    };

    // Set up authentication
    if (auth.type === 'username' && auth.username && auth.password) {
      // For DAViCal, we need to include credentials in the Authorization header
      const authString = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
      headers['Authorization'] = `Basic ${authString}`;
      this.client = axios.create({
        baseURL: this.baseUrl,
        headers,
        // Include withCredentials for CORS
        withCredentials: true
      });
    } else if (auth.type === 'token' && auth.token) {
      headers['Authorization'] = `Bearer ${auth.token}`;
      this.client = axios.create({
        baseURL: this.baseUrl,
        headers
      });
    } else {
      throw new Error('Invalid authentication method');
    }

    // Add WebDAV methods to the axios instance
    this.client.propfind = (url: string, config?: AxiosRequestConfig) => {
      return this.client.request({
        ...config,
        method: 'PROPFIND',
        url,
        headers: {
          ...config?.headers,
          'Content-Type': 'application/xml',
          'Depth': '1',
        },
      });
    };

    this.client.report = (url: string, config?: AxiosRequestConfig) => {
      return this.client.request({
        ...config,
        method: 'REPORT',
        url,
        headers: {
          ...config?.headers,
          'Content-Type': 'application/xml',
          'Depth': '1',
        },
      });
    };
  }

  // Test connection to the CalDAV server
  async testConnection(): Promise<boolean> {
    try {
      // Try OPTIONS first as it's the lightest method
      try {
        await this.client.options('');
        log('CalDAV connection successful using OPTIONS', 'caldav');
        return true;
      } catch (optionsError) {
        log(`OPTIONS failed, trying GET: ${optionsError}`, 'caldav');

        // If OPTIONS fails, try a simple GET
        try {
          await this.client.get('');
          log('CalDAV connection successful using GET', 'caldav');
          return true;
        } catch (getError) {
          log(`GET failed, trying PROPFIND: ${getError}`, 'caldav');

          // DAViCal usually responds to PROPFIND even if the path isn't correct
          await this.client.propfind('', {
            data: `<d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>`,
            headers: { 'Depth': '0' }
          });

          log('CalDAV connection successful using PROPFIND', 'caldav');
          return true;
        }
      }
    } catch (error) {
      log(`CalDAV connection test failed with all methods: ${error}`, 'caldav');
      return false;
    }
  }

  // Discover calendars on the server
  async discoverCalendars(): Promise<CalDAVCalendar[]> {
    try {
      log(`Discovering calendars at URL: ${this.baseUrl}`, 'caldav');

      // For DAViCal, we need to use a specific format
      let response;
      try {
        // For DAViCal, we need to construct the URL properly
        if (this.baseUrl.includes('davical')) {
          log('DAViCal server detected, adjusting URL format', 'caldav');
          // Remove any trailing slashes
          const cleanBaseUrl = this.baseUrl.replace(/\/+$/, '');
          // Add caldav.php path if not present
          if (!cleanBaseUrl.includes('caldav.php')) {
            this.baseUrl = `${cleanBaseUrl}/caldav.php/${auth.username}/`;
          }
        }

        const parser = new DOMParser();
        log('Trying to discover calendars using PROPFIND with DAViCal format', 'caldav');
        // First find the principal URL
        response = await this.client.propfind('', {
          data: `<?xml version="1.0" encoding="utf-8" ?>
            <D:propfind xmlns:D="DAV:">
              <D:prop>
                <D:current-user-principal/>
              </D:prop>
            </D:propfind>`,
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Depth': '0'
          }
        });

        // Then get the calendar-home-set
        const homeResponse = await this.client.propfind('', {
          data: `<?xml version="1.0" encoding="utf-8" ?>
            <D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
              <D:prop>
                <C:calendar-home-set/>
              </D:prop>
            </D:propfind>`,
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Depth': '0'
          }
        });

        // Finally get the calendars
        response = await this.client.propfind('', {
          data: `<?xml version="1.0" encoding="utf-8" ?>
            <D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
              <D:prop>
                <D:resourcetype/>
                <D:displayname/>
                <C:supported-calendar-component-set/>
              </D:prop>
            </D:propfind>`,
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Depth': '1'
          }
        });
      } catch (error) {
        log(`Initial calendar discovery failed: ${error}`, 'caldav');

        // Try different format for DAViCal
        log('Trying with alternate PROPFIND format for DAViCal', 'caldav');
        response = await this.client.propfind('', {
          data: `
            <D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
              <D:prop>
                <D:resourcetype/>
                <D:displayname/>
                <C:calendar-home-set/>
                <C:calendar-user-address-set/>
                <C:schedule-inbox-URL/>
                <C:schedule-outbox-URL/>
              </D:prop>
            </D:propfind>
          `,
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Depth': '0'
          }
        });
      }

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(response.data, 'text/xml');

      // Extract calendar home set URLs
      const homeSetNodes = xmlDoc.getElementsByTagNameNS('urn:ietf:params:xml:ns:caldav', 'calendar-home-set');
      const homeSetUrls: string[] = [];

      for (let i = 0; i < homeSetNodes.length; i++) {
        const node = homeSetNodes[i];
        const hrefNodes = node.getElementsByTagNameNS('DAV:', 'href');
        for (let j = 0; j < hrefNodes.length; j++) {
          const href = hrefNodes[j].textContent;
          if (href) homeSetUrls.push(href);
        }
      }

      // If no home set found, try current path
      if (homeSetUrls.length === 0) {
        homeSetUrls.push('');
      }

      const calendars: CalDAVCalendar[] = [];

      // Query each home set for calendars
      for (const homeUrl of homeSetUrls) {
        const calResponse = await this.client.propfind(homeUrl, {
          data: `
            <d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:cs="http://apple.com/ns/ical/">
              <d:prop>
                <d:resourcetype />
                <d:displayname />
                <cs:calendar-color />
              </d:prop>
            </d:propfind>
          `
        });

        const calXmlDoc = parser.parseFromString(calResponse.data, 'text/xml');
        const responses = calXmlDoc.getElementsByTagNameNS('DAV:', 'response');

        for (let i = 0; i < responses.length; i++) {
          const response = responses[i];
          const resourceTypes = response.getElementsByTagNameNS('DAV:', 'resourcetype');

          // Check if this is a calendar resource
          let isCalendar = false;
          for (let j = 0; j < resourceTypes.length; j++) {
            const calendarNodes = resourceTypes[j].getElementsByTagNameNS('urn:ietf:params:xml:ns:caldav', 'calendar');
            if (calendarNodes.length > 0) {
              isCalendar = true;
              break;
            }
          }

          if (isCalendar) {
            const hrefNodes = response.getElementsByTagNameNS('DAV:', 'href');
            const displayNameNodes = response.getElementsByTagNameNS('DAV:', 'displayname');
            const colorNodes = response.getElementsByTagNameNS('http://apple.com/ns/ical/', 'calendar-color');

            const href = hrefNodes[0]?.textContent ?? '';
            const displayName = displayNameNodes[0]?.textContent ?? 'Unnamed Calendar';
            const color = colorNodes[0]?.textContent ?? '#3B82F6';

            if (href) {
              calendars.push({
                url: href.startsWith('/') || href.startsWith('http') ? href : `${homeUrl}${href}`,
                displayName,
                color: color.replace('#', '').length === 6 ? color : '#3B82F6'
              });
            }
          }
        }
      }

      return calendars;
    } catch (error) {
      log(`Failed to discover calendars: ${error}`, 'caldav');
      throw new Error(`Failed to discover calendars: ${error}`);
    }
  }

  // Get events from a calendar
  async getEvents(calendarUrl: string, start?: Date, end?: Date): Promise<CalDAVEvent[]> {
    try {
      log(`Getting events from calendar at URL: ${calendarUrl}`, 'caldav');

      if (start && end) {
        log(`Time range: ${start.toISOString()} to ${end.toISOString()}`, 'caldav');
      }

      // Handle relative URLs and ensure proper DAViCal format
      if (this.baseUrl.includes('davical')) {
        // For DAViCal, use the full URL path
        if (!calendarUrl.startsWith('http')) {
          calendarUrl = new URL(calendarUrl, this.baseUrl).href;
        }
      } else if (calendarUrl.startsWith('/')) {
        calendarUrl = new URL(calendarUrl, this.baseUrl).href;
      }

      // Ensure calendar URL has trailing slash
      calendarUrl = calendarUrl.endsWith('/') ? calendarUrl : `${calendarUrl}/`;

      // Format time range for REPORT query
      const timeRange = start && end ? `
        <c:time-range 
          start="${start.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}" 
          end="${end.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}" 
        />
      ` : '';

      // Try standard REPORT request first
      let response;
      try {
        log('Trying to get events with standard REPORT query', 'caldav');

        response = await this.client.report(calendarUrl, {
          data: `
            <c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
              <d:prop>
                <d:getetag />
                <c:calendar-data />
              </d:prop>
              <c:filter>
                <c:comp-filter name="VCALENDAR">
                  <c:comp-filter name="VEVENT">
                    ${timeRange}
                  </c:comp-filter>
                </c:comp-filter>
              </c:filter>
            </c:calendar-query>
          `
        });
      } catch (error) {
        log(`Standard REPORT failed: ${error}`, 'caldav');

        // Try alternative REPORT format for DAViCal
        log('Trying alternative DAViCal REPORT format', 'caldav');

        response = await this.client.report(calendarUrl, {
          data: `
            <C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
              <D:prop>
                <D:getetag />
                <C:calendar-data />
              </D:prop>
              <C:filter>
                <C:comp-filter name="VCALENDAR">
                  <C:comp-filter name="VEVENT">
                    ${timeRange}
                  </C:comp-filter>
                </C:comp-filter>
              </C:filter>
            </C:calendar-query>
          `,
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Depth': '1'
          }
        });
      }

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(response.data, 'text/xml');
      const responses = xmlDoc.getElementsByTagNameNS('DAV:', 'response');

      const events: CalDAVEvent[] = [];

      for (let i = 0; i < responses.length; i++) {
        const response = responses[i];
        const hrefNodes = response.getElementsByTagNameNS('DAV:', 'href');
        const dataNodes = response.getElementsByTagNameNS('urn:ietf:params:xml:ns:caldav', 'calendar-data');

        if (hrefNodes.length > 0 && dataNodes.length > 0) {
          const href = hrefNodes[0].textContent ?? '';
          const icsData = dataNodes[0].textContent ?? '';

          // Parse ICS data
          const event = this.parseICSEvent(icsData, href);
          if (event) {
            events.push(event);
          }
        }
      }

      return events;
    } catch (error) {
      log(`Failed to get events: ${error}`, 'caldav');
      throw new Error(`Failed to get events: ${error}`);
    }
  }

  // Create a new event
  async createEvent(calendarUrl: string, event: Omit<CalDAVEvent, 'uid' | 'url'>): Promise<CalDAVEvent> {
    try {
      log(`Creating event in calendar: ${calendarUrl}`, 'caldav');

      // Handle relative URLs and ensure proper format for DAViCal
      if (calendarUrl.startsWith('/')) {
        calendarUrl = new URL(calendarUrl, this.baseUrl).href;
      }

      // Ensure calendar URL has trailing slash
      calendarUrl = calendarUrl.endsWith('/') ? calendarUrl : `${calendarUrl}/`;

      const uid = this.generateUID();
      const eventUrl = calendarUrl + uid + '.ics';
      const icsData = this.generateICS(event, uid);

      log(`Creating event with UID: ${uid}`, 'caldav');

      try {
        await this.client.put(eventUrl, icsData, {
          headers: {
            'Content-Type': 'text/calendar; charset=utf-8'
          }
        });
      } catch (error) {
        log(`Standard PUT failed: ${error}`, 'caldav');

        // For DAViCal - try with If-None-Match header
        log('Trying PUT with If-None-Match header for DAViCal', 'caldav');
        await this.client.put(eventUrl, icsData, {
          headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'If-None-Match': '*'
          }
        });
      }

      return {
        uid,
        url: eventUrl,
        ...event
      };
    } catch (error) {
      log(`Failed to create event: ${error}`, 'caldav');
      throw new Error(`Failed to create event: ${error}`);
    }
  }

  // Update an existing event
  async updateEvent(event: CalDAVEvent): Promise<CalDAVEvent> {
    try {
      log(`Updating event: ${event.uid} at URL: ${event.url}`, 'caldav');

      const icsData = this.generateICS(event, event.uid);

      try {
        // First attempt standard PUT
        await this.client.put(event.url, icsData, {
          headers: {
            'Content-Type': 'text/calendar; charset=utf-8'
          }
        });
      } catch (error) {
        log(`Standard PUT update failed: ${error}`, 'caldav');

        // Try another approach for DAViCal
        log('Trying PUT update with If-Match: * for DAViCal', 'caldav');
        await this.client.put(event.url, icsData, {
          headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'If-Match': '*'
          }
        });
      }

      return event;
    } catch (error) {
      log(`Failed to update event: ${error}`, 'caldav');
      throw new Error(`Failed to update event: ${error}`);
    }
  }

  // Delete an event
  async deleteEvent(url: string): Promise<boolean> {
    try {
      // Handle DAViCal specific URL construction
      let fullUrl = url;
      if (this.baseUrl.includes('davical')) {
        if (!url.startsWith('http')) {
          // Extract the calendar path from the URL
          const calPath = url.split('/calendar/')[1];
          fullUrl = `${this.baseUrl}calendar/${calPath}`;
        }
      } else {
        fullUrl = url.startsWith('http') ? url : (
          url.startsWith('/') ? url : `/${url}`
        );
      }

      log(`Deleting event at URL: ${fullUrl}`, 'caldav');

      try {
        // First try standard DELETE
        await this.client.delete(fullUrl);
      } catch (error) {
        log(`Standard DELETE failed: ${error}`, 'caldav');

        // For DAViCal - try with special headers
        log('Trying DELETE with special headers for DAViCal', 'caldav');
        await this.client.delete(fullUrl, {
          headers: {
            'If-Match': '*'
          }
        });
      }

      return true;
    } catch (error) {
      log(`All DELETE attempts failed: ${error}`, 'caldav');
      throw new Error(`Failed to delete event: ${error}`);
    }
  }

  // Helper method to parse ICS data
  private parseICSEvent(icsData: string, url: string): CalDAVEvent | null {
    try {
      // Simple regex-based ICS parser for demonstration
      const uidMatch = icsData.match(/UID:(.*?)(?:\r?\n|\r)/);
      const summaryMatch = icsData.match(/SUMMARY:(.*?)(?:\r?\n|\r)/);
      const descriptionMatch = icsData.match(/DESCRIPTION:(.*?)(?:\r?\n|\r)/);
      const locationMatch = icsData.match(/LOCATION:(.*?)(?:\r?\n|\r)/);
      const dtStartMatch = icsData.match(/DTSTART(?:;VALUE=DATE)?(?:;TZID=[\w/]+)?:(.*?)(?:\r?\n|\r)/);
      const dtEndMatch = icsData.match(/DTEND(?:;VALUE=DATE)?(?:;TZID=[\w/]+)?:(.*?)(?:\r?\n|\r)/);
      const rruleMatch = icsData.match(/RRULE:(.*?)(?:\r?\n|\r)/);

      if (!uidMatch || !summaryMatch || !dtStartMatch || !dtEndMatch) {
        return null;
      }

      const uid = uidMatch[1].trim();
      const title = summaryMatch[1].trim();
      const description = descriptionMatch ? descriptionMatch[1].trim() : undefined;
      const location = locationMatch ? locationMatch[1].trim() : undefined;

      // Determine if all-day event by format of DTSTART
      const isAllDay = dtStartMatch[0].includes('VALUE=DATE') && !dtStartMatch[0].includes('TZID');

      // Parse dates
      let start: Date, end: Date;

      if (isAllDay) {
        // Format for all-day events: YYYYMMDD
        const startStr = dtStartMatch[1].trim();
        const endStr = dtEndMatch[1].trim();

        start = new Date(
          parseInt(startStr.substring(0, 4)),
          parseInt(startStr.substring(4, 6)) - 1,
          parseInt(startStr.substring(6, 8))
        );

        end = new Date(
          parseInt(endStr.substring(0, 4)),
          parseInt(endStr.substring(4, 6)) - 1,
          parseInt(endStr.substring(6, 8))
        );
      } else {
        // Format for timed events: YYYYMMDDTHHmmssZ or with timezone
        const startStr = dtStartMatch[1].trim();
        const endStr = dtEndMatch[1].trim();

        // Handle ISO format
        start = new Date(startStr.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?/, '$1-$2-$3T$4:$5:$6Z'));
        end = new Date(endStr.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?/, '$1-$2-$3T$4:$5:$6Z'));
      }

      const recurrence = rruleMatch ? rruleMatch[1].trim() : undefined;

      return {
        uid,
        url,
        title,
        description,
        location,
        start,
        end,
        allDay: isAllDay,
        recurrence
      };
    } catch (error) {
      log(`Failed to parse ICS event: ${error}`, 'caldav');
      return null;
    }
  }

  // Helper method to generate ICS data for an event
  private generateICS(event: Omit<CalDAVEvent, 'uid' | 'url'> & { uid?: string }, uid: string): string {
    const now = new Date();
    const dtstamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    // Format dates
    let dtstart: string, dtend: string;

    if (event.allDay) {
      // Format for all-day events: YYYYMMDD
      dtstart = `DTSTART;VALUE=DATE:${event.start.toISOString().split('T')[0].replace(/-/g, '')}`;
      dtend = `DTEND;VALUE=DATE:${event.end.toISOString().split('T')[0].replace(/-/g, '')}`;
    } else {
      // Format for timed events: YYYYMMDDTHHmmssZ
      dtstart = `DTSTART:${event.start.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`;
      dtend = `DTEND:${event.end.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`;
    }

    let icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CalDAV Client//EN
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtstamp}
${dtstart}
${dtend}
SUMMARY:${event.title}`;

    if (event.description) {
      icsData += `\nDESCRIPTION:${event.description}`;
    }

    if (event.location) {
      icsData += `\nLOCATION:${event.location}`;
    }

    if (event.recurrence?.frequency) {
      let rrule = `FREQ=${event.recurrence.frequency}`;
      
      if (event.recurrence.interval && event.recurrence.interval > 1) {
        rrule += `;INTERVAL=${event.recurrence.interval}`;
      }
      
      if (event.recurrence.count) {
        rrule += `;COUNT=${event.recurrence.count}`;
      }
      
      if (event.recurrence.until) {
        const untilDate = new Date(event.recurrence.until);
        rrule += `;UNTIL=${untilDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
      }
      
      if (event.recurrence.byDay && event.recurrence.byDay.length > 0) {
        rrule += `;BYDAY=${event.recurrence.byDay.join(',')}`;
      }
      
      icsData += `\nRRULE:${rrule}`;
    }

    icsData += `\nEND:VEVENT
END:VCALENDAR`;

    return icsData;
  }

  // Generate a unique identifier for a new event
  private generateUID(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}@caldavclient`;
  }
}

export default CalDAVClient;