import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { log } from "./vite";
import CalDAVClient from "./caldav";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSecret = process.env.SESSION_SECRET || randomBytes(32).toString('hex');
  log(`Using session secret: ${sessionSecret.substring(0, 5)}...`, 'auth');

  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Try to authenticate with DAViCal
        try {
          // Use the correct principal URL format for DAViCal
          const serverUrl = `https://zpush.ajaydata.com/davical/caldav.php/${username}/`;
          const caldav = new CalDAVClient(serverUrl, {
            type: 'username',
            username: username,
            password: password
          });

          // Test connection to verify credentials
          const isValid = await caldav.testConnection();
          if (isValid) {
            // Create or update local user if CalDAV auth succeeds
            const existingUser = await storage.getUserByUsername(username);
            let user;

            if (existingUser) {
              // Update existing user's password
              await storage.updateUser(existingUser.id, {
                password: await hashPassword(password)
              });
              user = existingUser;
            } else {
              // Create new user
              user = await storage.createUser({
                username,
                password: await hashPassword(password)
              });
            }

            // Store CalDAV server connection
            await storage.createCaldavServer({
              userId: user.id,
              url: serverUrl,
              authType: 'username',
              username,
              password,
            });

            return done(null, user);
          }
        } catch (caldavError) {
          console.error('CalDAV auth failed:', caldavError);
        }

        return done(null, false);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, email } = req.body;

      // Check if username exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Check if email exists
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Try to create user on CalDAV server first
      try {
        // First verify if user exists on CalDAV server
        const baseUrl = 'https://zpush.ajaydata.com/davical';
        // Use admin URL first to check/create user
        const adminUrl = `${baseUrl}/caldav.php/`;
        console.log('Verifying CalDAV account with URL:', adminUrl);
        
        const caldav = new CalDAVClient(adminUrl, {
          type: 'username',
          username: 'admin',  // Use admin credentials first
          password: process.env.DAVICAL_ADMIN_PASSWORD || 'admin'
        });

        // After admin verification, try user connection
        const principalUrl = `${baseUrl}/caldav.php/${username}/`;
        const userCaldav = new CalDAVClient(principalUrl, {
          type: 'username',
          username: username,
          password: password
        });

        // Test connection with retries
        let isValid = false;
        let attempts = 0;
        const maxAttempts = 3;

        while (!isValid && attempts < maxAttempts) {
          try {
            isValid = await caldav.testConnection();
            if (!isValid) {
              console.error(`CalDAV connection test failed, attempt ${attempts + 1} of ${maxAttempts}`);
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between attempts
            }
          } catch (connError) {
            console.error(`Connection attempt ${attempts + 1} failed:`, connError);
          }
          attempts++;
        }

        if (!isValid) {
          console.error('All CalDAV connection attempts failed');
          return res.status(400).json({ message: "Failed to create CalDAV account - could not establish connection" });
        }

        // Try to create a test calendar to verify write permissions
        try {
          await caldav.createCalendar(
            `${username}/test-calendar/`,
            'Test Calendar',
            '#3B82F6'
          );
        } catch (calendarError) {
          console.error('Failed to create test calendar:', calendarError);
          return res.status(400).json({ message: "Failed to create CalDAV account - insufficient permissions" });
        }

        // Create local user
        const user = await storage.createUser({
          username,
          password: await hashPassword(password),
        });

        // Create CalDAV server entry
        await storage.createCaldavServer({
          userId: user.id,
          url: serverUrl,
          authType: 'username',
          username,
          password,
        });

        req.login(user, (err) => {
          if (err) return next(err);
          res.status(201).json(user);
        });
      } catch (caldavError) {
        console.error('Failed to create CalDAV account:', caldavError);
        return res.status(400).json({ message: "Failed to create CalDAV account" });
      }
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Invalid credentials" });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}