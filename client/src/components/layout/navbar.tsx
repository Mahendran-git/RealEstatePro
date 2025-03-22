import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { PlusCircle, Menu, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/utils";
import AvatarPlaceholder from "@/components/ui/avatar-placeholder";

export default function Navbar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return null;

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const isSellerOrAdmin = user.role === "seller" || user.role === "admin";

  return (
    <nav className="bg-white shadow-sm border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/">
                <h1 className="text-2xl font-bold text-primary cursor-pointer">
                  Estatetify
                </h1>
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link href="/">
                <a
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    location === "/"
                      ? "border-primary text-neutral-900"
                      : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700"
                  }`}
                >
                  Home
                </a>
              </Link>
              {isSellerOrAdmin && (
                <Link href="/seller/dashboard">
                  <a
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      location === "/seller/dashboard"
                        ? "border-primary text-neutral-900"
                        : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700"
                    }`}
                  >
                    My Sells
                  </a>
                </Link>
              )}
              <Link href="/inbox">
                <a
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    location === "/inbox"
                      ? "border-primary text-neutral-900"
                      : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700"
                  }`}
                >
                  Inbox
                </a>
              </Link>
              {user.role === "admin" && (
                <Link href="/admin">
                  <a
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      location === "/admin"
                        ? "border-primary text-neutral-900"
                        : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700"
                    }`}
                  >
                    Admin
                  </a>
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center">
            {isSellerOrAdmin && (
              <div className="flex-shrink-0 hidden md:block">
                <Link href="/seller/dashboard?add=true">
                  <Button size="sm" className="mr-4">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Property
                  </Button>
                </Link>
              </div>
            )}
            <div className="hidden md:ml-4 md:flex-shrink-0 md:flex md:items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 w-8 rounded-full p-0 overflow-hidden focus-visible:ring-0"
                  >
                    <AvatarPlaceholder 
                      initials={getInitials(user.firstName, user.lastName)} 
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{`${user.firstName} ${user.lastName}`}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      Role: {user.role}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/inbox">
                      <a className="w-full cursor-pointer">Inbox</a>
                    </Link>
                  </DropdownMenuItem>
                  {isSellerOrAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/seller/dashboard">
                        <a className="w-full cursor-pointer">My Properties</a>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {user.role === "admin" && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin">
                        <a className="w-full cursor-pointer">Admin Panel</a>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-500 focus:text-red-500 cursor-pointer"
                  >
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="md:hidden flex items-center">
              <button
                type="button"
                className="inline-flex items-center justify-center p-2 rounded-md text-neutral-500"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <span className="sr-only">Open main menu</span>
                {mobileMenuOpen ? (
                  <X className="block h-6 w-6" />
                ) : (
                  <Menu className="block h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-200">
          <div className="pt-2 pb-3 space-y-1">
            <Link href="/">
              <a
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  location === "/"
                    ? "bg-primary-50 border-primary text-primary"
                    : "border-transparent text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-800"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </a>
            </Link>
            {isSellerOrAdmin && (
              <Link href="/seller/dashboard">
                <a
                  className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                    location === "/seller/dashboard"
                      ? "bg-primary-50 border-primary text-primary"
                      : "border-transparent text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-800"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Sells
                </a>
              </Link>
            )}
            <Link href="/inbox">
              <a
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  location === "/inbox"
                    ? "bg-primary-50 border-primary text-primary"
                    : "border-transparent text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-800"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Inbox
              </a>
            </Link>
            {user.role === "admin" && (
              <Link href="/admin">
                <a
                  className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                    location === "/admin"
                      ? "bg-primary-50 border-primary text-primary"
                      : "border-transparent text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-800"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Admin
                </a>
              </Link>
            )}
            {isSellerOrAdmin && (
              <Link href="/seller/dashboard?add=true">
                <a
                  className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-primary hover:bg-neutral-50 hover:border-primary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Add Property
                </a>
              </Link>
            )}
            <button
              className="block w-full text-left pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-red-500 hover:bg-neutral-50 hover:border-red-500"
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
            >
              Log out
            </button>
          </div>
          <div className="pt-4 pb-3 border-t border-neutral-200">
            <div className="flex items-center px-4">
              <div className="flex-shrink-0">
                <AvatarPlaceholder 
                  initials={getInitials(user.firstName, user.lastName)} 
                />
              </div>
              <div className="ml-3">
                <div className="text-base font-medium text-neutral-800">{`${user.firstName} ${user.lastName}`}</div>
                <div className="text-sm font-medium text-neutral-500">
                  {user.email}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
