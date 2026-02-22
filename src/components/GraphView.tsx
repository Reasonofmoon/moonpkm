'use client'

import { useCallback, useEffect, useState } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from 'reactflow'
import 'reactflow/dist/style.css'

const DIKM_COLORS: Record<string, string> = {
  data: '#ef4444',
  information: '#f97316',
  knowledge: '#a855f7',
  meaning: '#22c55e',
}

const TYPE_COLORS: Record<string, string> = {
  brain: '#3b82f6',
  evergreen: '#22c55e',
  moc: '#f59e0b',
  capture: '#6b7280',
  note: '#4b5563',
}

interface GraphViewProps {
  onNodeClick?: (path: string) => void
}

export default function GraphView({ onNodeClick }: GraphViewProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ nodes: 0, edges: 0 })

  useEffect(() => {
    fetch('/api/vault/graph')
      .then(r => r.json())
      .then(data => {
        // 연결이 있는 노드만 필터링 (처음엔 연결된 것만 표시)
        const connectedIds = new Set(
          data.edges.flatMap((e: { source: string; target: string }) => [e.source, e.target])
        )
        const filteredNodes = data.nodes.filter((n: { id: string }) => connectedIds.has(n.id))
        
        // 원형 배치
        const radius = Math.max(200, filteredNodes.length * 15)
        const rfNodes: Node[] = filteredNodes.map(
          (n: { id: string; label: string; type: string; dikm: string; path: string }, i: number) => {
            const angle = (2 * Math.PI * i) / filteredNodes.length
            const color = DIKM_COLORS[n.dikm] || '#4b5563'
            return {
              id: n.id,
              position: {
                x: Math.cos(angle) * radius + radius + 100,
                y: Math.sin(angle) * radius + radius + 100,
              },
              data: {
                label: n.label.length > 20 ? n.label.slice(0, 20) + '…' : n.label,
                path: n.path,
              },
              style: {
                background: color,
                border: `2px solid ${color}`,
                borderRadius: '8px',
                color: '#fff',
                fontSize: '11px',
                padding: '4px 8px',
                cursor: 'pointer',
              },
            }
          }
        )

        const rfEdges: Edge[] = data.edges.map(
          (e: { id: string; source: string; target: string }) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            style: { stroke: '#3a3f4b', strokeWidth: 1.5 },
            animated: false,
          })
        )

        setNodes(rfNodes)
        setEdges(rfEdges)
        setStats({ nodes: filteredNodes.length, edges: data.edges.length })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [setNodes, setEdges])

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.data.path && onNodeClick) {
        onNodeClick(node.data.path)
      }
    },
    [onNodeClick]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#282c34] text-[#5c6370]">
        <div className="text-center">
          <div className="text-2xl mb-2">🕸️</div>
          <div className="text-sm">그래프 빌드 중...</div>
          <div className="text-xs mt-1 text-[#3a3f4b]">MyZettelkasten 파싱 중</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-[#282c34] relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        fitView
        minZoom={0.1}
        maxZoom={3}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="#3a3f4b"
          gap={20}
          size={1}
        />
        <Controls
          style={{ background: '#21252b', border: '1px solid #3a3f4b', borderRadius: '8px' }}
        />
        <MiniMap
          style={{ background: '#21252b', border: '1px solid #3a3f4b' }}
          nodeColor={(n) => (n.style?.background as string) || '#4b5563'}
        />
      </ReactFlow>

      {/* 범례 */}
      <div className="absolute bottom-16 left-4 bg-[#21252b] border border-[#3a3f4b] rounded-lg p-3 text-xs">
        <div className="text-[#5c6370] mb-2 font-semibold">DIKM 레벨</div>
        {Object.entries(DIKM_COLORS).map(([key, color]) => (
          <div key={key} className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full" style={{ background: color }} />
            <span className="text-[#abb2bf] capitalize">{key}</span>
          </div>
        ))}
        <div className="border-t border-[#3a3f4b] mt-2 pt-2 text-[#5c6370]">
          <span>{stats.nodes} nodes · {stats.edges} edges</span>
        </div>
      </div>
    </div>
  )
}
