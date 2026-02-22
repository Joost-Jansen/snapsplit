import React, { createContext, useContext, useState } from 'react';
import type { ParsedReceiptItem } from '@/types';

interface ScanResult {
  items: ParsedReceiptItem[];
}

interface ScanContextType {
  scanResult: ScanResult | null;
  setScanResult: (result: ScanResult | null) => void;
}

const ScanContext = createContext<ScanContextType>({
  scanResult: null,
  setScanResult: () => {},
});

export function ScanProvider({ children }: { children: React.ReactNode }) {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  return (
    <ScanContext.Provider value={{ scanResult, setScanResult }}>
      {children}
    </ScanContext.Provider>
  );
}

export const useScan = () => useContext(ScanContext);
