import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import MainLayout from "@/components/layout/main-layout";
import PropertyCard from "@/components/property/property-card";
import SearchFilters from "@/components/property/search-filters";
import { Button } from "@/components/ui/button";
import { Property } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Pagination } from "@/components/ui/pagination";
import { Loader2 } from "lucide-react";

interface PropertyListResponse {
  properties: Property[];
  total: number;
}

export default function HomePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [page, setPage] = useState(1);
  const [limit] = useState(8);
  const [filters, setFilters] = useState({
    search: "",
    propertyType: "",
    minPrice: 0,
    maxPrice: 0,
    location: "",
  });

  // Fetch properties based on filters and pagination
  const {
    data,
    isLoading,
    error,
  } = useQuery<PropertyListResponse>({
    queryKey: [
      "/api/properties",
      page,
      limit,
      filters.search,
      filters.propertyType,
      filters.minPrice,
      filters.maxPrice,
      filters.location,
    ],
    queryFn: async ({ queryKey }) => {
      const [
        _path,
        page,
        limit,
        search,
        propertyType,
        minPrice,
        maxPrice,
        location,
      ] = queryKey;

      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      
      if (search) params.append("search", search.toString());
      if (propertyType) params.append("type", propertyType.toString());
      if (minPrice > 0) params.append("minPrice", minPrice.toString());
      if (maxPrice > 0) params.append("maxPrice", maxPrice.toString());
      if (location) params.append("location", location.toString());

      const res = await fetch(`/api/properties?${params.toString()}`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch properties");
      }

      return res.json();
    },
  });

  useEffect(() => {
    // Reset page to 1 when filters change
    setPage(1);
  }, [filters]);

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
  };

  const handleChatClick = async (propertyId: number, sellerId: number) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (user.role !== "buyer") {
      toast({
        title: "Only buyers can start chats",
        description: "You need to be logged in as a buyer to start a chat.",
        variant: "destructive",
      });
      return;
    }

    if (user.id === sellerId) {
      toast({
        title: "Cannot chat with yourself",
        description: "You cannot start a chat with your own property.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiRequest("POST", "/api/chats", {
        buyerId: user.id,
        sellerId,
        propertyId,
      });

      const chat = await response.json();
      navigate(`/inbox?chatId=${chat.id}`);
    } catch (error) {
      toast({
        title: "Error starting chat",
        description: "Failed to start chat with the seller. Please try again.",
        variant: "destructive",
      });
    }
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Search and Filters */}
        <SearchFilters onFilterChange={handleFilterChange} />

        {/* Property Listings */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-neutral-900 mb-6">
            {filters.search || filters.propertyType || filters.location || (filters.minPrice > 0) 
              ? "Search Results" 
              : "Featured Properties"}
          </h2>

          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="bg-red-50 p-4 rounded-md text-red-800 text-center">
              <p>Failed to load properties. Please try again later.</p>
            </div>
          ) : data?.properties.length === 0 ? (
            <div className="bg-neutral-50 p-8 rounded-lg text-center">
              <h3 className="text-lg font-medium text-neutral-900 mb-2">No properties found</h3>
              <p className="text-neutral-600 mb-4">
                Try adjusting your search filters to find more properties.
              </p>
              <Button onClick={() => setFilters({
                search: "",
                propertyType: "",
                minPrice: 0,
                maxPrice: 0,
                location: "",
              })}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {data?.properties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    onChatClick={handleChatClick}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-8">
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
