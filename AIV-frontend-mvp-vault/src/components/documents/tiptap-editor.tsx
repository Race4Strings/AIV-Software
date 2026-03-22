"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Bold, Italic, Underline as UnderlineIcon,
    List, ListOrdered, Quote, Heading1, Heading2,
    Undo, Redo, CheckCircle2, AlertCircle, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';

interface TipTapEditorProps {
    initialContent: string;
    onSave: (content: string) => Promise<void>;
    editable?: boolean;
}

import { Editor } from '@tiptap/core';

const MenuBar = ({ editor }: { editor: Editor | null }) => {
    if (!editor) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-muted/30 px-3 py-2">
            <div className="flex items-center gap-1 rounded-md border border-border/50 bg-background/50 p-1">
                <Button
                    variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBold().run()}
                    disabled={!editor.can().chain().focus().toggleBold().run()}
                    className={cn("h-7 w-7 p-0", editor.isActive('bold') && "bg-muted text-foreground")}
                >
                    <Bold className="h-3.5 w-3.5" />
                </Button>
                <Button
                    variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleItalic().run()}
                    disabled={!editor.can().chain().focus().toggleItalic().run()}
                    className={cn("h-7 w-7 p-0", editor.isActive('italic') && "bg-muted text-foreground")}
                >
                    <Italic className="h-3.5 w-3.5" />
                </Button>
                <Button
                    variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleUnderline().run()}
                    disabled={!editor.can().chain().focus().toggleUnderline().run()}
                    className={cn("h-7 w-7 p-0", editor.isActive('underline') && "bg-muted text-foreground")}
                >
                    <UnderlineIcon className="h-3.5 w-3.5" />
                </Button>
            </div>

            <div className="flex items-center gap-1 rounded-md border border-border/50 bg-background/50 p-1">
                <Button
                    variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={cn("h-7 w-7 p-0", editor.isActive('heading', { level: 1 }) && "bg-muted text-foreground")}
                >
                    <Heading1 className="h-3.5 w-3.5" />
                </Button>
                <Button
                    variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={cn("h-7 w-7 p-0", editor.isActive('heading', { level: 2 }) && "bg-muted text-foreground")}
                >
                    <Heading2 className="h-3.5 w-3.5" />
                </Button>
            </div>

            <div className="flex items-center gap-1 rounded-md border border-border/50 bg-background/50 p-1">
                <Button
                    variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={cn("h-7 w-7 p-0", editor.isActive('bulletList') && "bg-muted text-foreground")}
                >
                    <List className="h-3.5 w-3.5" />
                </Button>
                <Button
                    variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={cn("h-7 w-7 p-0", editor.isActive('orderedList') && "bg-muted text-foreground")}
                >
                    <ListOrdered className="h-3.5 w-3.5" />
                </Button>
                <Button
                    variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className={cn("h-7 w-7 p-0", editor.isActive('blockquote') && "bg-muted text-foreground")}
                >
                    <Quote className="h-3.5 w-3.5" />
                </Button>
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-1 rounded-md border border-border/50 bg-background/50 p-1">
                <Button
                    variant="ghost" size="sm" onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().chain().focus().undo().run()}
                    className="h-7 w-7 p-0 opacity-70 hover:opacity-100"
                >
                    <Undo className="h-3.5 w-3.5" />
                </Button>
                <Button
                    variant="ghost" size="sm" onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().chain().focus().redo().run()}
                    className="h-7 w-7 p-0 opacity-70 hover:opacity-100"
                >
                    <Redo className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
};

export function TipTapEditor({ initialContent, onSave, editable = true }: TipTapEditorProps) {
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [content, setContent] = useState(initialContent);
    const debouncedContent = useDebounce(content, 1500);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Placeholder.configure({
                placeholder: 'Start writing...',
            }),
        ],
        content: initialContent,
        editable,
        onUpdate: ({ editor }) => {
            setContent(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm dark:prose-invert sm:prose-base focus:outline-none max-w-none min-h-[500px] p-6',
            },
        },
    });

    // Handle auto-save
    useEffect(() => {
        if (debouncedContent && debouncedContent !== initialContent) {
            const saveContent = async () => {
                setSaveStatus('saving');
                try {
                    await onSave(debouncedContent);
                    setSaveStatus('saved');
                    setTimeout(() => setSaveStatus('idle'), 2000);
                } catch {
                    setSaveStatus('error');
                    setTimeout(() => setSaveStatus('idle'), 3000);
                }
            };
            saveContent();
        }
    }, [debouncedContent, onSave, initialContent]);

    // Handle template loading state updates
    useEffect(() => {
        if (editor && initialContent !== undefined && initialContent !== editor.getHTML()) {
            if (editor.isEmpty || !content) {
                editor.commands.setContent(initialContent);
                setContent(initialContent);
            }
        }
    }, [initialContent, editor, content]);

    return (
        <div className="flex h-full flex-col overflow-hidden rounded-md border border-border bg-background">
            <MenuBar editor={editor} />

            <div className="flex-1 overflow-y-auto">
                <EditorContent editor={editor} className="h-full" />
            </div>

            <div className="flex items-center justify-end border-t border-border/50 bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                    {saveStatus === 'saving' && (
                        <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Saving...</span>
                        </>
                    )}
                    {saveStatus === 'saved' && (
                        <>
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            <span className="text-green-500">Saved</span>
                        </>
                    )}
                    {saveStatus === 'error' && (
                        <>
                            <AlertCircle className="h-3 w-3 text-destructive" />
                            <span className="text-destructive">Error saving</span>
                        </>
                    )}
                    {saveStatus === 'idle' && (
                        <span>Auto-saving enabled</span>
                    )}
                </div>
            </div>
        </div>
    );
}
