import { useState, useCallback, useRef, useEffect } from 'react';
import type { NodePoint, Edge, GameConfig } from '../../../types/game';
import { generateNodes, calculateOptimalPath, calculateActualPath } from '../engine/nodeGenerator';
import { calculateScore } from '../engine/scorer';

export function useRouteGame() {
  const [nodes, setNodes] = useState<NodePoint[]>([]);
  const [visibleNodes, setVisibleNodes] = useState<NodePoint[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [status, setStatus] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const allNodesRef = useRef<NodePoint[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const revealRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const configRef = useRef<GameConfig | null>(null);
  const startTimeRef = useRef(0);

  const startGame = useCallback((seed: number, config: GameConfig) => {
    const allNodes = generateNodes(seed, config);
    allNodesRef.current = allNodes;
    configRef.current = config;
    setNodes(allNodes);
    setVisibleNodes([allNodes[0]!]);
    setEdges([]);
    setStatus('playing');
    setTimeLeft(config.timeLimitMs);
    startTimeRef.current = Date.now();

    let idx = 1;
    revealRef.current = setInterval(() => {
      if (idx < allNodes.length) { setVisibleNodes((prev) => [...prev, allNodes[idx]!]); idx++; }
      else { clearInterval(revealRef.current); }
    }, config.nodeIntervalMs);

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, config.timeLimitMs - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) { clearInterval(timerRef.current); clearInterval(revealRef.current); setStatus('ended'); }
    }, 100);
  }, []);

  const connectNode = useCallback((fromId: number, toId: number) => {
    if (status !== 'playing') return;
    const edge: Edge = { from: fromId, to: toId, timestamp: Date.now() };
    setEdges((prev) => {
      const next = [...prev, edge];
      const connectedNodes = new Set<number>();
      next.forEach((e) => { connectedNodes.add(e.from); connectedNodes.add(e.to); });
      const optimal = calculateOptimalPath(allNodesRef.current.filter((n) => connectedNodes.has(n.id)));
      const actual = calculateActualPath(allNodesRef.current, next);
      const efficiency = actual > 0 ? (optimal / actual) * 100 : 100;
      setScore(calculateScore(efficiency, connectedNodes.size));
      return next;
    });
  }, [status]);

  const endGame = useCallback(() => {
    clearInterval(timerRef.current);
    clearInterval(revealRef.current);
    setStatus('ended');
  }, []);

  useEffect(() => { return () => { clearInterval(timerRef.current); clearInterval(revealRef.current); }; }, []);

  return { nodes, visibleNodes, edges, status, score, timeLeft, startGame, connectNode, endGame };
}
