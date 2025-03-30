import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import CalDAVClient from "./caldav";
import { InsertEvent, eventFormSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // sets up /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

  // CalDAV Server routes
  app.get("/api/servers", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

    try {
      const servers = await storage.getCaldavServers(req.user.id);
      // Don't return passwords/tokens in the response
      const sanitizedServers = servers.map(server => ({
        ...server,
        password: undefined,
        token: undefined
      }));
      res.json(sanitizedServers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch servers" });
    }
  });

  app.post("/api/servers", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

    try {
      const userId = req.user.id;

      // Validate server information
      const serverData = {
        userId,
        url: req.body.url,
        authType: req.body.authType,
        username: req.body.username,
        password: req.body.password,
        token: req.body.token
      };

      // Validate required fields based on auth type
      if (serverData.authType === 'username' && (!serverData.username || !serverData.password)) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      if (serverData.authType === 'token' && !serverData.token) {
        return res.status(400).json({ message: "Token is required" });
      }

      console.log(`Attempting to connect to CalDAV server at: ${serverData.url}`);

      // Make sure URL is properly formatted - trailing slash is important for some CalDAV servers
      let serverUrl = serverData.url;
      if (!serverUrl.endsWith('/')) {
        serverUrl += '/';
        serverData.url = serverUrl;
      }

      // Test connection before saving
      try {
        console.log('Attempting CalDAV connection with:', {
          url: serverUrl,
          authType: serverData.authType,
          username: serverData.username ? '(provided)' : '(not provided)',
          password: serverData.password ? '(provided)' : '(not provided)',
          token: serverData.token ? '(provided)' : '(not provided)'
        });

        // For the DAViCal server, make sure we're pointing to the correct root location
        // The zpush.ajaydata.com/davical/ URL leads to a login page, not to CalDAV
        // We need to use the user's "principal" URL which is usually under /caldav.php/username/
        if (serverUrl.includes('zpush.ajaydata.com/davical') && serverData.username) {
          // Adjust the URL to point to the user's principal collection
          const principalUrl = `https://zpush.ajaydata.com/davical/caldav.php/${serverData.username}/`;
          console.log(`Adjusting URL for DAViCal to: ${principalUrl}`);
          serverUrl = principalUrl;
          serverData.url = principalUrl;
        }

        const auth = {
          type: serverData.authType as 'username' | 'token',
          username: serverData.username,
          password: serverData.password,
          token: serverData.token
        };

        const caldav = new CalDAVClient(serverUrl, auth);
        const connectionSuccessful = await caldav.testConnection();

        if (!connectionSuccessful) {
          console.log('Failed connection test to CalDAV server');
          return res.status(400).json({ message: "Could not connect to CalDAV server" });
        }

        console.log('Successfully connected to CalDAV server');

        // Connection successful, save server
        const server = await storage.createCaldavServer(serverData);

        // Return server without sensitive data
        const { password, token, ...sanitizedServer } = server;
        res.status(201).json(sanitizedServer);
      } catch (error: any) {
        console.error('Error connecting to CalDAV server:', error.message);
        return res.status(400).json({ message: `Failed to connect to CalDAV server: ${error.message}` });
      }
    } catch (error: any) {
      console.error('Server error:', error.message);
      res.status(500).json({ message: `Failed to add server: ${error.message}` });
    }
  });

  app.delete("/api/servers/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

    try {
      const serverId = parseInt(req.params.id);
      const server = await storage.getCaldavServer(serverId);

      if (!server) {
        return res.status(404).json({ message: "Server not found" });
      }

      if (server.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteCaldavServer(serverId);
      res.status(200).json({ message: "Server deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete server" });
    }
  });

  // Calendar routes
  app.get("/api/calendars", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

    try {
      const userId = req.user.id;
      const calendars = await storage.getCalendars(userId);
      res.json(calendars);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch calendars" });
    }
  });

  app.post("/api/calendars", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

    try {
      const { name, color, serverId } = req.body;
      if (!name || !serverId) {
        return res.status(400).json({ message: "Name and server ID are required" });
      }

      // Check if calendar with same name exists
      const existingCalendars = await storage.getCalendars(req.user.id);
      const calendarExists = existingCalendars.some(cal => cal.name.toLowerCase() === name.toLowerCase());
      
      if (calendarExists) {
        return res.status(400).json({ message: "Calendar with this name already exists" });
      }

      const server = await storage.getCaldavServer(serverId);
      if (!server) {
        return res.status(404).json({ message: "Server not found" });
      }

      if (server.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Initialize CalDAV client
      let serverUrl = server.url;
      if (serverUrl.includes('zpush.ajaydata.com/davical') && server.username) {
        serverUrl = `https://zpush.ajaydata.com/davical/caldav.php/${server.username}/`;
      }

      const caldav = new CalDAVClient(serverUrl, {
        type: server.authType as 'username' | 'token',
        username: server.username,
        password: server.password,
        token: server.token
      });

      // Create calendar on CalDAV server first
      const calendarUrl = `${serverUrl}${name}/`;
      await caldav.createCalendar(calendarUrl, name, color || '#3B82F6');

      // Then create in local storage
      const calendar = await storage.createCalendar({
        userId: req.user.id,
        serverId,
        name,
        color: color || '#3B82F6',
        url: calendarUrl
      });

      res.status(201).json(calendar);
    } catch (error) {
      console.error("Error creating calendar:", error);
      res.status(500).json({ message: "Failed to create calendar" });
    }
  });

  app.patch("/api/calendars/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

    try {
      const calendarId = parseInt(req.params.id);
      const calendar = await storage.getCalendar(calendarId);

      if (req.body.name) {
        // Check if another calendar with the new name exists
        const existingCalendars = await storage.getCalendars(req.user.id);
        const calendarExists = existingCalendars.some(cal => 
          cal.name.toLowerCase() === req.body.name.toLowerCase() && cal.id !== calendarId
        );
        
        if (calendarExists) {
          return res.status(400).json({ message: "Calendar with this name already exists" });
        }
      }

      if (!calendar) {
        return res.status(404).json({ message: "Calendar not found" });
      }

      if (calendar.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Get server details for CalDAV
      const server = await storage.getCaldavServer(calendar.serverId);
      if (!server) {
        return res.status(404).json({ message: "Server not found" });
      }

      // Initialize CalDAV client
      let serverUrl = server.url;
      if (serverUrl.includes('zpush.ajaydata.com/davical') && server.username) {
        serverUrl = `https://zpush.ajaydata.com/davical/caldav.php/${server.username}/`;
      }

      const auth = {
        type: server.authType as 'username' | 'token',
        username: server.username,
        password: server.password,
        token: server.token
      };

      const caldav = new CalDAVClient(serverUrl, auth);

      // Update calendar on CalDAV server first
      if (req.body.name || req.body.color) {
        await caldav.updateCalendar(calendar.url, req.body.name || calendar.name, req.body.color || calendar.color);
      }

      // Get calendar and server info first
      const calendar = await storage.getCalendar(calendarId);
      if (!calendar) {
        return res.status(404).json({ message: "Calendar not found" });
      }

      const server = await storage.getCaldavServer(calendar.serverId);
      if (!server) {
        return res.status(404).json({ message: "Server not found" });
      }

      const updates = {
        name: req.body.name,
        color: req.body.color
      };

      // Initialize CalDAV client
      const caldav = new CalDAVClient(server.url, {
        type: server.authType as 'username' | 'token',
        username: server.username,
        password: server.password,
        token: server.token
      });

      // Update on CalDAV server first
      await caldav.updateCalendar(
        calendar.url,
        updates.name || calendar.name,
        updates.color || calendar.color
      );

      // Then update in local storage
      const updatedCalendar = await storage.updateCalendar(calendarId, updates);
      res.json(updatedCalendar);
    } catch (error) {
      console.error('Failed to update calendar:', error);
      res.status(500).json({ message: "Failed to update calendar" });
    }
  });

  app.delete("/api/calendars/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

    try {
      const calendarId = parseInt(req.params.id);
      const calendar = await storage.getCalendar(calendarId);

      if (!calendar) {
        return res.status(404).json({ message: "Calendar not found" });
      }

      if (calendar.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Get server details for CalDAV
      const server = await storage.getCaldavServer(calendar.serverId);
      if (!server) {
        return res.status(404).json({ message: "Server not found" });
      }

      // Get count of events in this calendar
      const events = await storage.getEvents(req.user.id, calendarId);

      // Delete calendar from CalDAV server
      const caldav = new CalDAVClient(server.url, {
        type: server.authType as 'username' | 'token',
        username: server.username,
        password: server.password,
        token: server.token
      });

      try {
        // Delete calendar from CalDAV server
        await caldav.delete(calendar.url);
      } catch (error) {
        console.error('Error deleting calendar from CalDAV server:', error);
        // Continue with local deletion even if server deletion fails
      }

      // Delete all events and calendar from local storage
      await storage.deleteEventsForCalendar(calendarId);
      await storage.deleteCalendar(calendarId);

      res.status(200).json({ 
        message: "Calendar deleted successfully",
        deletedEvents: events.length 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete calendar" });
    }
  });

  // Event routes
  app.get("/api/events", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

    try {
      const userId = req.user.id;
      const calendarId = req.query.calendarId ? parseInt(req.query.calendarId as string) : undefined;

      // If calendarId is specified, verify the user has access to this calendar
      if (calendarId) {
        const calendar = await storage.getCalendar(calendarId);
        if (!calendar || calendar.userId !== userId) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }

      // Optional date range filtering
      const start = req.query.start ? new Date(req.query.start as string) : undefined;
      const end = req.query.end ? new Date(req.query.end as string) : undefined;

      if (calendarId && (start || end)) {
        // Fetch events directly from CalDAV server
        const calendar = await storage.getCalendar(calendarId);
        if (!calendar) {
          return res.status(404).json({ message: "Calendar not found" });
        }

        const server = await storage.getCaldavServer(calendar.serverId);
        if (!server) {
          return res.status(404).json({ message: "Server not found" });
        }

        let serverUrl = server.url;

        // For the DAViCal server, make sure we're pointing to the correct root location
        if (serverUrl.includes('zpush.ajaydata.com/davical') && server.username) {
          // Adjust the URL to point to the user's principal collection
          const principalUrl = `https://zpush.ajaydata.com/davical/caldav.php/${server.username}/`;
          console.log(`Using DAViCal adjusted URL for events: ${principalUrl}`);
          serverUrl = principalUrl;
        }

        const auth = {
          type: server.authType as 'username' | 'token',
          username: server.username,
          password: server.password,
          token: server.token
        };

        const caldav = new CalDAVClient(serverUrl, auth);
        const caldavEvents = await caldav.getEvents(calendar.url, start, end);

        // Sync with our database
        const events = [];

        try {
          for (const caldavEvent of caldavEvents) {
            try {
              let event = await storage.getEventByUID(caldavEvent.uid, calendarId);

              if (!event) {
                // Create new event in our database
                event = await storage.createEvent({
                  userId,
                  calendarId,
                  uid: caldavEvent.uid,
                  url: caldavEvent.url,
                  title: caldavEvent.title,
                  description: caldavEvent.description || null,
                  location: caldavEvent.location || null,
                  start: caldavEvent.start,
                  end: caldavEvent.end,
                  allDay: caldavEvent.allDay,
                  recurrence: caldavEvent.recurrence || null,
                  metadata: caldavEvent.metadata || null
                });
              }

              events.push(event);
            } catch (eventError) {
              console.error('Error processing individual event:', eventError);
              // Continue with other events even if one fails
              continue;
            }
          }

          // Return empty array if no events found
          res.json(events);
        } catch (eventsError) {
          console.error('Error processing events batch:', eventsError);
          res.json([]);  // Return empty array instead of error for new calendars
        }
      } else {
        // Fetch from local database
        const events = await storage.getEvents(userId, calendarId);
        res.json(events);
      }
    } catch (error) {
      res.status(500).json({ message: `Failed to fetch events: ${error.message}` });
    }
  });

  app.post("/api/events", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

    try {
      const userId = req.user.id;

      // Validate event data
      const validatedData = eventFormSchema.parse(req.body);
      const { calendarId } = validatedData;

      // Verify the user has access to this calendar
      const calendar = await storage.getCalendar(calendarId);
      if (!calendar || calendar.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Get server details for CalDAV
      const server = await storage.getCaldavServer(calendar.serverId);
      if (!server) {
        return res.status(404).json({ message: "Server not found" });
      }

      // Initialize CalDAV client
      let serverUrl = server.url;

      // For the DAViCal server, make sure we're pointing to the correct root location
      if (serverUrl.includes('zpush.ajaydata.com/davical') && server.username) {
        // Adjust the URL to point to the user's principal collection
        const principalUrl = `https://zpush.ajaydata.com/davical/caldav.php/${server.username}/`;
        console.log(`Using DAViCal adjusted URL for event creation: ${principalUrl}`);
        serverUrl = principalUrl;
      }

      const auth = {
        type: server.authType as 'username' | 'token',
        username: server.username,
        password: server.password,
        token: server.token
      };

      const caldav = new CalDAVClient(serverUrl, auth);

      // Create event on CalDAV server
      const startDate = new Date(validatedData.start);
      const endDate = new Date(validatedData.end);

      const caldavEvent = await caldav.createEvent(calendar.url, {
        title: validatedData.title,
        description: validatedData.description,
        location: validatedData.location,
        start: startDate,
        end: endDate,
        allDay: validatedData.allDay
      });

      // Save to local database
      const newEvent = await storage.createEvent({
        userId,
        calendarId,
        uid: caldavEvent.uid,
        url: caldavEvent.url,
        title: caldavEvent.title,
        description: caldavEvent.description || null,
        location: caldavEvent.location || null,
        start: caldavEvent.start,
        end: caldavEvent.end,
        allDay: caldavEvent.allDay,
        recurrence: null,
        metadata: null
      });

      res.status(201).json(newEvent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid event data", errors: error.errors });
      }
      console.error('Error creating event:', error);
      res.status(500).json({ message: `Failed to create event: ${error.message}`, error: error });
    }
  });

  app.patch("/api/events/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

    try {
      const eventId = parseInt(req.params.id);
      const userId = req.user.id;

      // Fetch event
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Verify ownership
      if (event.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Validate event data
      const validatedData = eventFormSchema.parse(req.body);

      // Get calendar and server info
      const calendar = await storage.getCalendar(event.calendarId);
      if (!calendar) {
        return res.status(404).json({ message: "Calendar not found" });
      }

      const server = await storage.getCaldavServer(calendar.serverId);
      if (!server) {
        return res.status(404).json({ message: "Server not found" });
      }

      // Initialize CalDAV client with base URL from server config
      const auth = {
        type: server.authType as 'username' | 'token',
        username: server.username,
        password: server.password,
        token: server.token
      };

      const caldav = new CalDAVClient(server.url, auth);

      // Update event on CalDAV server
      const startDate = new Date(validatedData.start);
      const endDate = new Date(validatedData.end);

      await caldav.updateEvent({
        uid: event.uid,
        url: event.url,
        title: validatedData.title,
        description: validatedData.description || '',
        location: validatedData.location || '',
        start: startDate,
        end: endDate,
        allDay: validatedData.allDay
      });

      // Update in local database
      const updatedEvent = await storage.updateEvent(eventId, {
        title: validatedData.title,
        description: validatedData.description || null,
        location: validatedData.location || null,
        start: startDate,
        end: endDate,
        allDay: validatedData.allDay
      });

      res.json(updatedEvent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid event data", errors: error.errors });
      }
      res.status(500).json({ message: `Failed to update event: ${error.message}` });
    }
  });

  app.delete("/api/events/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

    try {
      const eventId = parseInt(req.params.id);
      const userId = req.user.id;

      // Fetch event
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Verify ownership
      if (event.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Get calendar and server info
      const calendar = await storage.getCalendar(event.calendarId);
      if (!calendar) {
        return res.status(404).json({ message: "Calendar not found" });
      }

      const server = await storage.getCaldavServer(calendar.serverId);
      if (!server) {
        return res.status(404).json({ message: "Server not found" });
      }

      // Initialize CalDAV client
      let serverUrl = server.url;

      // For the DAViCal server, make sure we're pointing to the correct root location
      if (serverUrl.includes('zpush.ajaydata.com/davical') && server.username) {
        // Adjust the URL to point to the user's principal collection
        const principalUrl = `https://zpush.ajaydata.com/davical/caldav.php/${server.username}/`;
        console.log(`Using DAViCal adjusted URL for event deletion: ${principalUrl}`);
        serverUrl = principalUrl;
      }

      const auth = {
        type: server.authType as 'username' | 'token',
        username: server.username,
        password: server.password,
        token: server.token
      };

      const caldav = new CalDAVClient(serverUrl, auth);

      // Delete from CalDAV server
      await caldav.deleteEvent(event.url);

      // Delete from local database
      await storage.deleteEvent(eventId);

      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: `Failed to delete event: ${error.message}` });
    }
  });

  app.post("/api/calendars/discover", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

    try {
      const serverId = parseInt(req.body.serverId);
      if (isNaN(serverId)) {
        return res.status(400).json({ message: "Invalid server ID" });
      }

      const server = await storage.getCaldavServer(serverId);
      if (!server) {
        return res.status(404).json({ message: "Server not found" });
      }

      if (server.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      let serverUrl = server.url;
      if (serverUrl.includes('zpush.ajaydata.com/davical') && server.username) {
        serverUrl = `https://zpush.ajaydata.com/davical/caldav.php/${server.username}/`;
      }

      const caldav = new CalDAVClient(serverUrl, {
        type: server.authType,
        username: server.username,
        password: server.password,
        token: server.token
      });

      const discoveredCalendars = await caldav.discoverCalendars();

      // Save discovered calendars to database
      const saved = [];
      let discovered = 0;

      for (const cal of discoveredCalendars) {
        discovered++;
        const existingCal = await storage.getCalendars(req.user.id).then(cals => 
          cals.find(c => c.url === cal.url)
        );

        if (!existingCal) {
          const newCal = await storage.createCalendar({
            userId: req.user.id,
            serverId: server.id,
            name: cal.displayName,
            color: cal.color || '#3B82F6',
            url: cal.url
          });
          saved.push(newCal);
        }
      }

      res.json({ discovered, saved: saved.length });
    } catch (error) {
      console.error("Error discovering calendars:", error);
      res.status(500).json({ message: `Failed to discover calendars: ${error.message}` });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}