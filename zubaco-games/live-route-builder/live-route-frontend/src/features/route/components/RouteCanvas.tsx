import { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { NodePoint, Edge } from '../../../types/game';

interface Props { visibleNodes: NodePoint[]; edges: Edge[]; onConnect: (from: number, to: number) => void; disabled: boolean; }

export function RouteCanvas({ visibleNodes, edges, onConnect, disabled }: Props) {
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const handleNodeClick = useCallback((nodeId: number) => {
    if (disabled) return;
    if (selectedNode === null) { setSelectedNode(nodeId); }
    else if (selectedNode !== nodeId) { onConnect(selectedNode, nodeId); setSelectedNode(null); }
    else { setSelectedNode(null); }
  }, [selectedNode, onConnect, disabled]);

  return (
    <svg ref={svgRef} className="w-full h-full bg-gray-800 rounded-xl border border-gray-700" viewBox="0 0 600 500" preserveAspectRatio="xMidYMid meet">
      {edges.map((e, i) => {
        const from = visibleNodes.find((n) => n.id === e.from);
        const to = visibleNodes.find((n) => n.id === e.to);
        if (!from || !to) return null;
        return <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" />;
      })}
      {visibleNodes.map((node) => (
        <motion.g key={node.id} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }} style={{ cursor: disabled ? 'default' : 'pointer' }} onClick={() => handleNodeClick(node.id)}>
          <circle cx={node.x} cy={node.y} r={selectedNode === node.id ? 14 : 10} fill={selectedNode === node.id ? '#f59e0b' : '#3b82f6'} stroke="#fff" strokeWidth="2" />
          <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize="10" fill="#fff" fontWeight="bold">{node.id + 1}</text>
        </motion.g>
      ))}
    </svg>
  );
}
