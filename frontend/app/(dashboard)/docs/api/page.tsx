import ApiDocsClient from "@/components/features/ApiDocsClient";

export default function ApiDocsPage() {
    // Server-side environment variable access
    // Fallback to localhost if not set (development)
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    return <ApiDocsClient baseUrl={baseUrl} />;
}
