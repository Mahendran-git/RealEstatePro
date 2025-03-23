// server/index.ts
import express3 from "express";

// server/routes.ts
import express from "express";
import { createServer } from "http";

// server/storage.ts
import session from "express-session";
import createMemoryStore from "memorystore";
var MemoryStore = createMemoryStore(session);
var MemStorage = class {
  usersData;
  propertiesData;
  chatsData;
  messagesData;
  sessionStore;
  userIdCounter;
  propertyIdCounter;
  chatIdCounter;
  messageIdCounter;
  constructor() {
    this.usersData = /* @__PURE__ */ new Map();
    this.propertiesData = /* @__PURE__ */ new Map();
    this.chatsData = /* @__PURE__ */ new Map();
    this.messagesData = /* @__PURE__ */ new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 864e5
      // prune expired entries every 24h
    });
    this.userIdCounter = 1;
    this.propertyIdCounter = 1;
    this.chatIdCounter = 1;
    this.messageIdCounter = 1;
    this.createUser({
      username: "admin",
      password: "$2b$10$Y4vVfseJ2yY6gbF956qyAeXD.9Bj1l2LYv6JBNJkjiBxs/P3YiwIW",
      // hashed "admin123"
      email: "admin@estatetify.com",
      firstName: "Admin",
      lastName: "User",
      role: "admin",
      phoneNumber: "123-456-7890"
    });
  }
  // User methods
  async getUser(id) {
    return this.usersData.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.usersData.values()).find(
      (user) => user.username === username
    );
  }
  async createUser(data) {
    const id = this.userIdCounter++;
    const now = /* @__PURE__ */ new Date();
    const user = { ...data, id, createdAt: now };
    this.usersData.set(id, user);
    return user;
  }
  async getAllUsers() {
    return Array.from(this.usersData.values());
  }
  // Property methods
  async getProperties(filters = {}) {
    let properties2 = Array.from(this.propertiesData.values());
    if (filters.propertyType) {
      properties2 = properties2.filter((p) => p.propertyType === filters.propertyType);
    }
    if (filters.minPrice !== void 0) {
      properties2 = properties2.filter((p) => p.price >= filters.minPrice);
    }
    if (filters.maxPrice !== void 0) {
      properties2 = properties2.filter((p) => p.price <= filters.maxPrice);
    }
    if (filters.location) {
      properties2 = properties2.filter(
        (p) => p.address.toLowerCase().includes(filters.location.toLowerCase())
      );
    }
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      properties2 = properties2.filter(
        (p) => p.title.toLowerCase().includes(searchTerm) || p.description.toLowerCase().includes(searchTerm) || p.address.toLowerCase().includes(searchTerm)
      );
    }
    properties2.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const total = properties2.length;
    if (filters.page && filters.limit) {
      const startIndex = (filters.page - 1) * filters.limit;
      properties2 = properties2.slice(startIndex, startIndex + filters.limit);
    }
    return { properties: properties2, total };
  }
  async getPropertyById(id) {
    return this.propertiesData.get(id);
  }
  async getPropertiesBySellerId(sellerId) {
    return Array.from(this.propertiesData.values()).filter(
      (property) => property.sellerId === sellerId
    );
  }
  async createProperty(data) {
    const id = this.propertyIdCounter++;
    const now = /* @__PURE__ */ new Date();
    const property = {
      ...data,
      id,
      active: true,
      createdAt: now,
      updatedAt: now
    };
    this.propertiesData.set(id, property);
    return property;
  }
  async updateProperty(id, data) {
    const property = this.propertiesData.get(id);
    if (!property) {
      throw new Error("Property not found");
    }
    const updatedProperty = {
      ...property,
      ...data,
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.propertiesData.set(id, updatedProperty);
    return updatedProperty;
  }
  async deleteProperty(id) {
    this.propertiesData.delete(id);
  }
  async getAllProperties() {
    return Array.from(this.propertiesData.values());
  }
  // Chat methods
  async getChatById(id) {
    return this.chatsData.get(id);
  }
  async getChatsByBuyerId(buyerId) {
    const chats2 = Array.from(this.chatsData.values()).filter(
      (chat) => chat.buyerId === buyerId
    );
    return Promise.all(
      chats2.map(async (chat) => {
        const property = await this.getPropertyById(chat.propertyId);
        const seller = await this.getUser(chat.sellerId);
        if (!property || !seller) {
          throw new Error("Property or seller not found");
        }
        return {
          ...chat,
          property,
          seller
        };
      })
    );
  }
  async getChatsBySellerId(sellerId) {
    const chats2 = Array.from(this.chatsData.values()).filter(
      (chat) => chat.sellerId === sellerId
    );
    return Promise.all(
      chats2.map(async (chat) => {
        const property = await this.getPropertyById(chat.propertyId);
        const buyer = await this.getUser(chat.buyerId);
        if (!property || !buyer) {
          throw new Error("Property or buyer not found");
        }
        return {
          ...chat,
          property,
          buyer
        };
      })
    );
  }
  async findChat(buyerId, sellerId, propertyId) {
    return Array.from(this.chatsData.values()).find(
      (chat) => chat.buyerId === buyerId && chat.sellerId === sellerId && chat.propertyId === propertyId
    );
  }
  async createChat(data) {
    const id = this.chatIdCounter++;
    const now = /* @__PURE__ */ new Date();
    const chat = { ...data, id, createdAt: now };
    this.chatsData.set(id, chat);
    return chat;
  }
  // Message methods
  async getMessagesByChatId(chatId) {
    const messages2 = Array.from(this.messagesData.values()).filter(
      (message) => message.chatId === chatId
    );
    return messages2.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }
  async createMessage(data) {
    const id = this.messageIdCounter++;
    const now = /* @__PURE__ */ new Date();
    const message = { ...data, id, timestamp: now };
    this.messagesData.set(id, message);
    return message;
  }
};
var storage = new MemStorage();

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session2 from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

// shared/schema.ts
import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().default("buyer"),
  // 'buyer' or 'seller'
  phoneNumber: text("phone_number"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
});
var properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").notNull(),
  title: text("title").notNull(),
  address: text("address").notNull(),
  price: doublePrecision("price").notNull(),
  contactNumber: text("contact_number").notNull(),
  propertyType: text("property_type").notNull(),
  // 'plot', 'house', 'apartment', 'land'
  description: text("description").notNull(),
  images: text("images").array().notNull(),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  squareFeet: integer("square_feet"),
  yearBuilt: integer("year_built"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var chats = pgTable("chats", {
  id: serial("id").primaryKey(),
  buyerId: integer("buyer_id").notNull(),
  sellerId: integer("seller_id").notNull(),
  propertyId: integer("property_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var insertChatSchema = createInsertSchema(chats).omit({
  id: true,
  createdAt: true
});
var messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").notNull(),
  senderId: integer("sender_id").notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull()
});
var insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  timestamp: true
});
var loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

// server/auth.ts
import { z as z2 } from "zod";
var scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
function setupAuth(app2) {
  const sessionSecret = process.env.SESSION_SECRET || "estatetify-secret-key";
  const sessionSettings = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1e3
      // 30 days
    }
  };
  app2.set("trust proxy", 1);
  app2.use(session2(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !await comparePasswords(password, user.password)) {
          return done(null, false, { message: "Invalid username or password" });
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    })
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
  app2.post("/api/register", async (req, res, next) => {
    try {
      const userData = req.body;
      const userSchema = insertUserSchema.extend({
        password: z2.string().min(6, "Password must be at least 6 characters"),
        confirmPassword: z2.string().optional()
      }).refine((data) => !data.confirmPassword || data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"]
      });
      const validatedData = userSchema.parse(userData);
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const hashedPassword = await hashPassword(validatedData.password);
      const { confirmPassword, ...userDataWithoutConfirm } = validatedData;
      const user = await storage.createUser({
        ...userDataWithoutConfirm,
        password: hashedPassword
      });
      const { password, ...userWithoutPassword } = user;
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.errors
        });
      }
      next(error);
    }
  });
  app2.post("/api/login", (req, res, next) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      passport.authenticate("local", (err, user, info) => {
        if (err) return next(err);
        if (!user) {
          return res.status(401).json({ message: info?.message || "Invalid username or password" });
        }
        req.login(user, (err2) => {
          if (err2) return next(err2);
          const { password, ...userWithoutPassword } = user;
          return res.json(userWithoutPassword);
        });
      })(req, res, next);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.errors
        });
      }
      next(error);
    }
  });
  app2.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });
  app2.post("/api/admin/verify", (req, res) => {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD || password === "admin123") {
      return res.status(200).json({ verified: true });
    }
    return res.status(401).json({ verified: false, message: "Invalid admin password" });
  });
}

// server/routes.ts
import multer from "multer";
import path from "path";
import fs from "fs";
import { WebSocketServer } from "ws";
var uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
var storage2 = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
var upload = multer({
  storage: storage2,
  limits: { fileSize: 10 * 1024 * 1024 },
  // 10MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Error: Images only!"));
  }
});
async function registerRoutes(app2) {
  setupAuth(app2);
  app2.use("/uploads", express.static(uploadDir));
  app2.get("/api/properties", async (req, res) => {
    try {
      const {
        type,
        minPrice,
        maxPrice,
        location,
        search,
        page = "1",
        limit = "12"
      } = req.query;
      const parsedPage = parseInt(page) || 1;
      const parsedLimit = parseInt(limit) || 12;
      const properties2 = await storage.getProperties({
        propertyType: type,
        minPrice: minPrice ? parseFloat(minPrice) : void 0,
        maxPrice: maxPrice ? parseFloat(maxPrice) : void 0,
        location,
        search,
        page: parsedPage,
        limit: parsedLimit
      });
      res.json(properties2);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/properties/:id", async (req, res) => {
    try {
      const property = await storage.getPropertyById(parseInt(req.params.id));
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/properties/seller/:sellerId", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.id !== parseInt(req.params.sellerId)) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      const properties2 = await storage.getPropertiesBySellerId(parseInt(req.params.sellerId));
      res.json(properties2);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/properties", upload.array("images", 4), async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== "seller") {
        return res.status(403).json({ message: "Only sellers can add properties" });
      }
      const files = req.files;
      const imagePaths = files.map((file) => `/uploads/${file.filename}`);
      const propertyData = {
        ...req.body,
        sellerId: req.user.id,
        price: parseFloat(req.body.price),
        bedrooms: req.body.bedrooms ? parseInt(req.body.bedrooms) : null,
        bathrooms: req.body.bathrooms ? parseInt(req.body.bathrooms) : null,
        squareFeet: req.body.squareFeet ? parseInt(req.body.squareFeet) : null,
        yearBuilt: req.body.yearBuilt ? parseInt(req.body.yearBuilt) : null,
        images: imagePaths
      };
      const validatedData = insertPropertySchema.parse(propertyData);
      const property = await storage.createProperty(validatedData);
      res.status(201).json(property);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.put("/api/properties/:id", upload.array("newImages", 4), async (req, res) => {
    try {
      const propertyId = parseInt(req.params.id);
      const property = await storage.getPropertyById(propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      if (!req.isAuthenticated() || req.user.id !== property.sellerId && req.user.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      const files = req.files;
      const newImagePaths = files.map((file) => `/uploads/${file.filename}`);
      const keepImages = req.body.keepImages ? JSON.parse(req.body.keepImages) : [];
      const images = [...keepImages, ...newImagePaths];
      const propertyData = {
        ...req.body,
        sellerId: property.sellerId,
        price: parseFloat(req.body.price),
        bedrooms: req.body.bedrooms ? parseInt(req.body.bedrooms) : null,
        bathrooms: req.body.bathrooms ? parseInt(req.body.bathrooms) : null,
        squareFeet: req.body.squareFeet ? parseInt(req.body.squareFeet) : null,
        yearBuilt: req.body.yearBuilt ? parseInt(req.body.yearBuilt) : null,
        images
      };
      const updatedProperty = await storage.updateProperty(propertyId, propertyData);
      res.json(updatedProperty);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.delete("/api/properties/:id", async (req, res) => {
    try {
      const propertyId = parseInt(req.params.id);
      const property = await storage.getPropertyById(propertyId);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      if (!req.isAuthenticated() || req.user.id !== property.sellerId && req.user.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }
      await storage.deleteProperty(propertyId);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/chats", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = req.user.id;
      const userRole = req.user.role;
      let chats2;
      if (userRole === "buyer") {
        chats2 = await storage.getChatsByBuyerId(userId);
      } else {
        chats2 = await storage.getChatsBySellerId(userId);
      }
      res.json(chats2);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/chats", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== "buyer") {
        return res.status(403).json({ message: "Only buyers can initiate chats" });
      }
      const chatData = {
        ...req.body,
        buyerId: req.user.id
      };
      const validatedData = insertChatSchema.parse(chatData);
      const existingChat = await storage.findChat(validatedData.buyerId, validatedData.sellerId, validatedData.propertyId);
      if (existingChat) {
        return res.status(200).json(existingChat);
      }
      const chat = await storage.createChat(validatedData);
      res.status(201).json(chat);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.get("/api/chats/:id/messages", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const chatId = parseInt(req.params.id);
      const chat = await storage.getChatById(chatId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      if (chat.buyerId !== req.user.id && chat.sellerId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      const messages2 = await storage.getMessagesByChatId(chatId);
      res.json(messages2);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/messages", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { chatId, content } = req.body;
      const senderId = req.user.id;
      const chat = await storage.getChatById(parseInt(chatId));
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      if (chat.buyerId !== senderId && chat.sellerId !== senderId) {
        return res.status(403).json({ message: "You are not a participant in this chat" });
      }
      const messageData = {
        chatId: parseInt(chatId),
        senderId,
        content
      };
      const validatedData = insertMessageSchema.parse(messageData);
      const message = await storage.createMessage(validatedData);
      res.status(200).json(message);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.get("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...userData } = user;
      res.json(userData);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/admin/properties", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const properties2 = await storage.getAllProperties();
      res.json(properties2);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/admin/users", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const users2 = await storage.getAllUsers();
      res.json(users2);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  const httpServer = createServer(app2);
  const wss = new WebSocketServer({
    server: httpServer,
    path: "/ws/chat"
  });
  const clients = /* @__PURE__ */ new Map();
  console.log("WebSocket server initialized on path: /ws/chat");
  wss.on("connection", (ws, req) => {
    console.log("New WebSocket connection established");
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const userId = url.searchParams.get("userId");
    if (userId) {
      console.log(`User ${userId} connected to WebSocket`);
      clients.set(userId, ws);
    }
    ws.on("message", async (messageData) => {
      try {
        const { chatId, senderId, content } = JSON.parse(messageData.toString());
        console.log(`Received message from user ${senderId} in chat ${chatId}`);
        const messagePayload = {
          chatId,
          senderId,
          content
        };
        const validatedData = insertMessageSchema.parse(messagePayload);
        const message = await storage.createMessage(validatedData);
        const chat = await storage.getChatById(chatId);
        if (!chat) return;
        const recipientId = senderId === chat.buyerId ? chat.sellerId : chat.buyerId;
        const recipientWs = clients.get(recipientId.toString());
        if (recipientWs) {
          console.log(`Sending message to recipient ${recipientId}`);
          recipientWs.send(JSON.stringify(message));
        }
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });
    ws.on("close", () => {
      if (userId) {
        console.log(`User ${userId} disconnected from WebSocket`);
        clients.delete(userId);
      }
    });
  });
  return httpServer;
}

// server/vite.ts
import express2 from "express";
import fs2 from "fs";
import path3, { dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path2, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path2.resolve(__dirname, "client", "src"),
      "@shared": path2.resolve(__dirname, "shared")
    }
  },
  root: path2.resolve(__dirname, "client"),
  build: {
    outDir: path2.resolve(__dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = dirname2(__filename2);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        __dirname2,
        "..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(__dirname2, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express3();
app.use(express3.json());
app.use(express3.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
