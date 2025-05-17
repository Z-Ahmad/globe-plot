import React, { useCallback, useState, forwardRef, useEffect } from "react";

// shadcn
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// utils
import { cn } from "@/lib/utils";

// assets
import { ChevronDown, CheckIcon, Globe, Loader2 } from "lucide-react";

// Import event styles

// Country interface from our API
export interface Country {
  name: string;
  code: string;
  flag: string;
}

// Dropdown props
interface CountryDropdownProps {
  value?: string;
  onChange?: (countryName: string) => void; // Updated to match EventEditor usage
  defaultValue?: string;
  disabled?: boolean;
  placeholder?: string;
  slim?: boolean;
  bgColor?: string;
}

const CountryDropdownComponent = (
  {
    value,
    onChange,
    defaultValue,
    disabled = false,
    placeholder = "Select a country",
    slim = false,
    bgColor = "bg-background",
    ...props
  }: CountryDropdownProps,
  ref: React.ForwardedRef<HTMLButtonElement>
) => {
  const [open, setOpen] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country | undefined>(undefined);
  const [pendingCountryName, setPendingCountryName] = useState<string | undefined>(undefined);

  const API_URL = import.meta.env.VITE_API_URL || '';

  // Get event style for background color

  // Fetch countries from our API
  useEffect(() => {
    const fetchCountries = async () => {
      if (!API_URL) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`${API_URL}countries`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch countries');
        }
        
        const data = await response.json();
        setCountries(data);
      } catch (err) {
        console.error('Error fetching countries:', err);
        setError('Failed to load countries');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCountries();
  }, [API_URL]);

  // Track the current value from props so we can use it to find the country by name
  useEffect(() => {
    if (value) {
      setPendingCountryName(value);
    }
  }, [value]);

  // Try to find the selected country by name or code once we have countries loaded
  useEffect(() => {
    if (!countries.length) return;

    // If we have a pending country name from the value prop, try to find it
    if (pendingCountryName) {
      try {
        // First try exact match by name
        let country = countries.find(c => c.name === pendingCountryName);
        
        // If no exact match, try case-insensitive match
        if (!country) {
          country = countries.find(c => 
            c.name.toLowerCase() === pendingCountryName.toLowerCase()
          );
        }
        
        // If still no match, try to find a country that contains the name
        if (!country) {
          country = countries.find(c => 
            c.name.toLowerCase().includes(pendingCountryName.toLowerCase())
          );
        }

        if (country) {
          console.log(`Country match found: ${pendingCountryName} -> ${country.name} (${country.code})`);
          setSelectedCountry(country);
          setPendingCountryName(undefined);
        } else {
          console.warn(`No country match found for: "${pendingCountryName}"`);
        }
      } catch (error) {
        console.error('Error matching country name:', error, pendingCountryName);
      }
    } 
    // If we have a code directly, use that
    else if (defaultValue) {
      const country = countries.find(c => c.code === defaultValue);
      if (country) {
        setSelectedCountry(country);
      }
    }
  }, [countries, pendingCountryName, defaultValue]);

  const handleSelect = useCallback(
    (country: Country) => {
      setSelectedCountry(country);
      // Pass both name and code to parent component
      console.log(`Selected country: ${country.name} (${country.code})`);
      onChange?.(country.name); // We're currently only using the name in EventEditor
      setOpen(false);
    },
    [onChange]
  );

  const triggerClasses = cn(
    "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
    slim === true && "w-20"
  );

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger
        ref={ref}
        className={triggerClasses}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            <span>Loading...</span>
          </div>
        ) : selectedCountry ? (
          <div className="flex items-center flex-grow w-0 gap-2 overflow-hidden">
            <div className="inline-flex items-center justify-center shrink-0">
              <span className="text-base">{selectedCountry.flag}</span>
            </div>
            {slim === false && (
              <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                {selectedCountry.name}
              </span>
            )}
          </div>
        ) : pendingCountryName ? (
          <div className="flex items-center flex-grow w-0 gap-2 overflow-hidden">
            <div className="inline-flex items-center justify-center shrink-0">
              <Globe size={16} />
            </div>
            <span className="overflow-hidden text-ellipsis whitespace-nowrap">
              {pendingCountryName}
            </span>
          </div>
        ) : (
          <span>
            {slim === false ? placeholder : <Globe size={20} />}
          </span>
        )}
        <ChevronDown size={16} />
      </PopoverTrigger>
      <PopoverContent
        collisionPadding={10}
        side="bottom"
        className={`min-w-[--radix-popper-anchor-width] p-0 ${bgColor}`}
      >
        <div className="flex flex-col h-full">
          <Command className={`w-full ${bgColor}`}>
            <div className={`sticky top-0 z-10 ${bgColor}`}>
              <CommandInput placeholder="Search country..." />
            </div>
            <div className={`overflow-y-auto ${bgColor}`} style={{ maxHeight: "350px" }}>
              <CommandList className="overflow-auto">
                {error ? (
                  <div className="py-6 text-center text-sm text-destructive">
                    {error}
                  </div>
                ) : (
                  <>
                    <CommandEmpty>No country found.</CommandEmpty>
                    <CommandGroup className={`${bgColor}`}>
                      {countries.map((country) => (
                        <CommandItem
                          className="flex items-center w-full gap-2"
                          key={country.code}
                          onSelect={() => handleSelect(country)}
                          value={`${country.name} ${country.code}`}
                        >
                          <div className="flex flex-grow w-0 space-x-2 overflow-hidden">
                            <div className="inline-flex items-center justify-center shrink-0">
                              <span className="text-base">{country.flag}</span>
                            </div>
                            <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                              {country.name}
                            </span>
                          </div>
                          <CheckIcon
                            className={cn(
                              "ml-auto h-4 w-4 shrink-0",
                              selectedCountry?.code === country.code
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </div>
          </Command>
        </div>
      </PopoverContent>
    </Popover>
  );
};

CountryDropdownComponent.displayName = "CountryDropdownComponent";

export const CountryDropdown = forwardRef(CountryDropdownComponent); 