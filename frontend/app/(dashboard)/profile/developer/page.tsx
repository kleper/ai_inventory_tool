"use client";

import { ApiKeyManager } from "@/components/features/ApiKeyManager";
import { Terminal, Bot, BookOpen, Copy, ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function DeveloperPage() {
    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`Copied ${label} to clipboard`);
    };

    const mcpConfigExample = `{
  "mcpServers": {
    "smartinventory": {
      "command": "python3",
      "args": ["${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/mcp_server.py"],
      "env": {
        "SMARTINVENTORY_API_URL": "${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}",
        "SMARTINVENTORY_API_KEY": "sk_live_your_api_key_here"
      }
    }
  }
}`;

    return (
        <div className="max-w-5xl mx-auto p-8 space-y-10">
            {/* Header */}
            <div className="border-b border-black pb-6">
                <div className="flex items-center gap-2 mb-2">
                    <span className="bg-black text-white px-2 py-0.5 text-xs font-mono uppercase font-bold tracking-wider">
                        Developer Portal
                    </span>
                    <span className="border border-black px-2 py-0.5 text-xs font-mono uppercase font-bold">
                        OpenAPI 3.1.0 & MCP
                    </span>
                </div>
                <h1 className="text-4xl font-bold uppercase tracking-tight text-black">
                    Developer & AI Integrations
                </h1>
                <p className="font-mono text-sm text-neutral-600 mt-2 max-w-3xl">
                    Create API keys to programmatically manage your inventory folders, create items, and connect Large Language Models (LLMs) via the Model Context Protocol (MCP).
                </p>
            </div>

            {/* API Key Management */}
            <div>
                <ApiKeyManager />
            </div>

            {/* Model Context Protocol (MCP) Section */}
            <div className="border-2 border-black p-6 bg-white space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-black text-white flex items-center justify-center">
                            <Bot className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold uppercase tracking-tight">Model Context Protocol (MCP)</h2>
                            <p className="text-xs font-mono text-neutral-600">Connect Claude Desktop, Cursor, or autonomous LLMs directly to your inventory</p>
                        </div>
                    </div>
                    <Link
                        href="/docs/api#mcp"
                        className="inline-flex items-center gap-2 border border-black px-3 py-2 text-xs font-bold font-mono uppercase hover:bg-black hover:text-white transition-colors"
                    >
                        <span>Full MCP Guide</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>

                <div className="grid md:grid-cols-2 gap-6 text-sm font-mono">
                    <div className="space-y-3">
                        <h3 className="font-bold uppercase text-xs tracking-wider text-black flex items-center gap-1.5">
                            <Terminal className="w-4 h-4" />
                            Native HTTP MCP Server
                        </h3>
                        <p className="text-xs text-neutral-600 leading-relaxed">
                            SmartInventory provides a native, secured HTTP MCP server mounted at <span className="bg-neutral-100 px-1 border border-neutral-300 font-bold">/mcp</span> with 12 specialized tools. LLMs can create inventory folders, search items, and add objects with strict user-level access isolation.
                        </p>
                        <div className="border border-neutral-300 p-3 bg-neutral-50 text-xs space-y-1.5">
                            <div><span className="font-bold">HTTP JSON-RPC:</span> <code className="text-neutral-700">POST /mcp</code></div>
                            <div><span className="font-bold">SSE Stream:</span> <code className="text-neutral-700">GET /mcp/sse</code></div>
                            <div><span className="font-bold">Auth Header:</span> <code className="text-neutral-700">X-API-KEY: sk_live_...</code></div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold uppercase text-xs tracking-wider text-black">
                                Claude Desktop Config
                            </h3>
                            <button
                                onClick={() => handleCopy(mcpConfigExample, "Claude Desktop configuration")}
                                className="text-xs flex items-center gap-1 hover:underline text-neutral-600"
                            >
                                <Copy className="w-3 h-3" />
                                <span>Copy JSON</span>
                            </button>
                        </div>
                        <pre className="border border-black bg-neutral-950 text-green-400 p-3 text-[11px] font-mono overflow-x-auto">
                            {mcpConfigExample}
                        </pre>
                    </div>
                </div>
            </div>

            {/* Documentation Hub Banner */}
            <div className="border border-black p-6 bg-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-black" />
                        <h3 className="font-bold uppercase tracking-wider text-lg">Interactive Documentation</h3>
                    </div>
                    <p className="font-mono text-xs text-neutral-600">
                        Explore full code examples for creating inventories, batch item insertions, search filters, and the 12 MCP tools.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/docs/api"
                        className="inline-flex items-center gap-2 bg-black text-white px-5 py-2.5 uppercase font-bold text-xs tracking-widest hover:bg-neutral-800 transition-colors"
                    >
                        <span>View API & MCP Docs</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
