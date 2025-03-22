import { users, properties, chats, messages } from "@shared/schema";
import type { 
  InsertUser, User, 
  InsertProperty, Property, 
  InsertChat, Chat,
  InsertMessage, Message 
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Filter options for property search
interface PropertyFilters {
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Property methods
  getProperties(filters: PropertyFilters): Promise<{ properties: Property[], total: number }>;
  getPropertyById(id: number): Promise<Property | undefined>;
  getPropertiesBySellerId(sellerId: number): Promise<Property[]>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: number, property: Partial<InsertProperty>): Promise<Property>;
  deleteProperty(id: number): Promise<void>;
  getAllProperties(): Promise<Property[]>;

  // Chat methods
  getChatById(id: number): Promise<Chat | undefined>;
  getChatsByBuyerId(buyerId: number): Promise<(Chat & { property: Property, seller: User })[]>;
  getChatsBySellerId(sellerId: number): Promise<(Chat & { property: Property, buyer: User })[]>;
  findChat(buyerId: number, sellerId: number, propertyId: number): Promise<Chat | undefined>;
  createChat(chat: InsertChat): Promise<Chat>;

  // Message methods
  getMessagesByChatId(chatId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private usersData: Map<number, User>;
  private propertiesData: Map<number, Property>;
  private chatsData: Map<number, Chat>;
  private messagesData: Map<number, Message>;
  sessionStore: session.SessionStore;
  private userIdCounter: number;
  private propertyIdCounter: number;
  private chatIdCounter: number;
  private messageIdCounter: number;

  constructor() {
    this.usersData = new Map();
    this.propertiesData = new Map();
    this.chatsData = new Map();
    this.messagesData = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    this.userIdCounter = 1;
    this.propertyIdCounter = 1;
    this.chatIdCounter = 1;
    this.messageIdCounter = 1;

    // Create admin user
    this.createUser({
      username: "admin",
      password: "$2b$10$Y4vVfseJ2yY6gbF956qyAeXD.9Bj1l2LYv6JBNJkjiBxs/P3YiwIW", // hashed "admin123"
      email: "admin@estatetify.com",
      firstName: "Admin",
      lastName: "User",
      role: "admin",
      phoneNumber: "123-456-7890"
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.usersData.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.usersData.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(data: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const user: User = { ...data, id, createdAt: now };
    this.usersData.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.usersData.values());
  }

  // Property methods
  async getProperties(filters: PropertyFilters = {}): Promise<{ properties: Property[], total: number }> {
    let properties = Array.from(this.propertiesData.values());

    // Apply filters
    if (filters.propertyType) {
      properties = properties.filter(p => p.propertyType === filters.propertyType);
    }
    
    if (filters.minPrice !== undefined) {
      properties = properties.filter(p => p.price >= filters.minPrice!);
    }
    
    if (filters.maxPrice !== undefined) {
      properties = properties.filter(p => p.price <= filters.maxPrice!);
    }
    
    if (filters.location) {
      properties = properties.filter(p => 
        p.address.toLowerCase().includes(filters.location!.toLowerCase())
      );
    }
    
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      properties = properties.filter(p => 
        p.title.toLowerCase().includes(searchTerm) || 
        p.description.toLowerCase().includes(searchTerm) ||
        p.address.toLowerCase().includes(searchTerm)
      );
    }

    // Sort by newest first
    properties.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const total = properties.length;
    
    // Pagination
    if (filters.page && filters.limit) {
      const startIndex = (filters.page - 1) * filters.limit;
      properties = properties.slice(startIndex, startIndex + filters.limit);
    }

    return { properties, total };
  }

  async getPropertyById(id: number): Promise<Property | undefined> {
    return this.propertiesData.get(id);
  }

  async getPropertiesBySellerId(sellerId: number): Promise<Property[]> {
    return Array.from(this.propertiesData.values()).filter(
      (property) => property.sellerId === sellerId
    );
  }

  async createProperty(data: InsertProperty): Promise<Property> {
    const id = this.propertyIdCounter++;
    const now = new Date();
    const property: Property = { 
      ...data, 
      id, 
      active: true,
      createdAt: now, 
      updatedAt: now 
    };
    this.propertiesData.set(id, property);
    return property;
  }

  async updateProperty(id: number, data: Partial<InsertProperty>): Promise<Property> {
    const property = this.propertiesData.get(id);
    if (!property) {
      throw new Error("Property not found");
    }
    
    const updatedProperty: Property = {
      ...property,
      ...data,
      updatedAt: new Date()
    };
    
    this.propertiesData.set(id, updatedProperty);
    return updatedProperty;
  }

  async deleteProperty(id: number): Promise<void> {
    this.propertiesData.delete(id);
  }

  async getAllProperties(): Promise<Property[]> {
    return Array.from(this.propertiesData.values());
  }

  // Chat methods
  async getChatById(id: number): Promise<Chat | undefined> {
    return this.chatsData.get(id);
  }

  async getChatsByBuyerId(buyerId: number): Promise<(Chat & { property: Property, seller: User })[]> {
    const chats = Array.from(this.chatsData.values()).filter(
      (chat) => chat.buyerId === buyerId
    );
    
    return Promise.all(
      chats.map(async (chat) => {
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

  async getChatsBySellerId(sellerId: number): Promise<(Chat & { property: Property, buyer: User })[]> {
    const chats = Array.from(this.chatsData.values()).filter(
      (chat) => chat.sellerId === sellerId
    );
    
    return Promise.all(
      chats.map(async (chat) => {
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

  async findChat(buyerId: number, sellerId: number, propertyId: number): Promise<Chat | undefined> {
    return Array.from(this.chatsData.values()).find(
      (chat) => 
        chat.buyerId === buyerId && 
        chat.sellerId === sellerId && 
        chat.propertyId === propertyId
    );
  }

  async createChat(data: InsertChat): Promise<Chat> {
    const id = this.chatIdCounter++;
    const now = new Date();
    const chat: Chat = { ...data, id, createdAt: now };
    this.chatsData.set(id, chat);
    return chat;
  }

  // Message methods
  async getMessagesByChatId(chatId: number): Promise<Message[]> {
    const messages = Array.from(this.messagesData.values()).filter(
      (message) => message.chatId === chatId
    );
    
    // Sort by timestamp
    return messages.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  async createMessage(data: InsertMessage): Promise<Message> {
    const id = this.messageIdCounter++;
    const now = new Date();
    const message: Message = { ...data, id, timestamp: now };
    this.messagesData.set(id, message);
    return message;
  }
}

export const storage = new MemStorage();
