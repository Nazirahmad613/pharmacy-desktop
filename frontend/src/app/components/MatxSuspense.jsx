import React, { Suspense, useState, useEffect } from 'react';
import MatxLoading from './MatxLoading';

export default function MatxSuspense({ children, isSmall = false }) {
  const [loadingComplete, setLoadingComplete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingComplete(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <Suspense fallback={<MatxLoading isComplete={loadingComplete} isSmall={isSmall} />}>
      {children}
    </Suspense>
  );
}