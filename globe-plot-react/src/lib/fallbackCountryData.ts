// Fallback country data to handle API cold start issues
// This provides immediate country/flag data while the API request is pending or if it fails

export interface FallbackCountry {
  name: string;
  code: string;
  flag: string;
  phonecode: string;
}

// Top 50 most common travel countries with emoji flags as immediate fallback
export const fallbackCountries: FallbackCountry[] = [
  { name: "United States", code: "US", flag: "🇺🇸", phonecode: "+1" },
  { name: "United Kingdom", code: "GB", flag: "🇬🇧", phonecode: "+44" },
  { name: "Canada", code: "CA", flag: "🇨🇦", phonecode: "+1" },
  { name: "Australia", code: "AU", flag: "🇦🇺", phonecode: "+61" },
  { name: "Germany", code: "DE", flag: "🇩🇪", phonecode: "+49" },
  { name: "France", code: "FR", flag: "🇫🇷", phonecode: "+33" },
  { name: "Italy", code: "IT", flag: "🇮🇹", phonecode: "+39" },
  { name: "Spain", code: "ES", flag: "🇪🇸", phonecode: "+34" },
  { name: "Netherlands", code: "NL", flag: "🇳🇱", phonecode: "+31" },
  { name: "Switzerland", code: "CH", flag: "🇨🇭", phonecode: "+41" },
  { name: "Austria", code: "AT", flag: "🇦🇹", phonecode: "+43" },
  { name: "Belgium", code: "BE", flag: "🇧🇪", phonecode: "+32" },
  { name: "Sweden", code: "SE", flag: "🇸🇪", phonecode: "+46" },
  { name: "Norway", code: "NO", flag: "🇳🇴", phonecode: "+47" },
  { name: "Denmark", code: "DK", flag: "🇩🇰", phonecode: "+45" },
  { name: "Finland", code: "FI", flag: "🇫🇮", phonecode: "+358" },
  { name: "Iceland", code: "IS", flag: "🇮🇸", phonecode: "+354" },
  { name: "Ireland", code: "IE", flag: "🇮🇪", phonecode: "+353" },
  { name: "Portugal", code: "PT", flag: "🇵🇹", phonecode: "+351" },
  { name: "Greece", code: "GR", flag: "🇬🇷", phonecode: "+30" },
  { name: "Czech Republic", code: "CZ", flag: "🇨🇿", phonecode: "+420" },
  { name: "Poland", code: "PL", flag: "🇵🇱", phonecode: "+48" },
  { name: "Hungary", code: "HU", flag: "🇭🇺", phonecode: "+36" },
  { name: "Croatia", code: "HR", flag: "🇭🇷", phonecode: "+385" },
  { name: "Slovenia", code: "SI", flag: "🇸🇮", phonecode: "+386" },
  { name: "Estonia", code: "EE", flag: "🇪🇪", phonecode: "+372" },
  { name: "Latvia", code: "LV", flag: "🇱🇻", phonecode: "+371" },
  { name: "Lithuania", code: "LT", flag: "🇱🇹", phonecode: "+370" },
  { name: "Japan", code: "JP", flag: "🇯🇵", phonecode: "+81" },
  { name: "South Korea", code: "KR", flag: "🇰🇷", phonecode: "+82" },
  { name: "China", code: "CN", flag: "🇨🇳", phonecode: "+86" },
  { name: "Thailand", code: "TH", flag: "🇹🇭", phonecode: "+66" },
  { name: "Singapore", code: "SG", flag: "🇸🇬", phonecode: "+65" },
  { name: "Malaysia", code: "MY", flag: "🇲🇾", phonecode: "+60" },
  { name: "Indonesia", code: "ID", flag: "🇮🇩", phonecode: "+62" },
  { name: "Philippines", code: "PH", flag: "🇵🇭", phonecode: "+63" },
  { name: "Vietnam", code: "VN", flag: "🇻🇳", phonecode: "+84" },
  { name: "India", code: "IN", flag: "🇮🇳", phonecode: "+91" },
  { name: "United Arab Emirates", code: "AE", flag: "🇦🇪", phonecode: "+971" },
  { name: "Qatar", code: "QA", flag: "🇶🇦", phonecode: "+974" },
  { name: "Turkey", code: "TR", flag: "🇹🇷", phonecode: "+90" },
  { name: "Egypt", code: "EG", flag: "🇪🇬", phonecode: "+20" },
  { name: "South Africa", code: "ZA", flag: "🇿🇦", phonecode: "+27" },
  { name: "Morocco", code: "MA", flag: "🇲🇦", phonecode: "+212" },
  { name: "Brazil", code: "BR", flag: "🇧🇷", phonecode: "+55" },
  { name: "Argentina", code: "AR", flag: "🇦🇷", phonecode: "+54" },
  { name: "Chile", code: "CL", flag: "🇨🇱", phonecode: "+56" },
  { name: "Mexico", code: "MX", flag: "🇲🇽", phonecode: "+52" },
  { name: "Costa Rica", code: "CR", flag: "🇨🇷", phonecode: "+506" },
  { name: "New Zealand", code: "NZ", flag: "🇳🇿", phonecode: "+64" }
];

// Cache keys for localStorage
export const COUNTRIES_CACHE_KEY = 'countries-cache';
export const COUNTRIES_CACHE_TIMESTAMP_KEY = 'countries-cache-timestamp';
export const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Helper function to check if cached data is still valid
export const isCacheValid = (timestampKey: string): boolean => {
  const cacheTimestamp = localStorage.getItem(timestampKey);
  if (!cacheTimestamp) return false;
  
  const now = Date.now();
  const cacheAge = now - parseInt(cacheTimestamp);
  return cacheAge < CACHE_DURATION;
};

// Helper function to get cached countries or fallback
export const getCachedOrFallbackCountries = (): FallbackCountry[] => {
  if (isCacheValid(COUNTRIES_CACHE_TIMESTAMP_KEY)) {
    const cached = localStorage.getItem(COUNTRIES_CACHE_KEY);
    if (cached) {
      try {
        const cachedCountries = JSON.parse(cached);
        if (Array.isArray(cachedCountries) && cachedCountries.length > 0) {
          return cachedCountries.sort((a: FallbackCountry, b: FallbackCountry) => 
            a.name.localeCompare(b.name)
          );
        }
      } catch (error) {
        console.warn('Failed to parse cached countries:', error);
      }
    }
  }
  
  // Return sorted fallback countries
  return [...fallbackCountries].sort((a, b) => a.name.localeCompare(b.name));
};

// Helper function to update cache
export const updateCountriesCache = (countries: FallbackCountry[]): void => {
  try {
    localStorage.setItem(COUNTRIES_CACHE_KEY, JSON.stringify(countries));
    localStorage.setItem(COUNTRIES_CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.warn('Failed to update countries cache:', error);
  }
};
