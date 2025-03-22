import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import MainLayout from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Property, User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AvatarPlaceholder from "@/components/ui/avatar-placeholder";
import { ArrowLeft, Check, Loader2, MapPin, Phone } from "lucide-react";
import { formatCurrency, getInitials } from "@/lib/utils";

interface PropertyDetailResponse {
  property: Property;
  seller: Omit<User, "password">;
}

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [message, setMessage] = useState("");
  const [messageSent, setMessageSent] = useState(false);

  const {
    data,
    isLoading,
    error,
  } = useQuery<PropertyDetailResponse>({
    queryKey: [`/api/properties/${id}`],
    queryFn: async ({ queryKey }) => {
      const [path] = queryKey;
      const res = await fetch(path, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch property details");
      }

      return res.json();
    },
  });

  const startChatMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!data) return null;

      // First create or get existing chat
      const chatRes = await apiRequest("POST", "/api/chats", {
        buyerId: user?.id,
        sellerId: data.seller.id,
        propertyId: parseInt(id),
      });

      const chat = await chatRes.json();

      // Then send message if provided
      if (message) {
        await apiRequest("POST", `/api/chats/${chat.id}/messages`, {
          chatId: chat.id,
          senderId: user?.id,
          content: message,
        });
      }

      return chat;
    },
    onSuccess: (chat) => {
      if (message) {
        setMessageSent(true);
        setMessage("");
        toast({
          title: "Message sent",
          description: "Your message has been sent to the seller.",
        });
      }
      
      if (!message) {
        // If no message, navigate to inbox with chat selected
        navigate(`/inbox?chatId=${chat?.id}`);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    if (!user) {
      navigate("/auth");
      return;
    }

    if (user.role !== "buyer") {
      toast({
        title: "Only buyers can send messages",
        description: "You need to be logged in as a buyer to contact sellers.",
        variant: "destructive",
      });
      return;
    }

    startChatMutation.mutate(message);
  };

  const handleChatWithSeller = () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (user.role !== "buyer") {
      toast({
        title: "Only buyers can chat",
        description: "You need to be logged in as a buyer to chat with sellers.",
        variant: "destructive",
      });
      return;
    }

    startChatMutation.mutate("");
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 flex justify-center items-center min-h-[50vh]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (error || !data) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-red-50 p-6 rounded-lg text-center">
            <h2 className="text-xl font-bold text-red-800 mb-2">Error loading property</h2>
            <p className="text-red-700 mb-4">This property might not exist or has been removed.</p>
            <Button onClick={() => navigate("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Listings
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const { property, seller } = data;
  const isCurrentUserSeller = user?.id === seller.id;

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Back button */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to listings
          </Button>
        </div>

        {/* Property images */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {property.images.length > 0 ? (
              <>
                <div className="md:col-span-3 row-span-2 h-96 overflow-hidden rounded-lg">
                  <img
                    src={property.images[0]}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                {property.images.slice(1, 3).map((image, index) => (
                  <div key={index} className="h-44 overflow-hidden rounded-lg">
                    <img
                      src={image}
                      alt={`${property.title} view ${index + 2}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </>
            ) : (
              <div className="md:col-span-4 h-96 bg-neutral-100 flex items-center justify-center rounded-lg">
                <p className="text-neutral-500">No images available</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Property details */}
          <div className="lg:col-span-2">
            <Card className="p-6 mb-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-neutral-900 mb-1">{property.title}</h1>
                  <p className="text-neutral-600 flex items-center mb-1">
                    <MapPin className="h-4 w-4 mr-1" />
                    {property.address}
                  </p>
                  <p className="text-xl font-semibold text-neutral-900">{formatCurrency(property.price)}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2 mb-6">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                  <span className="text-neutral-700 capitalize">{property.propertyType}</span>
                </div>
                {property.bedrooms && (
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M7 2a1 1 0 00-.707 1.707L7 4.414v3.758a1 1 0 01-.293.707l-4 4C.817 14.769 2.156 18 4.828 18h10.343c2.673 0 4.012-3.231 2.122-5.121l-4-4A1 1 0 0113 8.172V4.414l.707-.707A1 1 0 0013 2H7zm2 6.172V4h2v4.172a3 3 0 00.879 2.12l1.027 1.028a4 4 0 00-2.171.102l-.47.156a4 4 0 01-2.53 0l-.563-.187a1.993 1.993 0 00-.114-.035l1.063-1.063A3 3 0 009 8.172z" />
                    </svg>
                    <span className="text-neutral-700">{property.bedrooms} bedrooms</span>
                  </div>
                )}
                {property.bathrooms && (
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                    </svg>
                    <span className="text-neutral-700">{property.bathrooms} bathrooms</span>
                  </div>
                )}
                {property.squareFeet && (
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v11.5A2.25 2.25 0 004.25 18h11.5A2.25 2.25 0 0018 15.75V4.25A2.25 2.25 0 0015.75 2H4.25zM3.5 4.25a.75.75 0 01.75-.75h11.5a.75.75 0 01.75.75v11.5a.75.75 0 01-.75.75H4.25a.75.75 0 01-.75-.75V4.25z" clipRule="evenodd" />
                    </svg>
                    <span className="text-neutral-700">{property.squareFeet} sq ft</span>
                  </div>
                )}
                {property.yearBuilt && (
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-neutral-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    <span className="text-neutral-700">Built in {property.yearBuilt}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-neutral-200 pt-6">
                <h2 className="text-lg font-semibold text-neutral-900 mb-3">Description</h2>
                <p className="text-neutral-700 whitespace-pre-line">{property.description}</p>
              </div>
            </Card>

            {/* Property features if any */}
            {(property.bedrooms || property.bathrooms || property.squareFeet || property.yearBuilt) && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-neutral-900 mb-3">Features & Amenities</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {property.bedrooms && (
                    <div className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2" />
                      <span className="text-neutral-700">{property.bedrooms} Bedrooms</span>
                    </div>
                  )}
                  {property.bathrooms && (
                    <div className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2" />
                      <span className="text-neutral-700">{property.bathrooms} Bathrooms</span>
                    </div>
                  )}
                  {property.squareFeet && (
                    <div className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2" />
                      <span className="text-neutral-700">{property.squareFeet} Square Feet</span>
                    </div>
                  )}
                  {property.yearBuilt && (
                    <div className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2" />
                      <span className="text-neutral-700">Built in {property.yearBuilt}</span>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Contact seller section */}
          <div className="lg:col-span-1">
            <Card className="p-6 mb-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Contact Seller</h2>
              <div className="flex items-center mb-4">
                <div className="mr-3">
                  <AvatarPlaceholder
                    initials={getInitials(seller.firstName, seller.lastName)}
                  />
                </div>
                <div>
                  <p className="font-medium text-neutral-900">{`${seller.firstName} ${seller.lastName}`}</p>
                  <p className="text-sm text-neutral-600">Property Seller</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 mb-4">
                {!isCurrentUserSeller && user?.role === "buyer" && (
                  <Button onClick={handleChatWithSeller} disabled={startChatMutation.isPending}>
                    {startChatMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                        </svg>
                        Chat with Seller
                      </>
                    )}
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="flex justify-center items-center w-full"
                >
                  <Phone className="mr-2 h-4 w-4" />
                  {property.contactNumber}
                </Button>
              </div>

              {!isCurrentUserSeller && user?.role === "buyer" && (
                <div className="mt-5 pt-5 border-t border-neutral-200">
                  <h3 className="font-medium text-neutral-900 mb-3">Send a Message</h3>
                  {messageSent ? (
                    <div className="bg-green-50 p-4 rounded-md text-green-800 mb-4">
                      <p className="flex items-center">
                        <Check className="h-5 w-5 mr-2" />
                        Message sent successfully!
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSendMessage}>
                      <div className="mb-3">
                        <Textarea
                          rows={4}
                          placeholder="I'm interested in this property..."
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          disabled={startChatMutation.isPending}
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={!message.trim() || startChatMutation.isPending}
                      >
                        {startChatMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Send Message
                      </Button>
                    </form>
                  )}
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Property Location</h2>
              <div className="bg-neutral-100 h-40 rounded-md mb-3 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <p className="text-neutral-700 text-sm flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                {property.address}
              </p>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
