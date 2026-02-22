import React from 'react';
import { Globe, Satellite } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlanetAnimationProps {
    className?: string;
}

export const PlanetAnimation = ({ className }: PlanetAnimationProps) => {
    return (
        <div className={cn("relative flex items-center justify-center pointer-events-none select-none", className)}>
            {/* Decorative Orbits */}
            <div className="absolute w-[400px] h-[400px] border border-primary/10 rounded-full animate-[spin_40s_linear_infinite]" />
            <div className="absolute w-[300px] h-[300px] border border-primary/5 rounded-full animate-[spin_25s_linear_infinite_reverse] border-dashed" />
            <div className="absolute w-[500px] h-[500px] border border-primary/5 rounded-full animate-[spin_60s_linear_infinite]" />

            {/* Satellite Orbit 1 */}
            <div className="absolute w-[350px] h-[350px] animate-[spin_15s_linear_infinite]">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="relative">
                        <Satellite className="w-6 h-6 text-primary rotate-45" />
                        <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full animate-pulse" />
                    </div>
                </div>
            </div>

            {/* Satellite Orbit 2 */}
            <div className="absolute w-[450px] h-[450px] animate-[spin_20s_linear_infinite_reverse]">
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
                    <div className="relative">
                        <div className="w-2 h-2 bg-primary rounded-full shadow-[0_0_15px_rgba(0,189,255,0.8)]" />
                        <div className="absolute -inset-4 border border-primary/20 rounded-full animate-ping" />
                    </div>
                </div>
            </div>

            {/* Planet Earth */}
            <div className="relative group">
                {/* Outer Glow */}
                <div className="absolute -inset-12 bg-primary/10 blur-[80px] rounded-full animate-pulse-slow" />
                <div className="absolute -inset-4 bg-primary/5 blur-2xl rounded-full" />

                {/* The Planet */}
                <div className="relative w-64 h-64 rounded-full bg-[#0a1628] border border-primary/30 flex items-center justify-center backdrop-blur-sm shadow-[inset_0_0_50px_rgba(0,189,255,0.1)] overflow-hidden">
                    {/* Internal Grid */}
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #00bdff 1px, transparent 1px)', backgroundSize: '16px 16px' }} />

                    {/* Rotating Continents (Technical Map) */}
                    <div className="absolute inset-0 flex animate-[map-pan_30s_linear_infinite]">
                        <div className="flex-none w-[512px] h-full opacity-30">
                            <svg viewBox="0 0 512 256" className="w-full h-full fill-primary">
                                <path d="M50 80 Q70 60 90 80 T130 70 T170 90 T210 80 T250 100 T290 80 T330 90 T370 70 T410 80 T450 60 T480 90 L480 200 L50 200 Z" opacity="0.4" />
                                <path d="M30 40 Q60 20 90 40 T140 30 T190 50 L190 100 L30 100 Z" opacity="0.2" />
                                <circle cx="100" cy="50" r="2" opacity="0.6" />
                                <circle cx="200" cy="120" r="1.5" opacity="0.4" />
                                <circle cx="350" cy="80" r="2" opacity="0.5" />
                                <circle cx="420" cy="150" r="1" opacity="0.3" />
                            </svg>
                        </div>
                        <div className="flex-none w-[512px] h-full opacity-30">
                            <svg viewBox="0 0 512 256" className="w-full h-full fill-primary">
                                <path d="M50 80 Q70 60 90 80 T130 70 T170 90 T210 80 T250 100 T290 80 T330 90 T370 70 T410 80 T450 60 T480 90 L480 200 L50 200 Z" opacity="0.4" />
                                <path d="M30 40 Q60 20 90 40 T140 30 T190 50 L190 100 L30 100 Z" opacity="0.2" />
                                <circle cx="100" cy="50" r="2" opacity="0.6" />
                                <circle cx="200" cy="120" r="1.5" opacity="0.4" />
                                <circle cx="350" cy="80" r="2" opacity="0.5" />
                                <circle cx="420" cy="150" r="1" opacity="0.3" />
                            </svg>
                        </div>
                    </div>

                    {/* Wireframe Overlay */}
                    <Globe className="absolute w-[90%] h-[90%] text-primary/10" />

                    {/* Scanning Line */}
                    <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
                        <div className="w-full h-[20%] bg-gradient-to-b from-transparent via-primary/20 to-transparent blur-sm animate-[scan_6s_ease-in-out_infinite]" />
                    </div>

                    {/* Atmosphere reflections */}
                    <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(0,189,255,0.1),transparent_70%)] border border-primary/20" />
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(500%); }
        }
        @keyframes map-pan {
          0% { transform: translateX(0); }
          100% { transform: translateX(-512px); }
        }
      `}} />
        </div>
    );
};
