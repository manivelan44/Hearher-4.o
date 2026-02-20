'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User, Sparkles, Mic, Square } from 'lucide-react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function POSHChatbot() {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: "Hi! I'm **Aasha**, your POSH Act assistant. 💜 Ask me anything about workplace safety, your rights, or the complaint process. You can also tap 🎤 to speak!" },
    ]);
    const [streaming, setStreaming] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Voice
    const [isListening, setIsListening] = useState(false);
    const [voiceSupported, setVoiceSupported] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null);
    const finalTranscriptRef = useRef('');

    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        setVoiceSupported(!!SR);
    }, []);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, open]);

    // ─── Send message to AI ──────────────────────────────────────────────────

    const doSend = useCallback(async (msg: string, prevMessages?: Message[]) => {
        const text = msg.trim();
        if (!text) return;

        setInput('');

        const history = prevMessages || messages;
        const userMsg: Message = { role: 'user', content: text };
        setMessages((prev) => [...prev, userMsg, { role: 'assistant', content: '' }]);
        setStreaming(true);

        try {
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    history: history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
                }),
            });

            if (!res.ok) throw new Error('Chat failed');

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();

            if (reader) {
                let fullResponse = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));
                    for (const line of lines) {
                        const data = line.slice(6);
                        if (data === '[DONE]') break;
                        try {
                            const parsed = JSON.parse(data);
                            fullResponse += parsed.token || '';
                            setMessages((prev) => {
                                const updated = [...prev];
                                updated[updated.length - 1] = { role: 'assistant', content: fullResponse };
                                return updated;
                            });
                        } catch { /* skip */ }
                    }
                }
            }
        } catch (err) {
            console.error('Chat error:', err);
            setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                    role: 'assistant',
                    content: "I'm sorry, I couldn't process that. Please try again or contact your HR directly.",
                };
                return updated;
            });
        } finally {
            setStreaming(false);
        }
    }, [messages]);

    const handleSend = () => {
        if (input.trim() && !streaming) doSend(input);
    };

    // ─── Voice: request mic permission first, then start recognition ─────────

    const startVoice = useCallback(async () => {
        try {
            // Step 1: Explicitly request mic permission via getUserMedia
            // This ensures the browser permission prompt appears BEFORE speech recognition
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Stop the stream immediately — we only needed permission
            stream.getTracks().forEach((t) => t.stop());
        } catch (err) {
            console.warn('Mic permission denied:', err);
            alert('Microphone permission is required for voice input. Please allow it in your browser settings.');
            return;
        }

        // Step 2: Now start SpeechRecognition (permission already granted)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) return;

        finalTranscriptRef.current = '';
        setInput('');

        const recognition = new SR();
        recognition.lang = 'en-IN';
        recognition.interimResults = true;
        recognition.continuous = false;
        recognition.maxAlternatives = 1;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
            let interim = '';
            let finalText = '';

            for (let i = 0; i < event.results.length; i++) {
                const r = event.results[i];
                if (r.isFinal) {
                    finalText += r[0].transcript;
                } else {
                    interim += r[0].transcript;
                }
            }

            if (finalText) {
                finalTranscriptRef.current = finalText;
                setInput(finalText);
            } else if (interim) {
                setInput(interim);
            }
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onerror = (event: any) => {
            console.warn('Speech recognition error:', event.error);
            setIsListening(false);
            recognitionRef.current = null;
        };

        recognition.onend = () => {
            setIsListening(false);
            recognitionRef.current = null;

            const text = finalTranscriptRef.current.trim();
            if (text) {
                // Auto-send after a brief delay for UI to update
                setTimeout(() => {
                    doSend(text);
                }, 400);
            }
        };

        recognitionRef.current = recognition;

        try {
            recognition.start();
            setIsListening(true);
        } catch (err) {
            console.error('Failed to start recognition:', err);
            setIsListening(false);
        }
    }, [doSend]);

    const stopVoice = useCallback(() => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch { /* already stopped */ }
        }
    }, []);

    const toggleVoice = () => {
        if (isListening) {
            stopVoice();
        } else if (!streaming) {
            startVoice();
        }
    };

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <>
            {/* Floating Button */}
            <motion.button
                onClick={() => setOpen((p) => !p)}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl"
                style={{ background: 'linear-gradient(135deg, #e855a0, #a855f7)' }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Open POSH assistant"
            >
                <AnimatePresence mode="wait">
                    {open ? (
                        <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                            <X size={22} color="white" />
                        </motion.div>
                    ) : (
                        <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                            <MessageCircle size={22} color="white" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>

            {/* Chat Panel */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                        className="fixed bottom-24 right-6 z-50 w-[380px] max-h-[520px] rounded-2xl overflow-hidden flex flex-col"
                        style={{ background: '#0f0c1e', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}
                    >
                        {/* Header */}
                        <div className="p-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #e855a015, #a855f710)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e855a0, #a855f7)' }}>
                                <Sparkles size={16} color="white" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">Aasha — POSH Assistant</p>
                                <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Online • Voice + AI
                                </p>
                            </div>
                        </div>

                        {/* Messages */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[350px]">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: msg.role === 'user' ? '#3b82f620' : '#e855a015' }}>
                                        {msg.role === 'user' ? <User size={13} className="text-blue-400" /> : <Bot size={13} className="text-[#e855a0]" />}
                                    </div>
                                    <div
                                        className="max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed"
                                        style={{
                                            background: msg.role === 'user' ? '#3b82f618' : 'rgba(255,255,255,0.04)',
                                            color: msg.role === 'user' ? '#93c5fd' : '#c4bdd6',
                                            border: `1px solid ${msg.role === 'user' ? '#3b82f620' : 'rgba(255,255,255,0.06)'}`,
                                        }}
                                    >
                                        {msg.content || (
                                            <span className="inline-flex gap-1">
                                                <span className="animate-bounce">·</span>
                                                <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>·</span>
                                                <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>·</span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Listening indicator */}
                        <AnimatePresence>
                            {isListening && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="px-4 py-2.5 flex items-center justify-center gap-3 overflow-hidden"
                                    style={{ background: 'linear-gradient(90deg, #ef444410, #a855f710)', borderTop: '1px solid #ef444418' }}
                                >
                                    <div className="flex items-end gap-[3px] h-4">
                                        {[3, 5, 2, 6, 3, 4, 2].map((h, i) => (
                                            <div
                                                key={i}
                                                className="w-[3px] rounded-full bg-red-400"
                                                style={{
                                                    animation: `voiceBar 0.5s ease-in-out ${i * 0.07}s infinite alternate`,
                                                    height: `${h * 2.5}px`,
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-[11px] text-red-400 font-medium">🎤 Listening... speak now</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Input */}
                        <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <div className="flex gap-2">
                                {/* Mic Button */}
                                {voiceSupported && (
                                    <button
                                        onClick={toggleVoice}
                                        disabled={streaming}
                                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 flex-shrink-0"
                                        style={{
                                            background: isListening
                                                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                                                : 'rgba(255,255,255,0.06)',
                                            border: isListening ? '1px solid #ef444450' : '1px solid rgba(255,255,255,0.1)',
                                            boxShadow: isListening ? '0 0 20px rgba(239,68,68,0.3)' : 'none',
                                        }}
                                        title={isListening ? 'Stop & send' : 'Speak to Aasha'}
                                    >
                                        {isListening
                                            ? <Square size={12} color="white" fill="white" />
                                            : <Mic size={15} className="text-slate-400" />
                                        }
                                    </button>
                                )}

                                <input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                    placeholder={isListening ? '🎤 Listening...' : 'Type or tap mic to speak...'}
                                    className="flex-1 bg-[#1a1533] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-[#e855a040] transition-colors"
                                    disabled={streaming}
                                    readOnly={isListening}
                                />

                                <button
                                    onClick={handleSend}
                                    disabled={streaming || !input.trim() || isListening}
                                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 flex-shrink-0"
                                    style={{ background: 'linear-gradient(135deg, #e855a0, #a855f7)' }}
                                >
                                    <Send size={14} color="white" />
                                </button>
                            </div>
                            <p className="text-[9px] text-slate-600 text-center mt-2">
                                🔒 Conversations are secure and anonymous
                            </p>
                        </div>

                        <style jsx>{`
                            @keyframes voiceBar {
                                from { transform: scaleY(0.4); }
                                to   { transform: scaleY(1.3); }
                            }
                        `}</style>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
