import { users, type User, type InsertUser, type CaldavServer, type InsertCaldavServer, type Calendar, type InsertCalendar, type Event, type InsertEvent } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Server operations
  getCaldavServers(userId: number): Promise<CaldavServer[]>;
  getCaldavServer(id: number): Promise<CaldavServer | undefined>;
  createCaldavServer(server: InsertCaldavServer): Promise<CaldavServer>;
  updateCaldavServer(id: number, server: Partial<InsertCaldavServer>): Promise<CaldavServer | undefined>;
  deleteCaldavServer(id: number): Promise<boolean>;
  
  // Calendar operations
  getCalendars(userId: number): Promise<Calendar[]>;
  getCalendar(id: number): Promise<Calendar | undefined>;
  createCalendar(calendar: InsertCalendar): Promise<Calendar>;
  updateCalendar(id: number, calendar: Partial<InsertCalendar>): Promise<Calendar | undefined>;
  deleteCalendar(id: number): Promise<boolean>;
  
  // Event operations
  getEvents(userId: number, calendarId?: number): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  getEventByUID(uid: string, calendarId: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<boolean>;

  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  // Data stores
  private users: Map<number, User>;
  private caldavServers: Map<number, CaldavServer>;
  private calendars: Map<number, Calendar>;
  private events: Map<number, Event>;
  
  // Counters for IDs
  private userIdCounter: number;
  private serverIdCounter: number;
  private calendarIdCounter: number;
  private eventIdCounter: number;
  
  // Session store
  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.caldavServers = new Map();
    this.calendars = new Map();
    this.events = new Map();
    
    this.userIdCounter = 1;
    this.serverIdCounter = 1;
    this.calendarIdCounter = 1;
    this.eventIdCounter = 1;

    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;
    
    const updatedUser = { ...existingUser, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // CalDAV Server methods
  async getCaldavServers(userId: number): Promise<CaldavServer[]> {
    return Array.from(this.caldavServers.values()).filter(
      (server) => server.userId === userId
    );
  }

  async getCaldavServer(id: number): Promise<CaldavServer | undefined> {
    return this.caldavServers.get(id);
  }

  async createCaldavServer(server: InsertCaldavServer): Promise<CaldavServer> {
    const id = this.serverIdCounter++;
    const newServer: CaldavServer = { ...server, id };
    this.caldavServers.set(id, newServer);
    return newServer;
  }

  async updateCaldavServer(id: number, server: Partial<InsertCaldavServer>): Promise<CaldavServer | undefined> {
    const existingServer = this.caldavServers.get(id);
    if (!existingServer) return undefined;
    
    const updatedServer = { ...existingServer, ...server };
    this.caldavServers.set(id, updatedServer);
    return updatedServer;
  }

  async deleteCaldavServer(id: number): Promise<boolean> {
    return this.caldavServers.delete(id);
  }

  // Calendar methods
  async getCalendars(userId: number): Promise<Calendar[]> {
    return Array.from(this.calendars.values()).filter(
      (calendar) => calendar.userId === userId
    );
  }

  async getCalendar(id: number): Promise<Calendar | undefined> {
    return this.calendars.get(id);
  }

  async createCalendar(calendar: InsertCalendar): Promise<Calendar> {
    const id = this.calendarIdCounter++;
    const newCalendar: Calendar = { ...calendar, id };
    this.calendars.set(id, newCalendar);
    return newCalendar;
  }

  async updateCalendar(id: number, calendar: Partial<InsertCalendar>): Promise<Calendar | undefined> {
    const existingCalendar = this.calendars.get(id);
    if (!existingCalendar) return undefined;
    
    const updatedCalendar = { ...existingCalendar, ...calendar };
    this.calendars.set(id, updatedCalendar);
    return updatedCalendar;
  }

  async deleteCalendar(id: number): Promise<boolean> {
    return this.calendars.delete(id);
  }

  // Event methods
  async getEvents(userId: number, calendarId?: number): Promise<Event[]> {
    let events = Array.from(this.events.values()).filter(
      (event) => event.userId === userId
    );
    
    if (calendarId) {
      events = events.filter(event => event.calendarId === calendarId);
    }
    
    return events;
  }

  async getEvent(id: number): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async getEventByUID(uid: string, calendarId: number): Promise<Event | undefined> {
    return Array.from(this.events.values()).find(
      (event) => event.uid === uid && event.calendarId === calendarId
    );
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const id = this.eventIdCounter++;
    const newEvent: Event = { ...event, id };
    this.events.set(id, newEvent);
    return newEvent;
  }

  async updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event | undefined> {
    const existingEvent = this.events.get(id);
    if (!existingEvent) return undefined;
    
    const updatedEvent = { ...existingEvent, ...event };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }

  async deleteEvent(id: number): Promise<boolean> {
    return this.events.delete(id);
  }
}

export const storage = new MemStorage();
