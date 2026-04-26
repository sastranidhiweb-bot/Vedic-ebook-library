import React from 'react';
import dynamic from 'next/dynamic';

const VedicKnwledgeFlow = dynamic(() => import('./VedicKnowledgeFlow'), { ssr: false });

type HomeLandingProps = {
  onLoginClick?: () => void;
};

export default function HomeLanding(_props: HomeLandingProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center w-full">
        <div className="w-full">
          <VedicKnwledgeFlow />
        </div>
      </main>

      <footer className="text-center text-white font-medium text-xs sm:text-sm" style={{
        background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
        padding: '10px 12px',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.15)',
      }}>
        © {new Date().getFullYear()} Sastra Nidhi. All rights reserved.
      </footer>
    </div>
  );
}
