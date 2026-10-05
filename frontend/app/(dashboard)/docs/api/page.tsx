import { headers } from "next/headers";
import ApiDocsClient from "@/components/features/ApiDocsClient";

export default async function ApiDocsPage() {
    const headersList = await headers();
    const host = headersList.get("x-forwarded-host") || headersList.get("host") || "";
    const proto = headersList.get("x-forwarded-proto") || (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
    const detectedOrigin = host ? `${proto}://${host}` : "";

    const baseUrl = detectedOrigin || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "";

    return <ApiDocsClient baseUrl={baseUrl} />;
}
