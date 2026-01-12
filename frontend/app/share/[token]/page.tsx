import { Metadata } from 'next';
import { API_BASE_URL } from '@/lib/config';
import { SecureImage } from '@/components/ui/SecureImage';
import { formatCurrency } from '@/lib/currency';


/* 
  Ideally, we fetch data on server side for Metadata.
  Since the backend is in a container, we access it via INTERNAL URL if possible, or public if exposed.
  Usually in Next.js SSR process, we can use the internal service URL or localhost if running locally.
  However, API_BASE_URL in client config is usually public-facing proxy.
  For SSR, if on same network, we might need a different URL.
  Assuming API_BASE_URL works or we override. 
*/

async function getItem(token: string) {
    // Use internal docker URL or configured base URL
    // If running in same docker compose network, backend is `http://backend:8000`
    // But we are in Next.js container (usually). 
    // Let's try standard fetch.
    // Using direct fetch to backend container if available
    const internalUrl = process.env.INTERNAL_API_URL || "http://backend:8000";
    // Failover to API_BASE_URL if needed

    try {
        const res = await fetch(`${internalUrl}/api/v1/public/share/${token}`, { cache: 'no-store' });
        if (!res.ok) return null;
        return res.json();
    } catch (e) {
        console.error("Error fetching public item", e);
        return null;
    }
}

type Props = {
    params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { token } = await params;
    const item = await getItem(token);

    if (!item) {
        return {
            title: 'Item Not Found',
        }
    }

    const imageUrl = item.image_url?.startsWith('http')
        ? item.image_url
        : `${process.env.NEXT_PUBLIC_API_URL || 'https://smartinventory.app'}/api/v1/public/share/${token}/image`;

    return {
        title: item.name,
        description: item.description || `Check out ${item.name} on SmartInventory.`,
        openGraph: {
            title: item.name,
            description: item.description || "View this item on SmartInventory.",
            images: [
                {
                    url: imageUrl,
                    width: 800,
                    height: 600,
                    alt: item.name,
                },
            ],
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: item.name,
            description: item.description,
            images: [imageUrl],
        },
    }
}

export default async function PublicSharePage({ params }: Props) {
    const { token } = await params;
    const item = await getItem(token);

    if (!item) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-black uppercase">404</h1>
                    <p className="text-neutral-500 font-mono">Item not found or link revoked.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans text-black">


            <main className="flex-1 flex items-center justify-center p-6 bg-neutral-50">
                <div className="max-w-md w-full bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-0 overflow-hidden">
                    {/* Image */}
                    <div className="aspect-square bg-neutral-100 border-b-2 border-black relative">
                        {item.image_url ? (
                            <img
                                src={item.image_url.startsWith('http') ? item.image_url : `${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/public/share/${token}/image`}
                                alt={item.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-300">
                                No Image
                            </div>
                        )}

                        {/* Status Badge */}
                        <div className="absolute top-4 right-4 bg-black text-white px-3 py-1 text-xs font-bold uppercase tracking-wider">
                            {item.status}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4">
                        <div>
                            <div className="flex justify-between items-start gap-4">
                                <h1 className="text-3xl font-black uppercase leading-tight tracking-tight">
                                    {item.name}
                                </h1>
                            </div>
                            <span className="inline-block bg-neutral-100 px-2 py-1 text-xs font-mono uppercase mt-2 border border-black/10">
                                {item.category || "Uncategorized"}
                            </span>
                        </div>

                        <div className="border-t border-black/10 pt-4">
                            <span className="text-xs text-neutral-500 font-bold uppercase block mb-1">Estimated Value</span>
                            <span className="text-2xl font-bold font-mono">
                                {item.price ? formatCurrency(item.price, item.currency) : "---"}
                            </span>
                        </div>

                        {item.description && (
                            <div className="border-t border-black/10 pt-4">
                                <span className="text-xs text-neutral-500 font-bold uppercase block mb-1">Description</span>
                                <p className="text-sm leading-relaxed text-neutral-700">
                                    {item.description}
                                </p>
                            </div>
                        )}

                        {/* Metadata Block if exists */}
                        {item.meta_data && Object.keys(item.meta_data).length > 0 && (
                            <div className="border-t border-black/10 pt-4">
                                <span className="text-xs text-neutral-500 font-bold uppercase block mb-2">Details</span>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(item.meta_data).map(([k, v]) => (
                                        typeof v !== 'object' && (
                                            <div key={k} className="bg-neutral-50 p-2 border border-neutral-200">
                                                <span className="block text-[10px] uppercase text-neutral-400 font-bold">{k}</span>
                                                <span className="block text-xs font-mono truncate">{String(v)}</span>
                                            </div>
                                        )
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>


        </div>
    );
}


