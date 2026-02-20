import React from 'react';
import { Loader2 } from 'lucide-react';

const Loading: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
      <Loader2 className="w-10 h-10 text-primary-600 animate-spin mb-4" />
      <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Loading Data...</p>
    </div>
  );
};

export default Loading;
