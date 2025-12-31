import { ReactNode } from 'react';

export default function AuthLayout({
    children,
}: {
    children: ReactNode
}) {
    return (
        <div className="flex flex-col items-center justify-center py-6 sm:px-6 lg:px-8 relative overflow-hidden bg-[#0B0E14]" style={{ minHeight: '100dvh' }}>
            {/* Animated Background Mesh */}
            <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
                <div
                    className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse"
                    style={{ animationDuration: '8s' }}
                />
                <div
                    className="absolute top-[10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[100px] animate-pulse"
                    style={{ animationDuration: '10s', animationDelay: '1s' }}
                />
                <div
                    className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] bg-cyan-600/10 rounded-full blur-[130px] animate-pulse"
                    style={{ animationDuration: '12s', animationDelay: '2s' }}
                />
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 flex flex-col items-center">
                <h2 className="mt-6 text-center text-5xl font-extrabold tracking-tight text-white mb-2 drop-shadow-lg">
                    Sonic<span className="text-cyan-400">AI</span>
                </h2>
                <p className="text-center text-sm text-gray-400 max-w-xs">
                    The next generation of multimodal intelligence.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                {/* Clean glass container without default white border for a sleeker look */}
                <div className="bg-white/5 backdrop-blur-2xl px-4 py-8 shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)] sm:rounded-2xl sm:px-10 border border-white/10">
                    {children}
                </div>
            </div>
        </div>
    )
}
