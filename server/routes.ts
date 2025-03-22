import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import multer from "multer";
import path from "path";
import fs from "fs";
import { WebSocketServer } from "ws";
import { insertPropertySchema, insertChatSchema, insertMessageSchema } from "@shared/schema";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage2 = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ 
  storage: storage2,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);
  
  // Serve uploaded files
  app.use("/uploads", express.static(uploadDir));
  
  // Properties API
  app.get("/api/properties", async (req, res) => {
    try {
      const { 
        type, minPrice, maxPrice, location, search,
        page = "1", limit = "12" 
      } = req.query;
      
      const parsedPage = parseInt(page as string) || 1;
      const parsedLimit = parseInt(limit as string) || 12;
      
      const properties = await storage.getProperties({
        propertyType: type as string, 
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        location: location as string,
        search: search as string,
        page: parsedPage,
        limit: parsedLimit
      });
      
      res.json(properties);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  app.get("/api/properties/:id", async (req, res) => {
    try {
      const property = await storage.getPropertyById(parseInt(req.params.id));
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  app.get("/api/properties/seller/:sellerId", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.id !== parseInt(req.params.sellerId)) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const properties = await storage.getPropertiesBySellerId(parseInt(req.params.sellerId));
      res.json(properties);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  app.post("/api/properties", upload.array("images", 4), async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== "seller") {
        return res.status(403).json({ message: "Only sellers can add properties" });
      }
      
      const files = req.files as Express.Multer.File[];
      const imagePaths = files.map(file => `/uploads/${file.filename}`);
      
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
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  app.put("/api/properties/:id", upload.array("newImages", 4), async (req, res) => {
    try {
      const propertyId = parseInt(req.params.id);
      const property = await storage.getPropertyById(propertyId);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      if (!req.isAuthenticated() || (req.user.id !== property.sellerId && req.user.role !== "admin")) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const files = req.files as Express.Multer.File[];
      const newImagePaths = files.map(file => `/uploads/${file.filename}`);
      
      // Keep existing images that weren't removed
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
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  app.delete("/api/properties/:id", async (req, res) => {
    try {
      const propertyId = parseInt(req.params.id);
      const property = await storage.getPropertyById(propertyId);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      if (!req.isAuthenticated() || (req.user.id !== property.sellerId && req.user.role !== "admin")) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      await storage.deleteProperty(propertyId);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  // Chat API
  app.get("/api/chats", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userId = req.user.id;
      const userRole = req.user.role;
      
      let chats;
      if (userRole === "buyer") {
        chats = await storage.getChatsByBuyerId(userId);
      } else {
        chats = await storage.getChatsBySellerId(userId);
      }
      
      res.json(chats);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  app.post("/api/chats", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== "buyer") {
        return res.status(403).json({ message: "Only buyers can initiate chats" });
      }
      
      const chatData = {
        ...req.body,
        buyerId: req.user.id
      };
      
      const validatedData = insertChatSchema.parse(chatData);
      
      // Check if chat already exists
      const existingChat = await storage.findChat(validatedData.buyerId, validatedData.sellerId, validatedData.propertyId);
      if (existingChat) {
        return res.status(200).json(existingChat);
      }
      
      const chat = await storage.createChat(validatedData);
      res.status(201).json(chat);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  app.get("/api/chats/:id/messages", async (req, res) => {
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
      
      const messages = await storage.getMessagesByChatId(chatId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  app.post("/api/messages", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { chatId, content } = req.body;
      const senderId = req.user.id;
      
      // Validate that the user is part of this chat
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
      res.status(400).json({ message: (error as Error).message });
    }
  });
  
  // User routes
  app.get("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password before sending the user data
      const { password, ...userData } = user;
      res.json(userData);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  // Admin routes
  app.get("/api/admin/properties", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const properties = await storage.getAllProperties();
      res.json(properties);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  app.get("/api/admin/users", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Set up WebSocket server for real-time chat on a separate path
  // to avoid conflicts with Vite's WebSocket server
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: "/ws/chat"
  });
  
  // Store active connections
  const clients = new Map();
  
  console.log("WebSocket server initialized on path: /ws/chat");
  
  wss.on("connection", (ws, req) => {
    console.log("New WebSocket connection established");
    
    // Extract user information from session or query params
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
        
        // Save message to database
        const messagePayload = {
          chatId,
          senderId,
          content
        };
        
        const validatedData = insertMessageSchema.parse(messagePayload);
        const message = await storage.createMessage(validatedData);
        
        // Get chat to find recipient
        const chat = await storage.getChatById(chatId);
        if (!chat) return;
        
        // Determine recipient based on sender
        const recipientId = senderId === chat.buyerId ? chat.sellerId : chat.buyerId;
        
        // Send message to recipient if online
        const recipientWs = clients.get(recipientId.toString());
        if (recipientWs) {
          console.log(`Sending message to recipient ${recipientId}`);
          recipientWs.send(JSON.stringify(message));
        }
        
        // Send confirmation back to sender
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


