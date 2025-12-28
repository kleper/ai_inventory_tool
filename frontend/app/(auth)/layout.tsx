export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            {/* Left Side - Hero / Branding */}
            <div className="hidden lg:flex flex-col justify-between bg-zinc-900 p-12 text-white">
                <div>
                    <div className="flex items-center gap-2 font-bold text-xl mb-4">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">AI</div>
                        SmartInventory
                    </div>
                    <h1 className="text-4xl font-bold max-w-md mt-12">
                        A smarter way to manage your assets with AI.
                    </h1>
                </div>
                <div className="text-zinc-500 text-sm">
                    &copy; 2025 SmartInventory SaaS
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="flex items-center justify-center p-8 bg-white">
                <div className="w-full max-w-sm">
                    {children}
                </div>
            </div>
        </div>
    )
}
