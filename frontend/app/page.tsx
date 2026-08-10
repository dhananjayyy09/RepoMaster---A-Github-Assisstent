'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';

export default function Home() {
  const [backendStatus, setBackendStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [healthData, setHealthData] = useState<any>(null);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const data = await apiClient.healthCheck();
        setHealthData(data);
        setBackendStatus('connected');
      } catch (error) {
        console.error('Backend connection failed:', error);
        setBackendStatus('error');
      }
    };

    checkBackend();
  }, []);

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-4xl flex-col items-center justify-center py-32 px-16 bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-8 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-black dark:text-zinc-50">
            GitHub Knowledge Assistant
          </h1>
          <p className="max-w-2xl text-xl leading-8 text-zinc-600 dark:text-zinc-400">
            AI-powered platform for understanding and interacting with GitHub repositories using natural language
          </p>
          <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <div className="w-3 h-3 rounded-full bg-green-600 dark:bg-green-400"></div>
              Frontend Running
            </div>
            <div className="flex items-center gap-2">
              {backendStatus === 'connecting' && (
                <>
                  <div className="w-3 h-3 rounded-full bg-yellow-600 dark:bg-yellow-400 animate-pulse"></div>
                  <span className="text-yellow-600 dark:text-yellow-400">Connecting to Backend...</span>
                </>
              )}
              {backendStatus === 'connected' && (
                <>
                  <div className="w-3 h-3 rounded-full bg-green-600 dark:bg-green-400"></div>
                  <span className="text-green-600 dark:text-green-400">Backend Connected</span>
                </>
              )}
              {backendStatus === 'error' && (
                <>
                  <div className="w-3 h-3 rounded-full bg-red-600 dark:bg-red-400"></div>
                  <span className="text-red-600 dark:text-red-400">Backend Connection Failed</span>
                </>
              )}
            </div>
          </div>
          {healthData && (
            <div className="mt-4 p-4 bg-zinc-100 dark:bg-zinc-900 rounded-lg text-sm font-mono text-zinc-600 dark:text-zinc-400">
              <pre>{JSON.stringify(healthData, null, 2)}</pre>
            </div>
          )}
          <div className="mt-8 p-6 bg-zinc-100 dark:bg-zinc-900 rounded-lg max-w-2xl">
            <h2 className="text-lg font-semibold mb-4 text-black dark:text-zinc-50">Getting Started</h2>
            <ul className="text-left space-y-2 text-zinc-600 dark:text-zinc-400">
              <li>✅ Next.js + TypeScript + Tailwind CSS configured</li>
              <li>✅ Express + TypeScript backend running</li>
              <li>✅ PostgreSQL, Redis, Qdrant containers ready</li>
              <li>✅ Ollama integration configured</li>
              <li>⏳ Additional features coming in next milestones</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
