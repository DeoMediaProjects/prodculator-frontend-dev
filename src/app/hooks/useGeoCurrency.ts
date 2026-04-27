import { useState, useEffect } from 'react';

interface CurrencyInfo {
  symbol: string;
  code: string;
  isUK: boolean;
}

export function useGeoCurrency(): CurrencyInfo {
  const [currencyInfo, setCurrencyInfo] = useState<CurrencyInfo>({
    symbol: '$',
    code: 'USD',
    isUK: false,
  });

  useEffect(() => {
    // Check if we've already detected the country in this session
    try {
      const cachedCountry = sessionStorage.getItem('user_country');
      
      if (cachedCountry) {
        const isUK = cachedCountry === 'GB';
        setCurrencyInfo({
          symbol: isUK ? '£' : '$',
          code: isUK ? 'GBP' : 'USD',
          isUK,
        });
        return;
      }
    } catch (error) {
      // SessionStorage not available (privacy mode, insecure context, etc.)
      console.warn('SessionStorage not available:', error);
    }

    // Use browser's timezone/locale as a fallback for currency detection
    // This works offline and doesn't require external API calls
    const detectCurrencyFromLocale = () => {
      try {
        // Check browser locale
        const userLocale = navigator.language || 'en-US';
        const isUKLocale = userLocale.startsWith('en-GB') || userLocale === 'en-UK';
        
        // Also check timezone
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const isUKTimezone = timezone === 'Europe/London';
        
        const isUK = isUKLocale || isUKTimezone;
        
        // Cache the result (with error handling)
        try {
          sessionStorage.setItem('user_country', isUK ? 'GB' : 'US');
        } catch (storageError) {
          // Ignore storage errors - just don't cache
          console.warn('Could not cache country preference:', storageError);
        }
        
        setCurrencyInfo({
          symbol: isUK ? '£' : '$',
          code: isUK ? 'GBP' : 'USD',
          isUK,
        });
      } catch (error) {
        // If locale detection fails, default to USD
        console.warn('Locale detection failed:', error);
        setCurrencyInfo({
          symbol: '$',
          code: 'USD',
          isUK: false,
        });
      }
    };

    detectCurrencyFromLocale();
  }, []);

  return currencyInfo;
}

// Helper function to convert USD prices to GBP
export function convertPrice(usdPrice: number, isUK: boolean): number {
  if (!isUK) return usdPrice;
  
  // Conversion rates (approximate)
  const conversionMap: { [key: number]: number } = {
    0: 0,
    61: 49,   // $61 USD → £49 GBP (Professional monthly)
    71: 57,   // $71 USD → £57 GBP (legacy single report)
    149: 119, // $149 USD → £119 GBP (Producer monthly)
    299: 239, // $299 USD → £239 GBP (Studio monthly)
  };
  
  return conversionMap[usdPrice] || Math.round(usdPrice * 0.79);
}