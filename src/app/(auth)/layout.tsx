import { ReactNode } from 'react';

export default function AuthLayout({
    children,
}: {
    children: ReactNode
}) {
    return (
        <div className="flex flex-col items-center justify-center py-10 sm:px-6 lg:px-8 relative overflow-hidden bg-background" style={{ minHeight: '100dvh' }}>
            {/* Animated Cosmic Background Nebula */}
            <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-purple-600/15 rounded-full animate-nebula-slow" />
                <div className="absolute top-[20%] right-[-15%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full animate-nebula-reverse" />
                <div className="absolute bottom-[-20%] left-[10%] w-[70%] h-[70%] bg-pink-500/8 rounded-full animate-nebula-slow" style={{ animationDelay: '-5s' }} />
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 flex flex-col items-center px-4">
                <h2 className="mt-6 text-center text-5xl font-black tracking-tight text-white mb-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] font-heading">
                    Sonic<span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-500">AI</span>
                </h2>
                <p className="text-center text-xs sm:text-sm text-gray-400 max-w-xs uppercase tracking-wider font-semibold opacity-80">
                    The next generation of intelligence
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 w-full px-4 sm:px-0">
                {/* Premium glass container */}
                <div className="glass-card px-4 py-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] sm:rounded-2xl sm:px-10">
                    {children}
                </div>
            </div>
        </div>
    )
}
