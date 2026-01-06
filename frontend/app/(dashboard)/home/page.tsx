import UserGlobalDashboard from '@/components/features/UserGlobalDashboard';

export default function HomePage() {
    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="mb-8">
                <h1 className="text-4xl font-black font-mono uppercase tracking-tighter mb-2">
                    Command Center
                </h1>
                <p className="font-mono text-gray-500 uppercase text-sm border-b border-black pb-4">
                    Global Asset Overview
                </p>
            </div>

            <UserGlobalDashboard />
        </div>
    );
}
