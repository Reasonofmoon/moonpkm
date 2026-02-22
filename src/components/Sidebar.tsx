'use client'

import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, FileText, Folder, Plus, Search } from 'lucide-react'

interface FileNode {
  id: string
  name: string
  type: 'file' | 'directory'
  path: string
  children?: FileNode[]
}

interface SidebarProps {
  onFileSelect: (path: string) => void
  activeFile: string | null
  onNewFile: (dirPath: string) => void
  onSearch: () => void
}

const PARA_ICONS: Record<string, string> = {
  '00 Brain Kernel': '🧠',
  '00 Inbox': '📥',
  '01 Fleeting': '💭',
  '02 Literature': '📚',
  '03 Permanent': '🌱',
  '04 MOCs': '🗺️',
  '05 Projects': '📦',
  '06 Areas': '🏔️',
  '07 Resources': '📁',
  '08 Archive': '🗃️',
  '99 Templates': '📋',
}

function FileTreeNode({
  node,
  depth = 0,
  onFileSelect,
  activeFile,
  onNewFile,
}: {
  node: FileNode
  depth?: number
  onFileSelect: (path: string) => void
  activeFile: string | null
  onNewFile: (dirPath: string) => void
}) {
  const [expanded, setExpanded] = useState(depth === 0)
  const icon = PARA_ICONS[node.name]

  if (node.type === 'file') {
    const isActive = activeFile === node.path
    return (
      <div
        onClick={() => onFileSelect(node.path)}
        className={`flex items-center gap-1.5 px-2 py-1 cursor-pointer text-sm rounded mx-1 group transition-colors ${
          isActive
            ? 'bg-[#2d4a7a] text-[#7c9ef8]'
            : 'text-[#abb2bf] hover:bg-[#2c313a] hover:text-[#e6e6e6]'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <FileText size={13} className="shrink-0 opacity-60" />
        <span className="truncate">{node.name}</span>
      </div>
    )
  }

  return (
    <div>
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 px-2 py-1 cursor-pointer text-sm text-[#abb2bf] hover:bg-[#2c313a] hover:text-[#e6e6e6] rounded mx-1 group transition-colors"
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {expanded ? (
          <ChevronDown size={13} className="shrink-0 opacity-60" />
        ) : (
          <ChevronRight size={13} className="shrink-0 opacity-60" />
        )}
        {icon ? (
          <span className="text-base leading-none">{icon}</span>
        ) : (
          <Folder size={13} className="shrink-0 opacity-60 text-[#7c9ef8]" />
        )}
        <span className="truncate flex-1">{node.name}</span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onNewFile(node.path)
          }}
          className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-white transition-opacity"
        >
          <Plus size={11} />
        </button>
      </div>
      {expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onFileSelect={onFileSelect}
              activeFile={activeFile}
              onNewFile={onNewFile}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Sidebar({ onFileSelect, activeFile, onNewFile, onSearch }: SidebarProps) {
  const [tree, setTree] = useState<FileNode[]>([])
  const [loading, setLoading] = useState(true)
  const [vaultPath, setVaultPath] = useState('')

  useEffect(() => {
    fetch('/api/vault/files')
      .then(r => r.json())
      .then(data => {
        setTree(data.tree || [])
        setVaultPath(data.vaultPath || '')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col h-full bg-[#21252b] border-r border-[#3a3f4b]">
      {/* 헤더 */}
      <div className="px-4 py-3 border-b border-[#3a3f4b]">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🌙</span>
          <span className="text-[#e6e6e6] font-bold text-sm">MoonPKM</span>
        </div>
        <div className="text-[#5c6370] text-[10px] truncate">{vaultPath}</div>
      </div>

      {/* 검색 버튼 */}
      <button
        onClick={onSearch}
        className="flex items-center gap-2 mx-3 my-2 px-3 py-1.5 bg-[#2c313a] rounded text-[#5c6370] text-sm hover:bg-[#3a3f4b] hover:text-[#abb2bf] transition-colors"
      >
        <Search size={13} />
        <span>검색... (Ctrl+F)</span>
        <kbd className="ml-auto text-[10px] bg-[#21252b] px-1.5 py-0.5 rounded">⌘F</kbd>
      </button>

      {/* 파일 트리 */}
      <div className="flex-1 overflow-y-auto py-1 scrollbar-thin">
        {loading ? (
          <div className="text-[#5c6370] text-xs px-4 py-2">로딩 중...</div>
        ) : tree.length === 0 ? (
          <div className="text-[#5c6370] text-xs px-4 py-2">Vault가 비어 있습니다</div>
        ) : (
          tree.map((node) => (
            <FileTreeNode
              key={node.id}
              node={node}
              onFileSelect={onFileSelect}
              activeFile={activeFile}
              onNewFile={onNewFile}
            />
          ))
        )}
      </div>

      {/* 하단 상태 */}
      <div className="px-4 py-2 border-t border-[#3a3f4b] text-[10px] text-[#5c6370]">
        <div className="flex justify-between">
          <span>PARA Vault</span>
          <span>{tree.length} folders</span>
        </div>
      </div>
    </div>
  )
}
