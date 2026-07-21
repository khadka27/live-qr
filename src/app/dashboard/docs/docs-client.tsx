'use client';

import React, { useState } from 'react';
import { openApiSpec } from '@/lib/openapi-spec';
import { Code, BookOpen, Key, AlertCircle } from 'lucide-react';

export function DocsClient() {
  const [activePath, setActivePath] = useState<string>('/qr');
  const [activeMethod, setActiveMethod] = useState<string>('get');

  const paths = openApiSpec.paths as any;
  const currentPathData = paths[activePath]?.[activeMethod];

  // Quick helper to build cURL snippets
  const getCurlSnippet = (path: string, method: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const baseUrl = `${origin}/api`;
    const authHeader = `-H "Authorization: Bearer lqr_live_your_key"`;
    
    if (method === 'get') {
      const cleanPath = path.replace('{id}', 'cldh1s99w00003b57...');
      return `curl ${authHeader} \\\n  "${baseUrl}${cleanPath}"`;
    }
    
    if (method === 'post') {
      let body = '';
      if (path === '/qr') {
        body = `\\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "name": "WiFi Signage",\n    "destinationUrl": "https://mysite.com",\n    "expirationSeconds": 60\n  }'`;
      } else if (path.includes('regenerate')) {
        body = ``;
      }
      const cleanPath = path.replace('{id}', 'cldh1s99w00003b57...');
      return `curl -X POST ${authHeader} ${body} \\\n  "${baseUrl}${cleanPath}"`;
    }

    if (method === 'put') {
      const body = `\\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "name": "WiFi Signage (Updated)",\n    "destinationUrl": "https://mysite.com/new"\n  }'`;
      const cleanPath = path.replace('{id}', 'cldh1s99w00003b57...');
      return `curl -X PUT ${authHeader} ${body} \\\n  "${baseUrl}${cleanPath}"`;
    }

    if (method === 'delete') {
      const cleanPath = path.replace('{id}', 'cldh1s99w00003b57...');
      return `curl -X DELETE ${authHeader} \\\n  "${baseUrl}${cleanPath}"`;
    }

    return `curl -X ${method.toUpperCase()} "${baseUrl}${path}"`;
  };

  // Quick helper for mock responses
  const getMockResponse = (path: string, method: string) => {
    if (path === '/qr' && method === 'get') {
      return `[\n  {\n    "id": "cldh1s99w00003b57",\n    "name": "WiFi Signage",\n    "destinationUrl": "https://mysite.com",\n    "expirationSeconds": 60,\n    "autoRefresh": true,\n    "scanCount": 24,\n    "currentToken": "f8K2X91LmAqBvPw...",\n    "createdAt": "2026-07-21T06:00:00Z"\n  }\n]`;
    }
    if (path === '/qr' && method === 'post') {
      return `{\n  "id": "cldh1s99w00003b57",\n  "name": "WiFi Signage",\n  "destinationUrl": "https://mysite.com",\n  "expirationSeconds": 60,\n  "autoRefresh": true,\n  "currentToken": "f8K2X91LmAqBvPw...",\n  "createdAt": "2026-07-21T06:00:00Z"\n}`;
    }
    if (path.includes('regenerate')) {
      return `{\n  "success": true,\n  "token": "a1B2C3D4E5F6G7H8...",\n  "expiresAt": "2026-07-21T06:41:00.000Z"\n}`;
    }
    return `{\n  "success": true\n}`;
  };

  const getMethodBadgeColor = (method: string) => {
    switch (method.toLowerCase()) {
      case 'get':
        return 'bg-emerald-950/50 border-emerald-800 text-emerald-400';
      case 'post':
        return 'bg-indigo-950/50 border-indigo-800 text-indigo-400';
      case 'put':
        return 'bg-amber-950/50 border-amber-800 text-amber-400';
      case 'delete':
        return 'bg-red-950/50 border-red-800 text-red-400';
      default:
        return 'bg-neutral-800 border-neutral-700 text-neutral-300';
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Public API Documentation</h1>
        <p className="text-neutral-400 text-sm mt-1">
          Explore programmatic options to list, create, rotate, and track dynamic QR codes via HTTP REST.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Column: API Directory Links */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest px-2">API Endpoints</h3>
            
            <div className="space-y-1">
              {Object.keys(paths).map((path) => (
                <div key={path} className="space-y-0.5">
                  {Object.keys(paths[path]).map((method) => (
                    <button
                      key={`${path}-${method}`}
                      onClick={() => {
                        setActivePath(path);
                        setActiveMethod(method);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer text-left ${
                        activePath === path && activeMethod === method
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
                      }`}
                    >
                      <span className="truncate max-w-[120px]">{path}</span>
                      <span className="uppercase text-[9px] px-1 border rounded leading-none shrink-0 font-bold">
                        {method}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Authorization Overview Card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Key className="w-4 h-4 text-indigo-400" />
              Authorization
            </h4>
            <p className="text-[10px] text-neutral-400 leading-relaxed">
              Every request requires an active API Key loaded in the `Authorization` header prefixing with `Bearer`. Ensure you generate keys on the Keys page first.
            </p>
          </div>
        </div>

        {/* Right Double-Columns: Details & Sample Panels */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Middle: Method Description & details */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6 shadow-xl">
            {currentPathData && (
              <>
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 border rounded text-xs font-black uppercase tracking-wider ${getMethodBadgeColor(activeMethod)}`}>
                    {activeMethod}
                  </span>
                  <span className="font-mono text-sm text-white font-semibold">{activePath}</span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white leading-snug">{currentPathData.summary}</h3>
                  <p className="text-neutral-400 text-xs mt-2 leading-relaxed">{currentPathData.description}</p>
                </div>

                {/* Path params if present */}
                {currentPathData.parameters && currentPathData.parameters.length > 0 && (
                  <div className="space-y-3 border-t border-neutral-800 pt-4">
                    <h4 className="text-xs font-bold text-neutral-300">Path Parameters</h4>
                    <div className="space-y-2">
                      {currentPathData.parameters.map((p: any) => (
                        <div key={p.name} className="flex flex-col gap-1 py-1 text-xs">
                          <div className="flex justify-between font-mono">
                            <span className="text-indigo-400 font-semibold">{p.name}</span>
                            <span className="text-neutral-500">{p.schema.type} ({p.required ? 'required' : 'optional'})</span>
                          </div>
                          <span className="text-neutral-400 text-[11px] leading-relaxed">{p.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Return responses definitions */}
                <div className="space-y-3 border-t border-neutral-800 pt-4">
                  <h4 className="text-xs font-bold text-neutral-300">HTTP Responses</h4>
                  <div className="space-y-2">
                    {Object.keys(currentPathData.responses).map((code) => {
                      const res = currentPathData.responses[code];
                      return (
                        <div key={code} className="flex justify-between text-xs py-1.5 border-b border-neutral-800/40">
                          <span className="font-mono font-bold text-white">{code}</span>
                          <span className="text-neutral-400">{res.description}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right side: cURL Request Code + JSON Mock Response */}
          <div className="space-y-6">
            {/* cURL box */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Code className="w-4 h-4 text-indigo-400" />
                Example Request (cURL)
              </h4>
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 font-mono text-[10px] text-neutral-300 leading-normal overflow-x-auto select-all">
                {getCurlSnippet(activePath, activeMethod)}
              </div>
            </div>

            {/* Mock Response box */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                Response Body (JSON)
              </h4>
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 font-mono text-[9px] text-neutral-400 leading-relaxed overflow-x-auto max-h-72">
                <pre className="text-indigo-200">{getMockResponse(activePath, activeMethod)}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
