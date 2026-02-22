'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import Sidebar from '@/components/Sidebar'
import { Search, X, GitGraph, FileCode, RefreshCw, GraduationCap } from 'lucide-react'

const VimEditor = dynamic(() => import('@/components/VimEditor'), { ssr: false })
const GraphView = dynamic(() => import('@/components/GraphView'), { ssr: false })
const VimTutor = dynamic(() => import('@/components/VimTutor'), { ssr: false })

type Tab = 'editor' | 'graph'

export default function Home() {
  const [activeFile, setActiveFile] = useState<string | null>(null)
  const [content, setContent] = useState<string>('')
  const [savedContent, setSavedContent] = useState<string>('')
  const [activeTab, setActiveTab] = useState<Tab>('editor')
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showVimTutor, setShowVimTutor] = useState(false)

  // 검색 모달
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // 백링크
  const [backlinks, setBacklinks] = useState<string[]>([])

  // 파일 목록 (wikilink 자동완성용)
  const [allFiles, setAllFiles] = useState<string[]>([])

  interface SearchResult {
    path: string
    title: string
    type: string
    dikm: string
    score: number
  }

  // 파일 트리 로드
  useEffect(() => {
    fetch('/api/vault/files')
      .then(r => r.json())
      .then(data => {
        const files: string[] = []
        function walk(nodes: typeof data.tree) {
          for (const node of nodes) {
            if (node.type === 'file') files.push(node.name)
            if (node.children) walk(node.children)
          }
        }
        walk(data.tree || [])
        setAllFiles(files)
      })
  }, [])

  // 파일 열기
  const openFile = useCallback(async (filePath: string) => {
    try {
      const res = await fetch(`/api/vault/files?path=${encodeURIComponent(filePath)}`)
      const data = await res.json()
      setActiveFile(filePath)
      setContent(data.content || '')
      setSavedContent(data.content || '')
      setIsDirty(false)
      setActiveTab('editor')
    } catch (err) {
      console.error('Failed to open file:', err)
    }
  }, [])

  // 파일 저장
  const saveFile = useCallback(async (newContent: string) => {
    if (!activeFile) return
    setSaving(true)
    try {
      await fetch('/api/vault/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: activeFile, content: newContent }),
      })
      setSavedContent(newContent)
      setIsDirty(false)
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setSaving(false)
    }
  }, [activeFile])

  // 새 파일 생성
  const createNewFile = useCallback(async (dirPath: string) => {
    const fileName = prompt('노트 이름 (확장자 없이):')
    if (!fileName) return

    const template = prompt('템플릿 (brain/evergreen/moc/default):') || 'default'
    const filePath = dirPath ? `${dirPath}/${fileName}.md` : `00 Inbox/${fileName}.md`

    const res = await fetch('/api/vault/files', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath, template }),
    })
    const data = await res.json()
    if (data.success) {
      setActiveFile(filePath)
      setContent(data.content)
      setSavedContent(data.content)
      setActiveTab('editor')
    }
  }, [])

  // content 변경 추적
  const handleChange = useCallback((newContent: string) => {
    setContent(newContent)
    setIsDirty(newContent !== savedContent)
  }, [savedContent])

  // Ctrl+S 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (content) saveFile(content)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setShowSearch(true)
      }
      if (e.key === 'Escape') {
        setShowSearch(false)
        setSearchQuery('')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [content, saveFile])

  // 검색 실행
  useEffect(() => {
    if (!showSearch) return
    setTimeout(() => searchInputRef.current?.focus(), 50)
  }, [showSearch])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    setSearchLoading(true)
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/vault/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      setSearchResults(data.results || [])
      setSearchLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const DIKM_COLORS: Record<string, string> = {
    data: 'text-red-400',
    information: 'text-orange-400',
    knowledge: 'text-purple-400',
    meaning: 'text-green-400',
  }

  return (
    <div className="flex h-screen bg-[#282c34] text-[#abb2bf] overflow-hidden">
      {/* 사이드바 */}
      <div className="w-64 shrink-0 flex flex-col">
        <Sidebar
          onFileSelect={openFile}
          activeFile={activeFile}
          onNewFile={createNewFile}
          onSearch={() => setShowSearch(true)}
        />
      </div>

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 탭 바 */}
        <div className="flex items-center bg-[#21252b] border-b border-[#3a3f4b] px-2 py-1 gap-1">
          {/* 열린 파일 탭 */}
          {activeFile && (
            <div className="flex items-center gap-1 px-3 py-1 bg-[#282c34] rounded text-sm text-[#e6e6e6] border border-[#3a3f4b]">
              <FileCode size={12} className="text-[#7c9ef8]" />
              <span className="max-w-[200px] truncate">
                {activeFile.split('/').pop()?.replace('.md', '')}
              </span>
              {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 ml-1" />}
            </div>
          )}

          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors ${
                activeTab === 'editor'
                  ? 'bg-[#2d4a7a] text-[#7c9ef8]'
                  : 'text-[#5c6370] hover:text-[#abb2bf]'
              }`}
            >
              <FileCode size={13} />
              편집기
            </button>
            <button
              onClick={() => setActiveTab('graph')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors ${
                activeTab === 'graph'
                  ? 'bg-[#2d4a7a] text-[#7c9ef8]'
                  : 'text-[#5c6370] hover:text-[#abb2bf]'
              }`}
            >
              <GitGraph size={13} />
              그래프
            </button>

            <button
              onClick={() => setShowVimTutor(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors text-[#5c6370] hover:text-[#abb2bf]"
              title="Vim 학습 (데일리 미션)"
            >
              <GraduationCap size={13} />
            </button>
            {saving && (
              <div className="flex items-center gap-1 text-[10px] text-[#5c6370]">
                <RefreshCw size={10} className="animate-spin" />
                저장 중
              </div>
            )}
          </div>
        </div>

        {/* 콘텐츠 영역 */}
        <div className="flex-1 min-h-0">
          {activeTab === 'editor' ? (
            activeFile ? (
              <VimEditor
                content={content}
                filePath={activeFile}
                onChange={handleChange}
                onSave={saveFile}
                onOpenFile={() => setShowSearch(true)}
                onToggleGraph={() => setActiveTab('graph')}
                availableFiles={allFiles}
              />
            ) : (
              /* 웰컴 화면 */
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="text-6xl mb-6">🌙</div>
                <h1 className="text-2xl font-bold text-[#e6e6e6] mb-2">MoonPKM</h1>
                <p className="text-[#5c6370] mb-8 max-w-sm">
                  Vim 기반 지식관리 시스템.<br />
                  사이드바에서 파일을 선택하거나<br />
                  새 노트를 만들어 시작하세요.
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { key: 'Ctrl+F', desc: '파일 검색' },
                    { key: ':Brain', desc: 'BRAIN 템플릿' },
                    { key: ':Graph', desc: '그래프 열기' },
                    { key: ':w', desc: '파일 저장' },
                  ].map(({ key, desc }) => (
                    <div key={key} className="flex items-center gap-2 bg-[#2c313a] rounded px-3 py-2">
                      <kbd className="text-[10px] bg-[#21252b] border border-[#3a3f4b] px-1.5 py-0.5 rounded text-[#7c9ef8]">
                        {key}
                      </kbd>
                      <span className="text-[#5c6370]">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : (
            <GraphView onNodeClick={openFile} />
          )}
        </div>
      </div>

      {/* VimTutor 모달 */}
      {showVimTutor && (
        <VimTutor isOpen={showVimTutor} onClose={() => setShowVimTutor(false)} />
      )}

      {/* 검색 모달 (Telescope 스타일) */}
      {showSearch && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-24"
          onClick={() => setShowSearch(false)}
        >
          <div
            className="w-[600px] bg-[#21252b] rounded-xl border border-[#3a3f4b] shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* 검색 입력 */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#3a3f4b]">
              <Search size={16} className="text-[#5c6370]" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="노트 검색... (파일명, 내용, 태그)"
                className="flex-1 bg-transparent text-[#e6e6e6] placeholder-[#5c6370] outline-none text-sm"
                onKeyDown={e => {
                  if (e.key === 'Enter' && searchResults[0]) {
                    openFile(searchResults[0].path)
                    setShowSearch(false)
                    setSearchQuery('')
                  }
                }}
              />
              <button
                onClick={() => { setShowSearch(false); setSearchQuery('') }}
                className="text-[#5c6370] hover:text-[#abb2bf]"
              >
                <X size={14} />
              </button>
            </div>

            {/* 검색 결과 */}
            <div className="max-h-80 overflow-y-auto">
              {searchLoading ? (
                <div className="px-4 py-3 text-[#5c6370] text-sm">검색 중...</div>
              ) : searchResults.length === 0 && searchQuery ? (
                <div className="px-4 py-3 text-[#5c6370] text-sm">검색 결과 없음</div>
              ) : (
                searchResults.map((result, i) => (
                  <div
                    key={result.path}
                    onClick={() => {
                      openFile(result.path)
                      setShowSearch(false)
                      setSearchQuery('')
                    }}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[#2c313a] transition-colors ${
                      i === 0 ? 'bg-[#2c313a]' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[#e6e6e6] text-sm truncate">{result.title}</div>
                      <div className="text-[#5c6370] text-[10px] truncate">{result.path}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`text-[10px] font-medium ${DIKM_COLORS[result.dikm] || ''}`}>
                        {result.dikm}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 단축키 힌트 */}
            <div className="flex items-center gap-4 px-4 py-2 border-t border-[#3a3f4b] text-[10px] text-[#3a3f4b]">
              <span><kbd className="text-[#5c6370]">Enter</kbd> 열기</span>
              <span><kbd className="text-[#5c6370]">Esc</kbd> 닫기</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
