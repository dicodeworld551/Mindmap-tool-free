import React from 'react';

interface LinkProps {
  source: { x: number; y: number };
  target: { x: number; y: number };
}

export const MindMapLink: React.FC<LinkProps> = ({ source, target }) => {
  // Source and Target are already the exact connection points calculated by the layout engine
  // Source: Right Center of Parent
  // Target: Left Center of Child (calculated as center of the child's slot)
  
  // We need to ensure the path looks good
  
  const sourceX = source.x;
  const sourceY = source.y;
  const targetX = target.x;
  const targetY = target.y;

  const deltaX = targetX - sourceX;
  
  // Curvature factor
  const c1x = sourceX + deltaX * 0.4;
  const c1y = sourceY;
  const c2x = targetX - deltaX * 0.4;
  const c2y = targetY;

  const pathData = `M ${sourceX} ${sourceY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${targetX} ${targetY}`;

  return (
    <path
      d={pathData}
      fill="none"
      stroke="#475569"
      strokeWidth="2"
      strokeLinecap="round"
      className="transition-all duration-300"
    />
  );
};
