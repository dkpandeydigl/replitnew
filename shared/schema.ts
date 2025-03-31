
import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const caldavServers = pgTable("caldav_servers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  url: text("url").notNull(),
  username: text("username"),
  password: text("password"),
  token: text("token"),
  authType: text("auth_type").notNull(), // 'username' or 'token'
});

export const insertCaldavServerSchema = createInsertSchema(caldavServers).pick({
  userId: true,
  url: true,
  username: true,
  password: true,
  token: true,
  authType: true,
});

export type InsertCaldavServer = z.infer<typeof insertCaldavServerSchema>;
export type CaldavServer = typeof caldavServers.$inferSelect;

export const calendars = pgTable("calendars", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  serverId: integer("server_id").notNull().references(() => caldavServers.id),
  name: text("name").notNull(),
  color: text("color").notNull(),
  url: text("url").notNull().unique(),
});

export const insertCalendarSchema = createInsertSchema(calendars).pick({
  userId: true,
  serverId: true,
  name: true,
  color: true,
  url: true,
});

export type InsertCalendar = z.infer<typeof insertCalendarSchema>;
export type Calendar = typeof calendars.$inferSelect;

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  calendarId: integer("calendar_id").notNull().references(() => calendars.id),
  uid: text("uid").notNull(), // CalDAV UID
  url: text("url").notNull(), // CalDAV event URL
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  start: timestamp("start").notNull(),
  end: timestamp("end").notNull(),
  allDay: boolean("all_day").notNull().default(false),
  recurrence: text("recurrence"),
  metadata: json("metadata"),
});

export const insertEventSchema = createInsertSchema(events).pick({
  userId: true,
  calendarId: true,
  uid: true,
  url: true,
  title: true,
  description: true,
  location: true,
  start: true,
  end: true,
  allDay: true,
  recurrence: true,
  metadata: true,
});

// Schema for frontend event creation/update
export const eventFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  start: z.string().min(1, "Start date is required"),
  end: z.string().min(1, "End date is required"),
  allDay: z.boolean().default(false),
  calendarId: z.number().int().positive("Calendar selection is required"),
  timezone: z.string().optional(),
  attendees: z.array(z.object({
    email: z.string().email("Invalid email"),
    role: z.enum(['CHAIRMAN', 'SECRETARY', 'MEMBER']).optional(),
  })).default([]),
  resources: z.string().optional(),
  recurrence: z.object({
    frequency: z.enum(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
    interval: z.number().positive().optional(),
    count: z.number().positive().optional(),
    until: z.string().optional(),
    byDay: z.array(z.enum(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'])).optional(),
  }).optional(),
});

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;
export type EventFormData = z.infer<typeof eventFormSchema>;
