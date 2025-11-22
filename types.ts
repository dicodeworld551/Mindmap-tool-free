export interface NodeData {
  id: string;
  parentId: string | null;
  text: string;
  children?: NodeData[];
}

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  data: NodeData;
  width: number;
  height: number;
  depth: number;
}

export interface MindMapState {
  nodes: Record<string, NodeData>;
  rootId: string;
  focusedNodeId: string | null;
}
