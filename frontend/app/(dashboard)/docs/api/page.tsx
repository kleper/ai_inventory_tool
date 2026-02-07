"use client";

import { useSession } from "next-auth/react";
import { Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function CodeBlock({ code, label }: { code: string, label: string }) {
    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        toast.success("Copied to clipboard");
    };

    return (
        <div className="border border-black mt-4">
            <div className="bg-black text-white px-3 py-1 text-xs font-mono flex justify-between items-center uppercase tracking-wider">
                <span>{label}</span>
                <button onClick={handleCopy} className="hover:text-neutral-300">
                    <Copy className="w-3 h-3" />
                </button>
            </div>
            <pre className="bg-neutral-900 text-green-400 p-4 overflow-x-auto text-xs font-mono">
                {code}
            </pre>
        </div>
    );
}

export default function ApiDocsPage() {
    return (
        <div className="flex h-screen bg-white">
            {/* Sidebar */}
            <div className="w-64 border-r border-black p-6 hidden md:block overflow-y-auto">
                <h2 className="text-xl font-bold uppercase tracking-tight mb-6">API Ref</h2>
                <nav className="space-y-4 font-mono text-sm">
                    <div>
                        <h3 className="uppercase text-xs font-bold text-neutral-500 mb-2">Authentication</h3>
                        <a href="#auth" className="block hover:underline">API Keys</a>
                    </div>
                    <div>
                        <h3 className="uppercase text-xs font-bold text-neutral-500 mb-2">Inventories</h3>
                        <a href="#list-inventories" className="block hover:underline">List Inventories</a>
                        <a href="#geojson" className="block hover:underline">GeoJSON Map Data</a>
                    </div>
                </nav>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 max-w-5xl">
                <div className="space-y-12">
                    {/* Header */}
                    <div>
                        <h1 className="text-4xl font-bold uppercase tracking-tight mb-4">API Documentation</h1>
                        <p className="font-mono text-neutral-600">
                            Welcome to the SmartInventory Public API. Authenticate using your API keys to access your data programmatically.
                        </p>
                    </div>

                    {/* Authentication */}
                    <section id="auth" className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="bg-black text-white px-2 py-1 text-xs font-bold uppercase">Auth</div>
                            <h2 className="text-2xl font-bold uppercase">Authentication</h2>
                        </div>
                        <p className="text-sm font-mono">
                            Authenticate requests by including your API key in the request header <span className="bg-neutral-100 px-1 border border-neutral-300">X-API-KEY</span>.
                        </p>
                        <CodeBlock
                            label="cURL Example"
                            code={`curl https://api.smartinventory.com/api/v1/public/inventories \\
  -H "X-API-KEY: sk_live_..."`}
                        />
                    </section>

                    {/* List Inventories */}
                    <section id="list-inventories" className="space-y-6 pt-8 border-t border-dashed border-black">
                        <div className="flex items-center gap-3">
                            <span className="bg-black text-white px-2 py-1 font-mono text-xs">GET</span>
                            <h2 className="text-2xl font-bold uppercase">/public/inventories</h2>
                        </div>
                        <p className="font-mono text-sm">Retrieves a paginated list of your inventory folders.</p>

                        <div className="space-y-2">
                            <h3 className="font-bold uppercase text-xs">Query Parameters</h3>
                            <ul className="list-disc list-inside font-mono text-xs space-y-1">
                                <li><span className="font-bold">page</span> (int, default=1): Page number.</li>
                                <li><span className="font-bold">limit</span> (int, default=20): Items per page (max 100).</li>
                            </ul>
                        </div>

                        <CodeBlock
                            label="Javascript Example"
                            code={`const response = await fetch('https://api.smartinventory.com/api/v1/public/inventories', {
  headers: {
    'X-API-KEY': 'sk_live_...'
  }
});
const data = await response.json();
console.log(data);`}
                        />

                        <div className="border border-black p-4 bg-neutral-50">
                            <h4 className="font-bold uppercase text-xs mb-2">Response Example</h4>
                            <pre className="text-xs font-mono text-neutral-600">
                                {`{
  "data": [
    {
      "id": 1,
      "name": "Camping Gear",
      "description": "Survival tools",
      "item_count": 15
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "pages": 1
  }
}`}
                            </pre>
                        </div>
                    </section>

                    {/* GeoJSON Endpoint */}
                    <section id="geojson" className="space-y-6 pt-8 border-t border-dashed border-black">
                        <div className="flex items-center gap-3">
                            <span className="bg-black text-white px-2 py-1 font-mono text-xs">GET</span>
                            <h2 className="text-2xl font-bold uppercase">/groups/{`{id}`}/geojson</h2>
                        </div>
                        <p className="font-mono text-sm">Retrieves a standard GeoJSON FeatureCollection of all items in a group that have GPS coordinates. Useful for map integrations.</p>

                        <div className="space-y-2">
                            <h3 className="font-bold uppercase text-xs">Path Parameters</h3>
                            <ul className="list-disc list-inside font-mono text-xs space-y-1">
                                <li><span className="font-bold">id</span> (int): The ID of the inventory group (folder).</li>
                            </ul>
                        </div>

                        <CodeBlock
                            label="Javascript Example"
                            code={`const response = await fetch('https://api.smartinventory.com/api/v1/groups/123/geojson', {
  headers: {
    'X-API-KEY': 'sk_live_...'
  }
});
const geojson = await response.json();

// Use with Mapbox / Leaflet
L.geoJSON(geojson).addTo(map);`}
                        />

                        <div className="border border-black p-4 bg-neutral-50">
                            <h4 className="font-bold uppercase text-xs mb-2">Response Example</h4>
                            <pre className="text-xs font-mono text-neutral-600">
                                {`{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [-74.006, 40.7128]
      },
      "properties": {
        "id": 45,
        "name": "Tent",
        "price": 299.99,
        "popup_html": "<div...>...</div>"
      }
    }
  ]
}`}
                            </pre>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
