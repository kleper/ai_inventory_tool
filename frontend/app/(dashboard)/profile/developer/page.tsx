"use client";

import { ApiKeyManager } from "@/components/features/ApiKeyManager";

export default function DeveloperPage() {
    return (
        <div className="max-w-4xl mx-auto p-8 space-y-8">
            <div>
                <h1 className="text-4xl font-bold uppercase tracking-tight mb-2">Developer Settings</h1>
                <p className="font-mono text-sm text-neutral-500">
                    Manage your API keys and integration settings.
                </p>
            </div>

            <ApiKeyManager />

            <div className="border border-black p-6 bg-neutral-100 mt-8">
                <h3 className="font-bold uppercase tracking-wider mb-2">Documentation</h3>
                <p className="font-mono text-sm mb-4">
                    Ready to build? Check out our API documentation for endpoints, authentication details, and code examples.
                </p>
                <a
                    href="/docs/api"
                    className="inline-block bg-black text-white px-4 py-2 uppercase font-bold text-xs tracking-widest hover:bg-neutral-800"
                >
                    View API Docs
                </a>
            </div>
        </div>
    );
}
