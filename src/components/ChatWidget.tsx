"use client";

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ id: string, role: 'user' | 'assistant', text: string }[]>([
        { id: 'init', role: 'assistant', text: "Hello! I'm your Standards Assistant. I can help answer questions about the safety regulations in this assessment. What can I help you find?" }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', text: userMsg }]);
        setIsLoading(true);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg })
            });

            const data = await res.json();

            if (data.reply) {
                setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', text: data.reply }]);
            } else {
                const errorMsg = data.error || "Sorry, I encountered an error connecting to the AI.";
                setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', text: errorMsg }]);
            }
        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', text: "Network error. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end print:hidden">
            {/* Chat Window */}
            {isOpen && (
                <div className="mb-4 w-[350px] sm:w-[400px] h-[500px] bg-background border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">
                    {/* Header */}
                    <div className="bg-primary text-primary-foreground p-4 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2">
                            <Bot size={20} />
                            <div>
                                <h3 className="font-bold text-sm">Standards Assistant</h3>
                                <p className="text-[10px] opacity-80">Powered by Gemini AI</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="hover:bg-primary/80 p-1 rounded-full transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
                        {messages.map((msg) => (
                            <div key={msg.id} className={cn("flex gap-3", msg.role === 'user' ? "justify-end" : "justify-start")}>
                                {msg.role === 'assistant' && (
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                                        <Bot size={14} className="text-primary" />
                                    </div>
                                )}
                                <div className={cn(
                                    "max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                                    msg.role === 'user'
                                        ? "bg-primary text-primary-foreground rounded-tr-none"
                                        : "bg-card border border-border rounded-tl-none text-card-foreground"
                                )}>
                                    {msg.text}
                                </div>
                                {msg.role === 'user' && (
                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                        <User size={14} className="text-muted-foreground" />
                                    </div>
                                )}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-3 justify-start">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                                    <Bot size={14} className="text-primary" />
                                </div>
                                <div className="bg-card border border-border p-3 rounded-2xl rounded-tl-none text-muted-foreground text-xs flex items-center gap-1">
                                    <span className="animate-bounce">●</span>
                                    <span className="animate-bounce delay-100">●</span>
                                    <span className="animate-bounce delay-200">●</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSubmit} className="p-4 bg-background border-t shrink-0">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask about safety standards..."
                                className="flex-1 px-4 py-2 text-sm rounded-full border border-input bg-muted/20 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* FAB */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
                >
                    <MessageSquare size={26} />
                </button>
            )}
        </div>
    );
}
