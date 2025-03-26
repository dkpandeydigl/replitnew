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
      this.client = axios.create({
        baseURL: this.baseUrl,
        headers,
        auth: {
          username: auth.username,
          password: auth.password
        }
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
      await this.client.options('');
      return true;
    } catch (error) {
      log(`CalDAV connection test failed: ${error}`, 'caldav');
      return false;
    }
  }

  // Discover calendars on the server
  async discoverCalendars(): Promise<CalDAVCalendar[]> {
    try {
      const response = await this.client.propfind('', {
        data: `
          <d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
            <d:prop>
              <d:resourcetype />
              <d:displayname />
              <c:calendar-home-set />
            </d:prop>
          </d:propfind>
        `
      });

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
      const timeRange = start && end ? `
        <c:time-range 
          start="${start.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}" 
          end="${end.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}" 
        />
      ` : '';

      const response = await this.client.report(calendarUrl, {
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
      const uid = this.generateUID();
      const eventUrl = `${calendarUrl}${uid}.ics`;
      const icsData = this.generateICS(event, uid);
      
      await this.client.put(eventUrl, icsData, {
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8'
        }
      });
      
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
      const icsData = this.generateICS(event, event.uid);
      
      await this.client.put(event.url, icsData, {
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8'
        }
      });
      
      return event;
    } catch (error) {
      log(`Failed to update event: ${error}`, 'caldav');
      throw new Error(`Failed to update event: ${error}`);
    }
  }

  // Delete an event
  async deleteEvent(url: string): Promise<boolean> {
    try {
      await this.client.delete(url);
      return true;
    } catch (error) {
      log(`Failed to delete event: ${error}`, 'caldav');
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
    
    if (event.recurrence) {
      icsData += `\nRRULE:${event.recurrence}`;
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
