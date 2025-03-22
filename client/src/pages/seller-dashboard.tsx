import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import MainLayout from "@/components/layout/main-layout";
import PropertyForm from "@/components/property/property-form";
import { Button } from "@/components/ui/button";
import { Property } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PlusCircle, Pencil, Trash, Eye, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function SellerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [propertyToDelete, setPropertyToDelete] = useState<number | null>(null);

  const query = new URLSearchParams(location.split("?")[1] || "");
  const addParam = query.get("add");

  useEffect(() => {
    if (addParam === "true") {
      setShowAddForm(true);
    }
  }, [addParam]);

  // Fetch seller's properties
  const {
    data: properties,
    isLoading,
    error,
    refetch,
  } = useQuery<Property[]>({
    queryKey: [`/api/properties/seller/${user?.id}`],
    enabled: !!user && (user.role === "seller" || user.role === "admin"),
  });

  // Delete property mutation
  const deleteMutation = useMutation({
    mutationFn: async (propertyId: number) => {
      await apiRequest("DELETE", `/api/properties/${propertyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/properties/seller/${user?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Property deleted",
        description: "Your property has been deleted successfully",
      });
      setPropertyToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete property. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteConfirm = () => {
    if (propertyToDelete) {
      deleteMutation.mutate(propertyToDelete);
    }
  };

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    setShowAddForm(true);
  };

  const handleViewProperty = (propertyId: number) => {
    navigate(`/property/${propertyId}`);
  };

  const handleBackToList = () => {
    setShowAddForm(false);
    setEditingProperty(null);
    window.history.replaceState({}, "", "/seller/dashboard");
  };

  if (user?.role !== "seller" && user?.role !== "admin") {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-red-50 p-6 rounded-lg text-center">
            <h2 className="text-xl font-bold text-red-800 mb-2">Access Denied</h2>
            <p className="text-red-700 mb-4">You must be a seller to access this page.</p>
            <Button onClick={() => navigate("/")}>Go to Home</Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (showAddForm) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <PropertyForm
            property={editingProperty || undefined}
            onBack={handleBackToList}
          />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-neutral-900 sm:text-3xl sm:truncate">
              My Properties
            </h1>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <Button onClick={() => setShowAddForm(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Property
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white shadow rounded-lg p-12 flex justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="bg-red-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-700">Failed to load your properties. Please try again.</p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : properties && properties.length > 0 ? (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-neutral-200">
              <h2 className="text-lg font-semibold text-neutral-900">Your Listed Properties</h2>
              <p className="mt-1 text-sm text-neutral-500">Manage your property listings</p>
            </div>

            <ul className="divide-y divide-neutral-200">
              {properties.map((property) => (
                <li key={property.id} className="p-4 sm:px-6">
                  <div className="flex flex-col sm:flex-row">
                    <div className="flex-shrink-0 h-24 w-32 sm:h-32 sm:w-48 mb-4 sm:mb-0 sm:mr-6 overflow-hidden rounded-md">
                      <img
                        src={property.images[0] || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8cmVhbCUyMGVzdGF0ZXxlbnwwfHwwfHw%3D&w=1000&q=80"}
                        alt={property.title}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium text-neutral-900">{property.title}</h3>
                          <p className="text-lg font-semibold text-neutral-900">{formatCurrency(property.price)}</p>
                        </div>

                        <p className="text-neutral-600 text-sm mt-1 mb-2 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                          {property.address}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="px-2 py-1 text-xs rounded-md bg-blue-100 text-blue-800 capitalize">{property.propertyType}</span>
                          <span className="px-2 py-1 text-xs rounded-md bg-green-100 text-green-800">{property.active ? "Active" : "Inactive"}</span>
                          {property.bedrooms && (
                            <span className="px-2 py-1 text-xs rounded-md bg-neutral-100 text-neutral-800">{property.bedrooms} beds</span>
                          )}
                          {property.bathrooms && (
                            <span className="px-2 py-1 text-xs rounded-md bg-neutral-100 text-neutral-800">{property.bathrooms} baths</span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleEdit(property)}
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewProperty(property.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500 text-red-500 hover:bg-red-50"
                              onClick={() => setPropertyToDelete(property.id)}
                            >
                              <Trash className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this property listing. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setPropertyToDelete(null)}>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleDeleteConfirm}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                {deleteMutation.isPending && (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <h2 className="text-xl font-semibold text-neutral-900 mb-4">No Properties Listed</h2>
            <p className="text-neutral-600 mb-6">You haven't listed any properties yet. Get started by adding your first property.</p>
            <Button onClick={() => setShowAddForm(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Your First Property
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
