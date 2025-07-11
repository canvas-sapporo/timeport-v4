'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface PageTransitionContextType {
  isTransitioning: boolean;
  setIsTransitioning: (isTransitioning: boolean) => void;
  disableTransition: () => void;
  enableTransition: () => void;
  isTransitionDisabled: boolean;
}

const PageTransitionContext = createContext<PageTransitionContextType | undefined>(undefined);

export const PageTransitionProvider = ({ children }: { children: ReactNode }) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isTransitionDisabled, setIsTransitionDisabled] = useState(false);

  const disableTransition = () => setIsTransitionDisabled(true);
  const enableTransition = () => setIsTransitionDisabled(false);

  return (
    <PageTransitionContext.Provider value={{ 
      isTransitioning, 
      setIsTransitioning, 
      disableTransition, 
      enableTransition, 
      isTransitionDisabled 
    }}>
      {children}
    </PageTransitionContext.Provider>
  );
};

export const usePageTransition = () => {
  const context = useContext(PageTransitionContext);
  if (context === undefined) {
    throw new Error('usePageTransition must be used within a PageTransitionProvider');
  }
  return context;
}; 