import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import MainLayout from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Property, User } from "@shared/schema";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Home, Users, MessageSquare, Eye, Trash, Search } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function AdminPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("properties");
  const [propertyToDelete, setPropertyToDelete] = useState<number | null>(null);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [verifyingPassword, setVerifyingPassword] = useState(false);

  // Only admin can access this page
  useEffect(() => {
    if (user && user.role !== "admin") {
      navigate("/");
      toast({
        title: "Access Denied",
        description: "Only administrators can access this page.",
        variant: "destructive",
      });
    }
  }, [user, navigate, toast]);

  // Verify admin password
  const verifyPassword = async () => {
    try {
      setVerifyingPassword(true);
      const response = await apiRequest("POST", "/api/admin/verify", { password: adminPassword });
      const data = await response.json();
      
      if (data.verified) {
        setIsPasswordVerified(true);
      } else {
        toast({
          title: "Invalid Password",
          description: "The admin password you entered is incorrect.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Verification Error",
        description: "An error occurred during verification.",
        variant: "destructive",
      });
    } finally {
      setVerifyingPassword(false);
    }
  };

  // Fetch all properties
  const {
    data: properties,
    isLoading: isPropertiesLoading,
    error: propertiesError,
  } = useQuery<Property[]>({
    queryKey: ["/api/admin/properties"],
    enabled: isPasswordVerified && activeTab === "properties",
  });

  // Fetch all users
  const {
    data: users,
    isLoading: isUsersLoading,
    error: usersError,
  } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: isPasswordVerified && activeTab === "users",
  });

  // Delete property mutation
  const deleteMutation = useMutation({
    mutationFn: async (propertyId: number) => {
      await apiRequest("DELETE", `/api/properties/${propertyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Property deleted",
        description: "The property has been deleted successfully",
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

  const handleViewProperty = (propertyId: number) => {
    navigate(`/property/${propertyId}`);
  };

  // Filter properties based on search term
  const filteredProperties = properties
    ? properties.filter(
        (property) =>
          property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          property.address.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  // Filter users based on search term
  const filteredUsers = users
    ? users.filter(
        (user) =>
          user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  if (!user || user.role !== "admin") {
    return null; // Protected route will handle redirect
  }

  if (!isPasswordVerified) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-6 max-w-md mx-auto mt-10">
            <h2 className="text-xl font-bold text-neutral-900 mb-4">Admin Verification</h2>
            <p className="text-neutral-600 mb-6">
              Please enter the admin password to access the admin panel.
            </p>
            
            <div className="space-y-4">
              <Input
                type="password"
                placeholder="Admin password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
              
              <Button 
                className="w-full" 
                onClick={verifyPassword}
                disabled={!adminPassword || verifyingPassword}
              >
                {verifyingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify Password
              </Button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-neutral-900 sm:text-3xl sm:truncate">
              Admin Dashboard
            </h1>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Properties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-primary rounded-md p-3 mr-4">
                  <Home className="h-5 w-5 text-white" />
                </div>
                <div className="text-2xl font-bold">
                  {properties ? properties.length : "-"}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-primary rounded-md p-3 mr-4">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div className="text-2xl font-bold">
                  {users ? users.length : "-"}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Sellers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-primary rounded-md p-3 mr-4">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <div className="text-2xl font-bold">
                  {users ? users.filter(user => user.role === "seller").length : "-"}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Tabs defaultValue="properties" value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-6">
              <TabsList>
                <TabsTrigger value="properties">Properties</TabsTrigger>
                <TabsTrigger value="users">Users</TabsTrigger>
              </TabsList>
              
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search..."
                  className="pl-8 w-[250px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <TabsContent value="properties">
              {isPropertiesLoading ? (
                <div className="bg-white p-12 rounded-md shadow flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : propertiesError ? (
                <div className="bg-red-50 p-6 rounded-lg">
                  <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
                  <p className="text-red-700">Failed to load properties. Please try again.</p>
                </div>
              ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Property</TableHead>
                        <TableHead>Seller</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date Added</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProperties.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6">
                            No properties found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredProperties.map((property) => {
                          const seller = users?.find((u) => u.id === property.sellerId);
                          
                          return (
                            <TableRow key={property.id}>
                              <TableCell>
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10 rounded overflow-hidden">
                                    <img
                                      src={property.images[0] || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8cmVhbCUyMGVzdGF0ZXxlbnwwfHwwfHw%3D&w=1000&q=80"}
                                      alt={property.title}
                                      className="h-10 w-10 object-cover"
                                    />
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-neutral-900">{property.title}</div>
                                    <div className="text-sm text-neutral-500">{property.address}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm text-neutral-900">
                                  {seller ? `${seller.firstName} ${seller.lastName}` : 'Unknown'}
                                </div>
                                <div className="text-sm text-neutral-500">
                                  {seller?.email || 'No email'}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm text-neutral-900">{formatCurrency(property.price)}</div>
                              </TableCell>
                              <TableCell>
                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  {property.active ? "Active" : "Inactive"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm text-neutral-500">
                                  {formatDate(property.createdAt)}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewProperty(property.id)}
                                  className="mr-1"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-500 hover:text-red-700"
                                      onClick={() => setPropertyToDelete(property.id)}
                                    >
                                      <Trash className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete the property listing. This action cannot be undone.
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
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="users">
              {isUsersLoading ? (
                <div className="bg-white p-12 rounded-md shadow flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : usersError ? (
                <div className="bg-red-50 p-6 rounded-lg">
                  <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
                  <p className="text-red-700">Failed to load users. Please try again.</p>
                </div>
              ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="flex items-center">
                                <div className="text-sm font-medium text-neutral-900">
                                  {user.firstName} {user.lastName}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-neutral-900">{user.username}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-neutral-900">{user.email}</div>
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                user.role === "admin"
                                  ? "bg-purple-100 text-purple-800"
                                  : user.role === "seller"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-green-100 text-green-800"
                              }`}>
                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-neutral-500">
                                {formatDate(user.createdAt)}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}
