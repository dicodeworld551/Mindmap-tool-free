import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { NodeData, MindMapState } from './types';
import { calculateTreeLayout } from './utils/treeLayout';
import { MindMapNode } from './components/MindMapNode';
import { MindMapLink } from './components/MindMapLink';
import { Keyboard, GitBranch, MousePointer2 } from 'lucide-react';

const generateId = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);

const INITIAL_STATE: MindMapState = {
  rootId: 'root',
  nodes: {
    'root': {
      id: 'root',
      parentId: null,
      text: 'Central Topic',
    },
  },
  focusedNodeId: 'root',
};

const App: React.FC = () => {
  const [nodes, setNodes] = useState<Record<string, NodeData>>(INITIAL_STATE.nodes);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(INITIAL_STATE.focusedNodeId);
  const [nodeDimensions, setNodeDimensions] = useState<Record<string, {width: number, height: number}>>({});
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Actions ---

  const updateNodeText = (id: string, text: string) => {
    setNodes((prev) => ({
      ...prev,
      [id]: { ...prev[id], text },
    }));
  };

  const handleNodeResize = useCallback((id: string, width: number, height: number) => {
      setNodeDimensions(prev => {
          // Only update if different to avoid render loops
          if (prev[id] && prev[id].width === width && prev[id].height === height) return prev;
          return { ...prev, [id]: { width, height } };
      });
  }, []);

  const addSibling = (referenceId: string) => {
    const refNode = nodes[referenceId];
    if (!refNode.parentId) {
        addChild(referenceId);
        return;
    }

    const newId = generateId();
    const newNode: NodeData = {
      id: newId,
      parentId: refNode.parentId,
      text: '',
    };

    setNodes((prev) => ({ ...prev, [newId]: newNode }));
    setFocusedNodeId(newId);
  };

  const addChild = (parentId: string) => {
    const newId = generateId();
    const newNode: NodeData = {
      id: newId,
      parentId,
      text: '',
    };

    setNodes((prev) => ({ ...prev, [newId]: newNode }));
    setFocusedNodeId(newId);
  };

  const deleteNode = (id: string) => {
    if (id === INITIAL_STATE.rootId) return;

    const nodeToDelete = nodes[id];
    const parentId = nodeToDelete.parentId;

    const getDescendants = (rootId: string, allNodes: Record<string, NodeData>): string[] => {
        const children = (Object.values(allNodes) as NodeData[]).filter(n => n.parentId === rootId);
        return [...children.map(c => c.id), ...children.flatMap(c => getDescendants(c.id, allNodes))];
    };

    const idsToDelete = [id, ...getDescendants(id, nodes)];
    
    const newNodes = { ...nodes };
    idsToDelete.forEach(dId => delete newNodes[dId]);
    
    // Also cleanup dimensions
    const newDims = { ...nodeDimensions };
    idsToDelete.forEach(dId => delete newDims[dId]);

    setNodes(newNodes);
    setNodeDimensions(newDims);
    
    if (parentId && newNodes[parentId]) {
        setFocusedNodeId(parentId);
    }
  };

  const navigate = (currentId: string, direction: 'up' | 'down' | 'left' | 'right') => {
      const current = nodes[currentId];
      if (!current) return;

      if (direction === 'left') {
          if (current.parentId) setFocusedNodeId(current.parentId);
      } else if (direction === 'right') {
          const children = (Object.values(nodes) as NodeData[]).filter(n => n.parentId === currentId);
          if (children.length > 0) setFocusedNodeId(children[0].id); 
      } else if (direction === 'up' || direction === 'down') {
          const siblings = (Object.values(nodes) as NodeData[])
            .filter(n => n.parentId === current.parentId)
            .sort((a, b) => a.id.localeCompare(b.id)); // Using ID for stability

          const idx = siblings.findIndex(n => n.id === currentId);
          if (idx !== -1) {
              const nextIdx = direction === 'down' ? idx + 1 : idx - 1;
              if (siblings[nextIdx]) setFocusedNodeId(siblings[nextIdx].id);
          }
      }
  };

  // --- Layout Calculation ---
  
  const { nodes: layoutNodes, links, width, height } = useMemo(() => {
    return calculateTreeLayout(nodes, INITIAL_STATE.rootId, nodeDimensions);
  }, [nodes, nodeDimensions]);

  // Center Viewport on Mount
  useEffect(() => {
     const container = containerRef.current;
     if (container) {
         setViewport({
             x: container.clientWidth / 2 - 100, 
             y: container.clientHeight / 2,
             scale: 1
         });
     }
  }, []);

  // Pan Handling
  const handleMouseDown = (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
          e.preventDefault();
          const startX = e.clientX;
          const startY = e.clientY;
          const initialX = viewport.x;
          const initialY = viewport.y;

          const onMouseMove = (moveEvent: MouseEvent) => {
              setViewport(prev => ({
                  ...prev,
                  x: initialX + (moveEvent.clientX - startX),
                  y: initialY + (moveEvent.clientY - startY)
              }));
          };

          const onMouseUp = () => {
              window.removeEventListener('mousemove', onMouseMove);
              window.removeEventListener('mouseup', onMouseUp);
          };

          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);
      }
  };

  return (
    <div 
        className="w-screen h-screen bg-slate-950 overflow-hidden relative selection:bg-blue-500/30"
        onMouseDown={handleMouseDown}
        ref={containerRef}
    >
      {/* Background Grid */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
            backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            transform: `translate(${viewport.x % 24}px, ${viewport.y % 24}px)`
        }}
      />

      {/* UI Controls / Help */}
      <div className="absolute top-6 left-6 z-50 flex flex-col gap-4 pointer-events-none">
         <div className="bg-slate-900/80 backdrop-blur border border-slate-700 p-4 rounded-xl shadow-2xl max-w-sm pointer-events-auto">
             <div className="flex items-center gap-2 mb-3 text-blue-400">
                 <GitBranch size={20} />
                 <h1 className="font-bold text-lg text-slate-100">FlowMind</h1>
             </div>
             <p className="text-slate-400 text-sm mb-4">
                 Keyboard-first. Nodes auto-resize to fit your ideas.
             </p>
             <div className="space-y-2 text-xs font-mono text-slate-300">
                 <div className="flex justify-between items-center bg-slate-800 p-2 rounded">
                     <span>New Sibling</span>
                     <kbd className="bg-slate-700 px-2 py-1 rounded border border-slate-600 shadow">Enter</kbd>
                 </div>
                 <div className="flex justify-between items-center bg-slate-800 p-2 rounded">
                     <span>New Child</span>
                     <kbd className="bg-slate-700 px-2 py-1 rounded border border-slate-600 shadow">Tab</kbd>
                 </div>
                 <div className="flex justify-between items-center bg-slate-800 p-2 rounded">
                     <span>Navigate</span>
                     <div className="flex gap-1">
                        <span className="text-slate-500">Ctrl +</span>
                        <kbd className="bg-slate-700 px-1 py-1 rounded border border-slate-600 shadow"><Keyboard size={12}/></kbd>
                     </div>
                 </div>
                 <div className="flex justify-between items-center bg-slate-800 p-2 rounded">
                     <span>Pan Canvas</span>
                     <div className="flex gap-1 items-center">
                        <span className="text-slate-500">Alt +</span>
                        <MousePointer2 size={12} />
                     </div>
                 </div>
             </div>
         </div>
      </div>

      {/* Canvas Area */}
      <div 
        className="absolute top-0 left-0 w-full h-full origin-top-left will-change-transform transition-transform duration-200 ease-out"
        style={{
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`
        }}
      >
          {/* Links Layer (SVG) */}
          <svg className="absolute top-[-5000px] left-[-5000px] w-[10000px] h-[10000px] pointer-events-none overflow-visible">
              <g transform="translate(5000, 5000)">
                {links.map((link, i) => (
                    <MindMapLink 
                        key={`link-${i}`} 
                        source={link.source} 
                        target={link.target} 
                    />
                ))}
              </g>
          </svg>

          {/* Nodes Layer */}
          {layoutNodes.map((node) => (
              <MindMapNode
                key={node.id}
                node={node}
                isFocused={focusedNodeId === node.id}
                onUpdate={updateNodeText}
                onAddSibling={addSibling}
                onAddChild={addChild}
                onNavigate={navigate}
                onDelete={deleteNode}
                onFocus={setFocusedNodeId}
                onResize={handleNodeResize}
              />
          ))}
      </div>

      <div className="absolute bottom-6 right-6 text-slate-500 text-xs font-mono">
          {Object.keys(nodes).length} nodes active
      </div>
    </div>
  );
};

export default App;