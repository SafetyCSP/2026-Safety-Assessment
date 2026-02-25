"use client";

import React, { useRef } from 'react';
import { Bold, Italic, Underline, List } from 'lucide-react';

interface FormattedTextareaProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    minHeight?: string;
}

export function FormattedTextarea({ value, onChange, placeholder, minHeight = '80px' }: FormattedTextareaProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const wrapSelection = (prefix: string, suffix: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = value.substring(start, end);
        const before = value.substring(0, start);
        const after = value.substring(end);

        if (selected) {
            // Wrap selected text
            const newValue = before + prefix + selected + suffix + after;
            onChange(newValue);
            // Restore cursor after the wrapped text
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + prefix.length, end + prefix.length);
            }, 0);
        } else {
            // Insert markers and place cursor between them
            const newValue = before + prefix + suffix + after;
            onChange(newValue);
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + prefix.length, start + prefix.length);
            }, 0);
        }
    };

    const insertBullet = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const before = value.substring(0, start);
        const after = value.substring(start);

        // If we're not at the start of a line, add a newline first
        const needsNewline = before.length > 0 && !before.endsWith('\n');
        const bullet = (needsNewline ? '\n' : '') + '• ';
        const newValue = before + bullet + after;
        onChange(newValue);

        setTimeout(() => {
            textarea.focus();
            const newPos = start + bullet.length;
            textarea.setSelectionRange(newPos, newPos);
        }, 0);
    };

    return (
        <div className="border border-input rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ring-offset-background dark:border-[#444]">
            {/* Toolbar */}
            <div className="flex items-center gap-0.5 px-2 py-1 bg-muted/40 border-b border-input dark:border-[#444]">
                <button
                    type="button"
                    onClick={() => wrapSelection('**', '**')}
                    className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    title="Bold (**text**)"
                >
                    <Bold size={14} />
                </button>
                <button
                    type="button"
                    onClick={() => wrapSelection('*', '*')}
                    className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    title="Italic (*text*)"
                >
                    <Italic size={14} />
                </button>
                <button
                    type="button"
                    onClick={() => wrapSelection('__', '__')}
                    className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    title="Underline (__text__)"
                >
                    <Underline size={14} />
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <button
                    type="button"
                    onClick={insertBullet}
                    className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    title="Bullet point"
                >
                    <List size={14} />
                </button>
            </div>
            {/* Textarea */}
            <textarea
                ref={textareaRef}
                className={`w-full p-3 bg-background placeholder:text-muted-foreground focus:outline-none text-sm resize-y dark:bg-[#222]`}
                style={{ minHeight }}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
}
