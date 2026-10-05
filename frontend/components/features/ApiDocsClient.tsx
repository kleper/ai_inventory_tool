"use client";

import { useState, useEffect } from "react";
import { Copy, Terminal, Bot, FolderPlus, PackagePlus, Search, ShieldCheck, Check, Layers, CodeXml, Globe, ExternalLink } from "lucide-react";
import { toast } from "sonner";

function CodeBlock({ code, label }: { code: string; label: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        toast.success("Copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="border border-black my-4">
            <div className="bg-black text-white px-3 py-1.5 text-xs font-mono flex justify-between items-center uppercase tracking-wider">
                <span className="font-bold flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-green-400" />
                    {label}
                </span>
                <button
                    onClick={handleCopy}
                    className="hover:text-green-300 flex items-center gap-1 text-[11px] uppercase transition-colors"
                >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                </button>
            </div>
            <pre className="bg-neutral-950 text-green-400 p-4 overflow-x-auto text-xs font-mono leading-relaxed">
                {code}
            </pre>
        </div>
    );
}

function MethodBadge({ method }: { method: "GET" | "POST" | "PUT" | "DELETE" }) {
    const colors = {
        GET: "bg-blue-600 text-white",
        POST: "bg-green-600 text-white",
        PUT: "bg-amber-600 text-white",
        DELETE: "bg-red-600 text-white"
    };

    return (
        <span className={`px-2 py-0.5 font-mono text-xs font-bold uppercase rounded-none border border-black ${colors[method]}`}>
            {method}
        </span>
    );
}

interface ApiDocsClientProps {
    baseUrl?: string;
}

export default function ApiDocsClient({ baseUrl }: ApiDocsClientProps) {
    const [apiUrl, setApiUrl] = useState<string>(baseUrl ? baseUrl.replace(/\/$/, "") : "");
    const [clientHost, setClientHost] = useState<string>("");

    useEffect(() => {
        if (typeof window !== "undefined" && window.location.origin) {
            const origin = window.location.origin.replace(/\/$/, "");
            setClientHost(origin);
            if (!apiUrl) {
                setApiUrl(origin);
            }
        }
    }, [apiUrl]);

    return (
        <div className="flex min-h-screen bg-white text-black font-sans">
            {/* Desktop Sticky Sidebar */}
            <div className="w-72 border-r border-black p-6 hidden lg:block overflow-y-auto sticky top-0 h-screen bg-neutral-50 text-xs font-mono space-y-6">
                <div>
                    <h2 className="text-base font-bold uppercase tracking-tight text-black mb-1 flex items-center gap-2">
                        <Terminal className="w-4 h-4" />
                        API & MCP Index
                    </h2>
                    <p className="text-[10px] text-neutral-500 uppercase">OpenAPI 3.1.0 & Protocol</p>
                </div>

                <nav className="space-y-4">
                    <div>
                        <h3 className="uppercase text-[11px] font-bold text-neutral-500 mb-2 border-b border-black pb-1">Overview</h3>
                        <div className="space-y-1">
                            <a href="#auth" className="block hover:underline py-0.5 text-neutral-800">Authentication</a>
                            <a href="#openapi" className="block hover:underline py-0.5 text-neutral-800">OpenAPI 3.1.0 Spec</a>
                        </div>
                    </div>

                    <div>
                        <h3 className="uppercase text-[11px] font-bold text-neutral-500 mb-2 border-b border-black pb-1">Inventories</h3>
                        <div className="space-y-1">
                            <a href="#create-inventory" className="block hover:underline py-0.5 font-bold text-green-700">POST Create Inventory</a>
                            <a href="#list-inventories" className="block hover:underline py-0.5 text-neutral-800">GET List Inventories</a>
                            <a href="#get-inventory" className="block hover:underline py-0.5 text-neutral-800">GET Inventory Details</a>
                            <a href="#update-inventory" className="block hover:underline py-0.5 text-neutral-800">PUT Update Inventory</a>
                            <a href="#delete-inventory" className="block hover:underline py-0.5 text-neutral-800">DELETE Inventory</a>
                            <a href="#geojson" className="block hover:underline py-0.5 text-neutral-800">GET GeoJSON Map</a>
                        </div>
                    </div>

                    <div>
                        <h3 className="uppercase text-[11px] font-bold text-neutral-500 mb-2 border-b border-black pb-1">Items</h3>
                        <div className="space-y-1">
                            <a href="#create-item" className="block hover:underline py-0.5 font-bold text-green-700">POST Create Item</a>
                            <a href="#bulk-create-items" className="block hover:underline py-0.5 text-neutral-800">POST Bulk Items</a>
                            <a href="#search-items" className="block hover:underline py-0.5 text-neutral-800">GET Search Items</a>
                            <a href="#get-item" className="block hover:underline py-0.5 text-neutral-800">GET Item Detail</a>
                            <a href="#update-item" className="block hover:underline py-0.5 text-neutral-800">PUT Update Item</a>
                            <a href="#delete-item" className="block hover:underline py-0.5 text-neutral-800">DELETE Item</a>
                        </div>
                    </div>

                    <div>
                        <h3 className="uppercase text-[11px] font-bold text-neutral-500 mb-2 border-b border-black pb-1">MCP for LLMs</h3>
                        <div className="space-y-1">
                            <a href="#mcp-overview" className="block hover:underline py-0.5 font-bold text-purple-700">What is MCP?</a>
                            <a href="#mcp-security" className="block hover:underline py-0.5 text-neutral-800">Security & Scoping</a>
                            <a href="#mcp-http" className="block hover:underline py-0.5 text-neutral-800">HTTP JSON-RPC (/mcp)</a>
                            <a href="#mcp-claude" className="block hover:underline py-0.5 text-neutral-800">Claude & Cursor Config</a>
                            <a href="#mcp-tools" className="block hover:underline py-0.5 text-neutral-800">12 MCP Tools Reference</a>
                        </div>
                    </div>
                </nav>
            </div>

            {/* Main Documentation Content */}
            <div className="flex-1 p-6 md:p-12 max-w-5xl overflow-y-auto space-y-16">
                {/* Header */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="bg-black text-white px-2 py-0.5 text-xs font-mono uppercase font-bold tracking-widest">
                            V1 Specification
                        </span>
                        <span className="border border-black px-2 py-0.5 text-xs font-mono uppercase font-bold">
                            OpenAPI 3.1.0 Ready
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold uppercase tracking-tight text-black">
                        Developer API & Model Context Protocol (MCP)
                    </h1>
                    <p className="font-mono text-sm text-neutral-600 mt-3 max-w-3xl leading-relaxed">
                        Complete reference for managing SmartInventory programmatically. Create inventory folders, add objects, batch import assets, and let autonomous LLMs query and control your assets via the native HTTP Model Context Protocol (MCP) server.
                    </p>

                    {/* Environment Selector Bar */}
                    <div className="mt-6 border-2 border-black p-4 bg-neutral-50 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Globe className="w-4 h-4 text-green-600" />
                                <span className="font-bold uppercase tracking-wider text-black">Active Base URL:</span>
                                <code className="bg-white border border-black px-2 py-0.5 font-bold text-black text-xs">
                                    {apiUrl}
                                </code>
                            </div>
                            <p className="text-[11px] text-neutral-600">
                                All cURL, Python, JavaScript, and MCP examples on this page are rendered using this target endpoint.
                            </p>
                        </div>

                        {clientHost && (
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => setApiUrl(clientHost)}
                                    className={`px-3 py-1.5 font-bold uppercase text-xs border border-black transition-colors ${
                                        apiUrl === clientHost
                                            ? "bg-black text-white"
                                            : "bg-white text-black hover:bg-neutral-200"
                                    }`}
                                >
                                    Current Origin ({clientHost})
                                </button>
                                {clientHost.startsWith("https") && (
                                    <button
                                        type="button"
                                        onClick={() => setApiUrl("http://localhost:3000")}
                                        className={`px-3 py-1.5 font-bold uppercase text-xs border border-black transition-colors ${
                                            apiUrl === "http://localhost:3000"
                                                ? "bg-black text-white"
                                                : "bg-white text-black hover:bg-neutral-200"
                                        }`}
                                    >
                                        Localhost (Dev)
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Authentication Section */}
                <section id="auth" className="space-y-6 pt-6 border-t-2 border-black">
                    <div className="flex items-center gap-3">
                        <div className="bg-black text-white p-2">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold uppercase tracking-tight">Authentication</h2>
                            <p className="font-mono text-xs text-neutral-500">Dual Support: API Key (X-API-KEY) or Bearer JWT</p>
                        </div>
                    </div>

                    <div className="border border-black p-4 bg-neutral-50 font-mono text-xs space-y-2">
                        <p>All developer API endpoints and the HTTP MCP server require authentication.</p>
                        <p>
                            Generate your secret key under{" "}
                            <a href="/profile/developer" className="underline font-bold hover:text-neutral-700">
                                Developer Settings
                            </a>
                            . Keys start with the prefix <code className="bg-neutral-200 px-1 font-bold">sk_live_</code>.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <h4 className="font-mono text-xs font-bold uppercase mb-1">Header 1: API Key (Recommended for scripts & MCP)</h4>
                            <CodeBlock
                                label="cURL API Key"
                                code={`curl -H "X-API-KEY: sk_live_..." ${apiUrl}/api/v1/public/inventories`}
                            />
                        </div>
                        <div>
                            <h4 className="font-mono text-xs font-bold uppercase mb-1">Header 2: Bearer JWT (Session token)</h4>
                            <CodeBlock
                                label="cURL Bearer JWT"
                                code={`curl -H "Authorization: Bearer <jwt_token>" ${apiUrl}/api/v1/public/inventories`}
                            />
                        </div>
                    </div>
                </section>

                {/* Interactive OpenAPI Spec Section */}
                <section id="openapi" className="border border-black p-6 bg-neutral-100 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold uppercase tracking-tight">Interactive OpenAPI 3.1.0 Swagger</h3>
                            <p className="font-mono text-xs text-neutral-600">Explore, test, and generate client SDKs with the live schema.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <a
                                href={apiUrl ? `${apiUrl}/api/proxy/docs` : "/api/proxy/docs"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="border border-black bg-white px-3 py-1.5 text-xs font-bold font-mono uppercase hover:bg-black hover:text-white transition-colors flex items-center gap-1.5"
                            >
                                <span>Swagger UI</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <a
                                href={apiUrl ? `${apiUrl}/api/proxy/openapi.json` : "/api/proxy/openapi.json"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="border border-black bg-black text-white px-3 py-1.5 text-xs font-bold font-mono uppercase hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
                            >
                                <span>openapi.json</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </div>
                    </div>
                </section>

                {/* INVENTORIES SECTION */}
                <div className="space-y-12">
                    <div className="border-b-2 border-black pb-2">
                        <h2 className="text-3xl font-bold uppercase tracking-tight flex items-center gap-2">
                            <FolderPlus className="w-7 h-7" />
                            Inventories Management
                        </h2>
                        <p className="font-mono text-xs text-neutral-500">Create, list, update, and manage inventory folders programmatically.</p>
                    </div>

                    {/* 1. POST Create Inventory */}
                    <section id="create-inventory" className="space-y-4 border border-black p-6 bg-white">
                        <div className="flex items-center gap-3">
                            <MethodBadge method="POST" />
                            <h3 className="text-xl font-bold uppercase font-mono">/api/v1/public/inventories</h3>
                        </div>
                        <p className="font-mono text-xs text-neutral-700">
                            <strong>Create an Inventory Folder:</strong> Instantiates a new inventory group owned by your account. You can specify default currency, language, and specialized mode configurations (<code className="bg-neutral-100 px-1 font-bold">GENERAL</code>, <code className="bg-neutral-100 px-1 font-bold">NATURE</code>, or <code className="bg-neutral-100 px-1 font-bold">PLACES</code>).
                        </p>

                        <div className="border border-black p-3 bg-neutral-50 font-mono text-xs">
                            <h4 className="font-bold uppercase text-[11px] mb-2">Request Body Schema (JSON)</h4>
                            <ul className="space-y-1 list-disc list-inside text-neutral-700">
                                <li><strong>name</strong> (string, required): Name of the folder (1-100 characters).</li>
                                <li><strong>description</strong> (string, optional): Short description (max 250 characters).</li>
                                <li><strong>currency</strong> (string, default: &quot;USD&quot;): ISO currency code (USD, COP, EUR, etc.).</li>
                                <li><strong>language</strong> (string, default: &quot;EN&quot;): Preferred language (EN, ES).</li>
                                <li><strong>settings</strong> (object, optional): Custom mode settings, e.g. <code className="bg-neutral-200 px-1">{`{"type": "GENERAL"}`}</code>.</li>
                            </ul>
                        </div>

                        <CodeBlock
                            label="cURL - Create Inventory"
                            code={`curl -X POST ${apiUrl}/api/v1/public/inventories \\
  -H "X-API-KEY: sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Robotics Lab - Sensor Bay",
    "description": "Lidar, IMUs, ultrasonic and camera sensors",
    "currency": "USD",
    "language": "EN",
    "settings": {
      "type": "GENERAL",
      "rack": "B-4",
      "project": "Autonomous Drone v2"
    }
  }'`}
                        />

                        <CodeBlock
                            label="Python - Create Inventory"
                            code={`import requests

url = "${apiUrl}/api/v1/public/inventories"
headers = {
    "X-API-KEY": "sk_live_...",
    "Content-Type": "application/json"
}
payload = {
    "name": "Robotics Lab - Sensor Bay",
    "description": "Lidar, IMUs, ultrasonic and camera sensors",
    "currency": "USD",
    "language": "EN",
    "settings": {"type": "GENERAL", "rack": "B-4"}
}

response = requests.post(url, json=payload, headers=headers)
print("Created Inventory ID:", response.json()["id"])`}
                        />

                        <div className="border border-black p-4 bg-neutral-50 font-mono text-xs">
                            <h4 className="font-bold uppercase text-[11px] mb-2">201 Created Response</h4>
                            <pre className="text-neutral-700 overflow-x-auto">{`{
  "id": 14,
  "name": "Robotics Lab - Sensor Bay",
  "description": "Lidar, IMUs, ultrasonic and camera sensors",
  "currency": "USD",
  "language": "EN",
  "settings": {
    "type": "GENERAL",
    "rack": "B-4",
    "project": "Autonomous Drone v2"
  },
  "item_count": 0,
  "owner_id": 3,
  "is_shared": false,
  "my_role": "OWNER"
}`}</pre>
                        </div>
                    </section>

                    {/* 2. GET List Inventories */}
                    <section id="list-inventories" className="space-y-4 border border-black p-6 bg-white">
                        <div className="flex items-center gap-3">
                            <MethodBadge method="GET" />
                            <h3 className="text-xl font-bold uppercase font-mono">/api/v1/public/inventories</h3>
                        </div>
                        <p className="font-mono text-xs text-neutral-700">
                            Retrieves all inventory folders accessible to you (both owned and shared with you as VIEWER or EDITOR), with item counts and pagination metadata.
                        </p>
                        <CodeBlock
                            label="cURL - List Inventories"
                            code={`curl -H "X-API-KEY: sk_live_..." "${apiUrl}/api/v1/public/inventories?page=1&limit=20"`}
                        />
                    </section>

                    {/* 3. GET / PUT / DELETE Inventory */}
                    <section id="get-inventory" className="space-y-4 border border-black p-6 bg-white">
                        <div className="flex items-center gap-3">
                            <MethodBadge method="GET" />
                            <h3 className="text-xl font-bold uppercase font-mono">/api/v1/public/inventories/{`{id}`}</h3>
                        </div>
                        <p className="font-mono text-xs text-neutral-700">
                            Fetches details of a specific inventory folder. Returns 404 if the folder does not exist or you lack access permissions.
                        </p>
                    </section>

                    <section id="update-inventory" className="space-y-4 border border-black p-6 bg-white">
                        <div className="flex items-center gap-3">
                            <MethodBadge method="PUT" />
                            <h3 className="text-xl font-bold uppercase font-mono">/api/v1/public/inventories/{`{id}`}</h3>
                        </div>
                        <p className="font-mono text-xs text-neutral-700">
                            Update folder properties. Any fields in the <code className="bg-neutral-100 px-1 font-bold">settings</code> dictionary are merged safely without overwriting other existing configuration keys. Requires folder Owner or EDITOR permissions.
                        </p>
                        <CodeBlock
                            label="cURL - Update Inventory"
                            code={`curl -X PUT ${apiUrl}/api/v1/public/inventories/14 \\
  -H "X-API-KEY: sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "description": "Updated sensor bay hardware assets",
    "settings": {
      "rack": "B-5 (Relocated)"
    }
  }'`}
                        />
                    </section>

                    <section id="delete-inventory" className="space-y-4 border border-black p-6 bg-white">
                        <div className="flex items-center gap-3">
                            <MethodBadge method="DELETE" />
                            <h3 className="text-xl font-bold uppercase font-mono">/api/v1/public/inventories/{`{id}`}</h3>
                        </div>
                        <p className="font-mono text-xs text-neutral-700">
                            Permanently deletes an inventory folder and cascades deletion to all contained items. Requires folder Owner role.
                        </p>
                    </section>

                    <section id="geojson" className="space-y-4 border border-black p-6 bg-white">
                        <div className="flex items-center gap-3">
                            <MethodBadge method="GET" />
                            <h3 className="text-xl font-bold uppercase font-mono">/api/v1/groups/{`{id}`}/geojson</h3>
                        </div>
                        <p className="font-mono text-xs text-neutral-700">
                            Exports a standard GeoJSON FeatureCollection of items in this folder that have GPS coordinates. Perfect for Mapbox and Leaflet integrations.
                        </p>
                    </section>
                </div>

                {/* ITEMS SECTION */}
                <div className="space-y-12">
                    <div className="border-b-2 border-black pb-2">
                        <h2 className="text-3xl font-bold uppercase tracking-tight flex items-center gap-2">
                            <PackagePlus className="w-7 h-7" />
                            Items Management & Search
                        </h2>
                        <p className="font-mono text-xs text-neutral-500">Add objects, bulk insert, update metadata, and query across folders.</p>
                    </div>

                    {/* POST Create Item */}
                    <section id="create-item" className="space-y-4 border border-black p-6 bg-white">
                        <div className="flex items-center gap-3">
                            <MethodBadge method="POST" />
                            <h3 className="text-xl font-bold uppercase font-mono">/api/v1/public/inventories/{`{group_id}`}/items</h3>
                        </div>
                        <p className="font-mono text-xs text-neutral-700">
                            Adds an item directly into an inventory folder. Requires folder Owner or EDITOR permissions.
                        </p>
                        <CodeBlock
                            label="cURL - Create Item"
                            code={`curl -X POST ${apiUrl}/api/v1/public/inventories/14/items \\
  -H "X-API-KEY: sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "RPLIDAR A1 360 Laser Scanner",
    "description": "360-degree laser triangulation scanner",
    "category": "Sensors",
    "price": 119.50,
    "quantity": 3,
    "status": "completed",
    "meta_data": {
      "model": "A1M8",
      "range_meters": 12,
      "sample_rate": "8000Hz"
    }
  }'`}
                        />
                    </section>

                    {/* POST Bulk Items */}
                    <section id="bulk-create-items" className="space-y-4 border border-black p-6 bg-white">
                        <div className="flex items-center gap-3">
                            <MethodBadge method="POST" />
                            <h3 className="text-xl font-bold uppercase font-mono">/api/v1/public/inventories/{`{group_id}`}/items/bulk</h3>
                        </div>
                        <p className="font-mono text-xs text-neutral-700">
                            Atomically inserts multiple items (up to 50) into an inventory folder within a single transaction.
                        </p>
                        <CodeBlock
                            label="cURL - Bulk Create Items"
                            code={`curl -X POST ${apiUrl}/api/v1/public/inventories/14/items/bulk \\
  -H "X-API-KEY: sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "items": [
      {
        "name": "HC-SR04 Ultrasonic Sensor",
        "category": "Sensors",
        "price": 3.50,
        "quantity": 20
      },
      {
        "name": "MPU-6050 Accelerometer/Gyro",
        "category": "Sensors",
        "price": 4.25,
        "quantity": 15
      }
    ]
  }'`}
                        />
                    </section>

                    {/* GET Search Items */}
                    <section id="search-items" className="space-y-4 border border-black p-6 bg-white">
                        <div className="flex items-center gap-3">
                            <MethodBadge method="GET" />
                            <h3 className="text-xl font-bold uppercase font-mono">/api/v1/public/items/search</h3>
                        </div>
                        <p className="font-mono text-xs text-neutral-700">
                            Search and filter items across all inventory folders accessible to you. Supports full-text query (<code className="bg-neutral-100 px-1 font-bold">q</code>), category matching, price intervals, status, and specific folder scoping.
                        </p>
                        <CodeBlock
                            label="cURL - Search Items"
                            code={`curl -H "X-API-KEY: sk_live_..." \\
  "${apiUrl}/api/v1/public/items/search?q=Sensor&category=Sensors&min_price=1.00&max_price=200.00&limit=25"`}
                        />
                    </section>

                    {/* PUT Update Item */}
                    <section id="update-item" className="space-y-4 border border-black p-6 bg-white">
                        <div className="flex items-center gap-3">
                            <MethodBadge method="PUT" />
                            <h3 className="text-xl font-bold uppercase font-mono">/api/v1/public/items/{`{item_id}`}</h3>
                        </div>
                        <p className="font-mono text-xs text-neutral-700">
                            Updates item fields. When updating <code className="bg-neutral-100 px-1 font-bold">meta_data</code>, new keys are merged non-destructively so existing metadata fields are preserved. You can also move an item between folders by updating <code className="bg-neutral-100 px-1 font-bold">group_id</code> (verifying write access on the target folder).
                        </p>
                    </section>

                    {/* DELETE Item */}
                    <section id="delete-item" className="space-y-4 border border-black p-6 bg-white">
                        <div className="flex items-center gap-3">
                            <MethodBadge method="DELETE" />
                            <h3 className="text-xl font-bold uppercase font-mono">/api/v1/public/items/{`{item_id}`}</h3>
                        </div>
                        <p className="font-mono text-xs text-neutral-700">
                            Permanently deletes an item. Requires ownership or folder EDITOR role.
                        </p>
                    </section>
                </div>

                {/* MODEL CONTEXT PROTOCOL (MCP) SECTION */}
                <div id="mcp" className="space-y-12 pt-6 border-t-4 border-black">
                    <div className="border-b-2 border-black pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-black text-white flex items-center justify-center">
                                <Bot className="w-7 h-7" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold uppercase tracking-tight">Model Context Protocol (MCP)</h2>
                                <p className="font-mono text-xs text-neutral-500">Autonomous LLM Tool Interface over HTTP & Stdio</p>
                            </div>
                        </div>
                    </div>

                    {/* MCP Overview */}
                    <section id="mcp-overview" className="space-y-4">
                        <h3 className="text-xl font-bold uppercase">What is MCP?</h3>
                        <p className="font-mono text-xs text-neutral-700 leading-relaxed">
                            The <strong>Model Context Protocol (MCP)</strong> is the open standard created by Anthropic that allows Large Language Models (Claude, Cursor, ChatGPT, Antigravity) to safely discover and execute tools on external systems. SmartInventory natively implements the MCP specification over HTTP, exposing 12 scoped tools so an AI assistant can manage your inventories directly from natural language prompts.
                        </p>
                    </section>

                    {/* MCP Security & Scoping */}
                    <section id="mcp-security" className="border-2 border-black p-6 bg-neutral-50 space-y-3 font-mono text-xs">
                        <h3 className="font-bold uppercase text-sm flex items-center gap-2 text-black">
                            <ShieldCheck className="w-5 h-5 text-green-600" />
                            Strict Per-User Security & Isolation
                        </h3>
                        <p className="text-neutral-700">
                            Every MCP call is securely authenticated through your API Key or Bearer JWT. The server resolves your authenticated user account for every tool invocation.
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-neutral-600">
                            <li>An LLM can <strong>only view and search</strong> inventories and items owned by you or shared with you.</li>
                            <li>Write actions (<code className="font-bold">create_inventory</code>, <code className="font-bold">create_item</code>, <code className="font-bold">update_item</code>) enforce ownership or EDITOR role verification.</li>
                            <li>Deletion tools (<code className="font-bold">delete_inventory</code>, <code className="font-bold">delete_item</code>) strictly prevent unauthorized deletions.</li>
                        </ul>
                    </section>

                    {/* HTTP JSON-RPC Protocol */}
                    <section id="mcp-http" className="space-y-4 border border-black p-6 bg-white">
                        <div className="flex items-center gap-3">
                            <MethodBadge method="POST" />
                            <h3 className="text-xl font-bold uppercase font-mono">/mcp (HTTP JSON-RPC 2.0)</h3>
                        </div>
                        <p className="font-mono text-xs text-neutral-700">
                            Standard JSON-RPC 2.0 endpoint for modern HTTP-based MCP clients. Accepts standard methods such as <code className="bg-neutral-100 px-1 font-bold">initialize</code>, <code className="bg-neutral-100 px-1 font-bold">tools/list</code>, and <code className="bg-neutral-100 px-1 font-bold">tools/call</code>.
                        </p>

                        <CodeBlock
                            label="JSON-RPC Tool Call - create_inventory"
                            code={`curl -X POST ${apiUrl}/mcp \\
  -H "X-API-KEY: sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "create_inventory",
      "arguments": {
        "name": "Drone Components",
        "description": "Motors, ESCs, props, and flight controllers",
        "currency": "USD"
      }
    }
  }'`}
                        />

                        <CodeBlock
                            label="JSON-RPC Tool Call - create_item"
                            code={`curl -X POST ${apiUrl}/mcp \\
  -H "X-API-KEY: sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "create_item",
      "arguments": {
        "group_id": 14,
        "name": "Brushless Motor 2207 1950KV",
        "category": "Motors",
        "price": 24.99,
        "quantity": 4
      }
    }
  }'`}
                        />
                    </section>

                    {/* Server-Sent Events (SSE) */}
                    <section id="mcp-sse" className="space-y-4 border border-black p-6 bg-white">
                        <div className="flex items-center gap-3">
                            <MethodBadge method="GET" />
                            <h3 className="text-xl font-bold uppercase font-mono">/mcp/sse (Streaming SSE Transport)</h3>
                        </div>
                        <p className="font-mono text-xs text-neutral-700">
                            For SSE-based MCP clients, connect to <code className="bg-neutral-100 px-1 font-bold">GET /mcp/sse?api_key=sk_live_...</code>. The endpoint returns an SSE event stream assigning a session ID, and handles client JSON-RPC messages posted to <code className="bg-neutral-100 px-1 font-bold">POST /mcp/messages?sessionId={'{id}'}</code>.
                        </p>
                    </section>

                    {/* Claude Desktop & Cursor Integration */}
                    <section id="mcp-claude" className="space-y-6 border border-black p-6 bg-white">
                        <h3 className="text-xl font-bold uppercase">LLM & Editor Configurations (Claude, Cursor, Cline)</h3>
                        <p className="font-mono text-xs text-neutral-700 leading-relaxed">
                            SmartInventory supports both <strong>Direct Native HTTP MCP</strong> (recommended for HTTP-compatible agents) and a lightweight <strong>stdio bridge</strong> (<code className="bg-neutral-100 px-1 font-bold">mcp_server.py</code>) for desktop apps like Claude Desktop.
                        </p>

                        <div className="space-y-4">
                            <h4 className="font-mono text-xs font-bold uppercase text-black">
                                Option A: Native HTTP MCP (Cursor, OpenWebUI, LibreChat, Custom Agents)
                            </h4>
                            <p className="font-mono text-[11px] text-neutral-600">
                                Connect directly to the production MCP endpoint over HTTP with your API key header:
                            </p>
                            <CodeBlock
                                label="HTTP MCP Server Configuration"
                                code={`{
  "mcpServers": {
    "smartinventory": {
      "url": "${apiUrl}/mcp",
      "headers": {
        "X-API-KEY": "sk_live_your_api_key_here"
      }
    }
  }
}`}
                            />
                        </div>

                        <div className="space-y-4 pt-4 border-t border-dashed border-neutral-300">
                            <h4 className="font-mono text-xs font-bold uppercase text-black">
                                Option B: Claude Desktop (via Python Stdio Bridge)
                            </h4>
                            <p className="font-mono text-[11px] text-neutral-600">
                                In <code className="bg-neutral-100 px-1 font-bold">claude_desktop_config.json</code>, execute the bridge script pointing to the production platform:
                            </p>
                            <CodeBlock
                                label="claude_desktop_config.json"
                                code={`{
  "mcpServers": {
    "smartinventory": {
      "command": "python3",
      "args": ["/path/to/smartinventory/mcp_server.py"],
      "env": {
        "SMARTINVENTORY_API_URL": "${apiUrl}",
        "SMARTINVENTORY_API_KEY": "sk_live_your_api_key_here"
      }
    }
  }
}`}
                            />
                        </div>
                    </section>

                    {/* 12 MCP Tools Reference Table */}
                    <section id="mcp-tools" className="space-y-6">
                        <h3 className="text-2xl font-bold uppercase tracking-tight">The 12 Registered MCP Tools</h3>
                        <p className="font-mono text-xs text-neutral-600">
                            The following tools are automatically announced to the LLM during initialization:
                        </p>

                        <div className="border border-black overflow-x-auto">
                            <table className="w-full text-left font-mono text-xs">
                                <thead className="bg-black text-white uppercase text-[11px]">
                                    <tr>
                                        <th className="p-3 border-r border-neutral-700">Tool Name</th>
                                        <th className="p-3 border-r border-neutral-700">Description</th>
                                        <th className="p-3">Required Arguments</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black bg-white">
                                    <tr className="hover:bg-neutral-50">
                                        <td className="p-3 font-bold text-blue-700 border-r border-black">list_inventories</td>
                                        <td className="p-3 border-r border-black">List all accessible inventory folders with item counts and user roles.</td>
                                        <td className="p-3 text-neutral-500">None (optional: page, limit)</td>
                                    </tr>
                                    <tr className="hover:bg-neutral-50">
                                        <td className="p-3 font-bold text-blue-700 border-r border-black">get_inventory</td>
                                        <td className="p-3 border-r border-black">Retrieve folder details, settings, and member role.</td>
                                        <td className="p-3 font-bold">group_id (int)</td>
                                    </tr>
                                    <tr className="hover:bg-neutral-50 bg-green-50/50">
                                        <td className="p-3 font-bold text-green-700 border-r border-black">create_inventory</td>
                                        <td className="p-3 border-r border-black">Create a new inventory folder for the user.</td>
                                        <td className="p-3 font-bold">name (str)</td>
                                    </tr>
                                    <tr className="hover:bg-neutral-50">
                                        <td className="p-3 font-bold text-amber-700 border-r border-black">update_inventory</td>
                                        <td className="p-3 border-r border-black">Update folder properties and merge settings.</td>
                                        <td className="p-3 font-bold">group_id (int)</td>
                                    </tr>
                                    <tr className="hover:bg-neutral-50">
                                        <td className="p-3 font-bold text-red-700 border-r border-black">delete_inventory</td>
                                        <td className="p-3 border-r border-black">Permanently delete a folder and all its items.</td>
                                        <td className="p-3 font-bold">group_id (int)</td>
                                    </tr>
                                    <tr className="hover:bg-neutral-50">
                                        <td className="p-3 font-bold text-blue-700 border-r border-black">list_items</td>
                                        <td className="p-3 border-r border-black">List items in an inventory folder with pagination.</td>
                                        <td className="p-3 font-bold">group_id (int)</td>
                                    </tr>
                                    <tr className="hover:bg-neutral-50">
                                        <td className="p-3 font-bold text-blue-700 border-r border-black">get_item</td>
                                        <td className="p-3 border-r border-black">Get detailed information and metadata for an item.</td>
                                        <td className="p-3 font-bold">item_id (int)</td>
                                    </tr>
                                    <tr className="hover:bg-neutral-50 bg-green-50/50">
                                        <td className="p-3 font-bold text-green-700 border-r border-black">create_item</td>
                                        <td className="p-3 border-r border-black">Add an item into an inventory folder.</td>
                                        <td className="p-3 font-bold">group_id (int), name (str)</td>
                                    </tr>
                                    <tr className="hover:bg-neutral-50 bg-green-50/50">
                                        <td className="p-3 font-bold text-green-700 border-r border-black">bulk_create_items</td>
                                        <td className="p-3 border-r border-black">Batch create up to 50 items in an inventory folder atomically.</td>
                                        <td className="p-3 font-bold">group_id (int), items (list)</td>
                                    </tr>
                                    <tr className="hover:bg-neutral-50">
                                        <td className="p-3 font-bold text-amber-700 border-r border-black">update_item</td>
                                        <td className="p-3 border-r border-black">Update item fields and safely merge custom metadata.</td>
                                        <td className="p-3 font-bold">item_id (int)</td>
                                    </tr>
                                    <tr className="hover:bg-neutral-50">
                                        <td className="p-3 font-bold text-red-700 border-r border-black">delete_item</td>
                                        <td className="p-3 border-r border-black">Permanently delete an item from inventory.</td>
                                        <td className="p-3 font-bold">item_id (int)</td>
                                    </tr>
                                    <tr className="hover:bg-neutral-50 bg-purple-50/50">
                                        <td className="p-3 font-bold text-purple-700 border-r border-black">search_items</td>
                                        <td className="p-3 border-r border-black">Search items across all accessible folders by query, category, or price.</td>
                                        <td className="p-3 text-neutral-500">None (optional: q, category, min_price, max_price)</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
