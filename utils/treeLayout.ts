import { NodeData, LayoutNode } from '../types';

// Config
const H_GAP = 100; // Horizontal gap between parent and child
const V_GAP = 20;  // Vertical gap between siblings

interface TreeContext {
  dimensions: Record<string, { width: number; height: number }>;
  nodes: Record<string, NodeData>;
}

interface CalculatedNode extends LayoutNode {
  children?: CalculatedNode[];
  subtreeHeight: number;
  childrenHeight: number;
}

// Recursive function to build hierarchy and measure subtree heights
const measureNode = (id: string, depth: number, ctx: TreeContext): CalculatedNode => {
  const nodeData = ctx.nodes[id];
  const dim = ctx.dimensions[id] || { width: 200, height: 50 }; // Default fallback

  // Find children
  const childrenIds = Object.values(ctx.nodes)
    .filter((n) => n.parentId === id)
    .map((n) => n.id);

  const calculatedNode: CalculatedNode = {
    id,
    x: 0,
    y: 0,
    data: nodeData,
    width: dim.width,
    height: dim.height,
    depth,
    subtreeHeight: 0,
    childrenHeight: 0
  };

  if (childrenIds.length === 0) {
    calculatedNode.subtreeHeight = calculatedNode.height;
    calculatedNode.childrenHeight = 0;
    calculatedNode.children = [];
  } else {
    const children = childrenIds.map(childId => measureNode(childId, depth + 1, ctx));
    calculatedNode.children = children;
    
    const totalChildrenHeight = children.reduce((sum, child) => sum + child.subtreeHeight, 0);
    const totalGap = Math.max(0, children.length - 1) * V_GAP;
    
    calculatedNode.childrenHeight = totalChildrenHeight + totalGap;
    
    // The subtree height is the maximum of the node itself or its children stack
    // Usually children stack is taller, but if node is huge, it might dominate
    calculatedNode.subtreeHeight = Math.max(calculatedNode.height, calculatedNode.childrenHeight);
  }

  return calculatedNode;
};

// Recursive function to assign coordinates
const layoutNode = (node: CalculatedNode, x: number, y: number, flattenList: LayoutNode[], links: any[]) => {
  // "y" passed here is the Top of the vertical space allocated for this node's subtree
  // The node itself should be centered vertically within this space
  
  const centerY = y + node.subtreeHeight / 2;
  const nodeTop = centerY - node.height / 2;
  
  node.x = x;
  node.y = nodeTop;
  
  flattenList.push({
    id: node.id,
    x: node.x,
    y: node.y,
    data: node.data,
    width: node.width,
    height: node.height,
    depth: node.depth
  });

  if (node.children && node.children.length > 0) {
    // Position children to the right
    const childX = x + node.width + H_GAP;
    
    // Start children vertically centered relative to the parent's center
    // The entire children stack has height `node.childrenHeight`
    // So the top of the children stack is `centerY - node.childrenHeight / 2`
    let currentChildY = centerY - node.childrenHeight / 2;

    node.children.forEach((child) => {
      layoutNode(child, childX, currentChildY, flattenList, links);
      
      // Create Link
      // Source: Right Center of parent
      // Target: Left Center of child
      links.push({
        source: { x: node.x + node.width, y: node.y + node.height / 2 },
        target: { x: childX, y: currentChildY + child.subtreeHeight / 2 } // Calculate center based on allocated slot
        // Note: child.y inside layoutNode will be calculated specifically, 
        // but for link target, we want the visual center of the child node.
        // Wait, layoutNode sets child.y to the actual top of the rect.
        // So target should be calculated after child layout or derived.
        // Actually, let's fix the link target calculation:
        // Child Y (top) = (currentChildY + child.subtreeHeight/2) - child.height/2
        // Child Center Y = currentChildY + child.subtreeHeight/2
      });

      currentChildY += child.subtreeHeight + V_GAP;
    });
  }
};

export const calculateTreeLayout = (
  nodes: Record<string, NodeData>,
  rootId: string,
  dimensions: Record<string, { width: number; height: number }>
): { nodes: LayoutNode[]; links: any[]; width: number; height: number } => {
  
  // 1. Build and Measure Tree
  const rootNode = measureNode(rootId, 0, { nodes, dimensions });

  // 2. Layout Tree
  const layoutNodes: LayoutNode[] = [];
  const links: any[] = [];
  
  // Start at 0,0
  layoutNode(rootNode, 0, 0, layoutNodes, links);

  // 3. Calculate Bounds
  let maxX = 0;
  let maxY = 0;
  layoutNodes.forEach(n => {
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
  });

  return { nodes: layoutNodes, links, width: maxX, height: maxY };
};
