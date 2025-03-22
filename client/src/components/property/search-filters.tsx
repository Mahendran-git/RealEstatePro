import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { formatCurrency } from "@/lib/utils";

interface FilterValues {
  search: string;
  propertyType: string;
  minPrice: number;
  maxPrice: number;
  location: string;
}

interface SearchFiltersProps {
  onFilterChange: (filters: FilterValues) => void;
}

export default function SearchFilters({ onFilterChange }: SearchFiltersProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000000]);
  const [location, setLocation] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  // Track window size for responsive behavior
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    
    return () => {
      window.removeEventListener("resize", checkScreenSize);
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    onFilterChange({
      search: searchQuery,
      propertyType,
      minPrice: priceRange[0],
      maxPrice: priceRange[1],
      location,
    });
  };

  const resetFilters = () => {
    setSearchQuery("");
    setPropertyType("");
    setPriceRange([0, 2000000]);
    setLocation("");
    
    onFilterChange({
      search: "",
      propertyType: "",
      minPrice: 0,
      maxPrice: 0,
      location: "",
    });
  };

  // Desktop filter UI
  const DesktopFilters = () => (
    <div className="bg-white shadow rounded-lg p-4 mb-6">
      <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-neutral-500" />
            </div>
            <Input
              type="text"
              className="pl-10"
              placeholder="Search by location, address or keyword"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <div className="w-full sm:w-auto">
            <Select value={propertyType} onValueChange={setPropertyType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Property Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="plot">Plot</SelectItem>
                <SelectItem value="house">House</SelectItem>
                <SelectItem value="apartment">Apartment</SelectItem>
                <SelectItem value="land">Land</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full sm:w-auto">
            <Select 
              value={
                priceRange[0] === 0 && priceRange[1] === 2000000
                  ? ""
                  : `${priceRange[0]}-${priceRange[1]}`
              }
              onValueChange={(value) => {
                if (!value) {
                  setPriceRange([0, 2000000]);
                  return;
                }
                const [min, max] = value.split("-").map(Number);
                setPriceRange([min, max]);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Price Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any Price</SelectItem>
                <SelectItem value="0-100000">$0 - $100,000</SelectItem>
                <SelectItem value="100000-300000">$100,000 - $300,000</SelectItem>
                <SelectItem value="300000-600000">$300,000 - $600,000</SelectItem>
                <SelectItem value="600000-1000000">$600,000 - $1,000,000</SelectItem>
                <SelectItem value="1000000-2000000">$1,000,000+</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button type="submit">
            <Filter className="mr-2 h-4 w-4" />
            Apply Filters
          </Button>
        </div>
      </form>
    </div>
  );

  // Mobile filter UI using a Sheet component
  const MobileFilters = () => (
    <div className="bg-white shadow rounded-lg p-4 mb-6">
      <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4">
        <div className="relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-neutral-500" />
          </div>
          <Input
            type="text"
            className="pl-10"
            placeholder="Search properties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex space-x-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="flex-1">
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh]">
              <SheetHeader>
                <SheetTitle>Filter Properties</SheetTitle>
                <SheetDescription>
                  Adjust filters to find your perfect property
                </SheetDescription>
              </SheetHeader>
              
              <div className="py-6 space-y-6">
                <div className="space-y-2">
                  <Label>Property Type</Label>
                  <Select value={propertyType} onValueChange={setPropertyType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select property type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Types</SelectItem>
                      <SelectItem value="plot">Plot</SelectItem>
                      <SelectItem value="house">House</SelectItem>
                      <SelectItem value="apartment">Apartment</SelectItem>
                      <SelectItem value="land">Land</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    placeholder="City, State, or ZIP code"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
                
                <div className="space-y-4">
                  <Label>Price Range: {formatCurrency(priceRange[0])} - {formatCurrency(priceRange[1])}</Label>
                  <Slider
                    defaultValue={[0, 2000000]}
                    min={0}
                    max={2000000}
                    step={50000}
                    value={priceRange}
                    onValueChange={(value: number[]) => setPriceRange(value as [number, number])}
                    className="mt-2"
                  />
                </div>
              </div>
              
              <SheetFooter className="sm:justify-center">
                <Button variant="outline" onClick={resetFilters} className="w-full">
                  Reset Filters
                </Button>
                <SheetClose asChild>
                  <Button className="w-full" onClick={applyFilters}>
                    Apply Filters
                  </Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
          
          <Button type="submit" className="flex-1">
            Search
          </Button>
        </div>
      </form>
    </div>
  );

  return isMobile ? <MobileFilters /> : <DesktopFilters />;
}
