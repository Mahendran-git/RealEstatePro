import { create } from 'zustand';
import { Property } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

interface PropertyFilters {
  search: string;
  propertyType: string;
  minPrice: number;
  maxPrice: number;
  location: string;
  page: number;
  limit: number;
}

interface PropertyListResponse {
  properties: Property[];
  total: number;
}

interface PropertyState {
  isLoading: boolean;
  error: string | null;
  properties: Property[];
  totalProperties: number;
  currentPage: number;
  filters: PropertyFilters;
  
  // Actions
  setFilters: (filters: Partial<PropertyFilters>) => void;
  fetchProperties: () => Promise<void>;
  getPropertyById: (id: number) => Promise<Property | null>;
  
  // Seller actions
  sellerProperties: Property[];
  fetchSellerProperties: (sellerId: number) => Promise<void>;
  createProperty: (property: FormData) => Promise<Property | null>;
  updateProperty: (id: number, property: FormData) => Promise<Property | null>;
  deleteProperty: (id: number) => Promise<boolean>;
}

const usePropertyStore = create<PropertyState>((set, get) => ({
  isLoading: false,
  error: null,
  properties: [],
  totalProperties: 0,
  currentPage: 1,
  filters: {
    search: '',
    propertyType: '',
    minPrice: 0,
    maxPrice: 0,
    location: '',
    page: 1,
    limit: 12,
  },
  sellerProperties: [],
  
  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
      // Reset page to 1 when filters change
      currentPage: filters.page ?? 1,
    }));
  },
  
  fetchProperties: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const { filters } = get();
      const params = new URLSearchParams();
      params.append('page', filters.page.toString());
      params.append('limit', filters.limit.toString());
      
      if (filters.search) params.append('search', filters.search);
      if (filters.propertyType) params.append('type', filters.propertyType);
      if (filters.minPrice > 0) params.append('minPrice', filters.minPrice.toString());
      if (filters.maxPrice > 0) params.append('maxPrice', filters.maxPrice.toString());
      if (filters.location) params.append('location', filters.location);
      
      const response = await fetch(`/api/properties?${params.toString()}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch properties');
      }
      
      const data: PropertyListResponse = await response.json();
      
      set({
        properties: data.properties,
        totalProperties: data.total,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: (error as Error).message,
      });
    }
  },
  
  getPropertyById: async (id: number) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch(`/api/properties/${id}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch property');
      }
      
      const data = await response.json();
      
      set({ isLoading: false });
      return data.property;
    } catch (error) {
      set({
        isLoading: false,
        error: (error as Error).message,
      });
      return null;
    }
  },
  
  fetchSellerProperties: async (sellerId: number) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch(`/api/properties/seller/${sellerId}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch seller properties');
      }
      
      const data: Property[] = await response.json();
      
      set({
        sellerProperties: data,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: (error as Error).message,
      });
    }
  },
  
  createProperty: async (propertyData: FormData) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch('/api/properties', {
        method: 'POST',
        body: propertyData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create property');
      }
      
      const data: Property = await response.json();
      
      // Update seller properties
      set((state) => ({
        sellerProperties: [...state.sellerProperties, data],
        isLoading: false,
      }));
      
      return data;
    } catch (error) {
      set({
        isLoading: false,
        error: (error as Error).message,
      });
      return null;
    }
  },
  
  updateProperty: async (id: number, propertyData: FormData) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch(`/api/properties/${id}`, {
        method: 'PUT',
        body: propertyData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update property');
      }
      
      const data: Property = await response.json();
      
      // Update seller properties
      set((state) => ({
        sellerProperties: state.sellerProperties.map(p => 
          p.id === id ? data : p
        ),
        isLoading: false,
      }));
      
      return data;
    } catch (error) {
      set({
        isLoading: false,
        error: (error as Error).message,
      });
      return null;
    }
  },
  
  deleteProperty: async (id: number) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await apiRequest('DELETE', `/api/properties/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to delete property');
      }
      
      // Update seller properties
      set((state) => ({
        sellerProperties: state.sellerProperties.filter(p => p.id !== id),
        isLoading: false,
      }));
      
      return true;
    } catch (error) {
      set({
        isLoading: false,
        error: (error as Error).message,
      });
      return false;
    }
  },
}));

export default usePropertyStore;
