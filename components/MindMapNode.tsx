import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { LayoutNode } from '../types';
import { motion } from 'framer-motion';

interface MindMapNodeProps {
  node: LayoutNode;
  isFocused: boolean;
  onUpdate: (id: string, text: string) => void;
  onAddSibling: (id: string) => void;
  onAddChild: (id: string) => void;
  onNavigate: (id: string, direction: 'up' | 'down' | 'left' | 'right') => void;
  onDelete: (id: string) => void;
  onFocus: (id: string) => void;
  onResize: (id: string, width: number, height: number) => void;
}

export const MindMapNode: React.FC<MindMapNodeProps> = ({
  node,
  isFocused,
  onUpdate,
  onAddSibling,
  onAddChild,
  onNavigate,
  onDelete,
  onFocus,
  onResize
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState(node.data.text);

  // Sync local state
  useEffect(() => {
    setText(node.data.text);
  }, [node.data.text]);

  // Auto-focus
  useEffect(() => {
    if (isFocused && textareaRef.current) {
      textareaRef.current.focus();
      // Cursor to end
      const val = textareaRef.current.value;
      textareaRef.current.setSelectionRange(val.length, val.length);
    }
  }, [isFocused]);

  // Auto-resize height for textarea
  useLayoutEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  // Report size changes to parent for layout calculation
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        // Add a small buffer to height/width if needed, or raw
        // Using borderBoxSize if available is more accurate for borders
        let w = width;
        let h = height;
        if (entry.borderBoxSize && entry.borderBoxSize.length > 0) {
            w = entry.borderBoxSize[0].inlineSize;
            h = entry.borderBoxSize[0].blockSize;
        }
        
        // Avoid infinite loops by only updating if significantly different
        // Check if current node dimensions match
        if (Math.abs(node.width - w) > 2 || Math.abs(node.height - h) > 2) {
             onResize(node.id, w, h);
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [node.id, onResize, node.width, node.height]); // Depend on existing dims to check diff

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) return; 
      e.preventDefault();
      onAddSibling(node.id);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      onAddChild(node.id);
    } else if (e.key === 'Backspace' && text === '') {
      e.preventDefault();
      onDelete(node.id);
    } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const dir = e.key.replace('Arrow', '').toLowerCase() as 'up' | 'down' | 'left' | 'right';
        onNavigate(node.id, dir);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    onUpdate(node.id, e.target.value);
  };

  return (
    <motion.div
      initial={false}
      animate={{ x: node.x, y: node.y }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className="absolute top-0 left-0"
    >
      <div
        ref={containerRef}
        className={`
          relative flex items-center transition-colors duration-200
          rounded-xl border-2 shadow-lg
          min-w-[180px] max-w-[400px]
          ${isFocused 
            ? 'border-blue-500 shadow-blue-500/30 bg-slate-800' 
            : 'border-slate-700 bg-slate-900 hover:border-slate-600'
          }
        `}
        style={{ width: 'max-content' }} // Allow expansion based on content up to max-w
        onClick={() => onFocus(node.id)}
      >
        {/* Branch color indicator */}
        <div className={`w-1.5 self-stretch rounded-l-lg flex-shrink-0 ${
          node.depth === 0 ? 'bg-purple-500' : 
          node.depth === 1 ? 'bg-blue-500' : 
          node.depth === 2 ? 'bg-emerald-500' : 
          node.depth === 3 ? 'bg-amber-500' : 'bg-slate-500'
        }`} />

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type..."
          rows={1}
          className="w-full bg-transparent text-slate-200 p-3 pl-4 outline-none resize-none overflow-hidden font-medium text-sm leading-relaxed min-w-[150px]"
          spellCheck={false}
        />
      </div>
    </motion.div>
  );
};
