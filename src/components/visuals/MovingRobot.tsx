import React from 'react';

export const MovingRobot = () => {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/2 -translate-y-1/2 animate-robot-move flex items-center justify-center">
                <div className="relative group scale-[0.25] md:scale-[0.3]">
                    {/* Sombra no chão */}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-1.5 bg-black/10 blur-sm rounded-full animate-pulse" />

                    {/* Corpo do Robô */}
                    <div className="relative flex flex-col items-center">

                        {/* Cabeça / Tela */}
                        <div className="relative z-20 animate-bot-head">
                            <div className="w-14 h-10 bg-[#1a1a1a] rounded-[1.5rem] border-2 border-white/10 shadow-2xl flex items-center justify-center overflow-hidden relative">
                                {/* Brilho da tela */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-white/5 opacity-50" />

                                {/* Olhos Animados */}
                                <div className="flex gap-2 relative z-10">
                                    <div className="w-3 h-3 bg-white rounded-full animate-bot-eyes relative">
                                        <div className="absolute top-0.5 right-0.5 w-1 h-1 bg-sky-200 rounded-full" />
                                    </div>
                                    <div className="w-3 h-3 bg-white rounded-full animate-bot-eyes relative scale-x-[-1]">
                                        <div className="absolute top-0.5 right-0.5 w-1 h-1 bg-sky-200 rounded-full" />
                                    </div>
                                </div>

                                {/* Rubor/Corações pequenos */}
                                <div className="absolute bottom-1.5 flex gap-4 opacity-30">
                                    <div className="w-1.5 h-0.5 bg-red-400 blur-[0.5px] rounded-full" />
                                    <div className="w-1.5 h-0.5 bg-red-400 blur-[0.5px] rounded-full" />
                                </div>
                            </div>

                            {/* Pescoço */}
                            <div className="w-3 h-2 bg-gradient-to-b from-gray-400 to-gray-600 mx-auto -mt-1 rounded-sm border-x border-black/10 relative z-10" />
                        </div>

                        {/* Base Esférica (Tronco) */}
                        <div className="w-16 h-16 bg-gradient-to-b from-white via-gray-100 to-gray-300 rounded-full -mt-2 shadow-xl border border-white/50 relative overflow-hidden">
                            {/* Brilho lateral colorido */}
                            <div className="absolute right-0 top-1/4 bottom-1/4 w-0.5 bg-gradient-to-b from-blue-400 via-purple-400 to-orange-400 opacity-60 blur-[0.5px] rounded-l-full" />
                            <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-gradient-to-b from-blue-400 via-purple-400 to-orange-400 opacity-60 blur-[0.5px] rounded-r-full" />

                            {/* Detalhe frontal */}
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gray-400/30 rounded-full" />

                            {/* Reflexo superior */}
                            <div className="absolute top-1.5 left-1/4 w-8 h-4 bg-white/60 blur-md rounded-full rotate-[-20deg]" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
