'use client'

import { useEffect, useState } from 'react'

// ── 전체 단축키 정의 ──────────────────────────────
export const SHORTCUTS = {
  '앱 전역': [
    { keys: ['?'], desc: '단축키 패널 열기/닫기' },
    { keys: ['Ctrl', 'F'], desc: 'Telescope 검색' },
    { keys: ['Ctrl', 'S'], desc: '파일 저장' },
    { keys: ['Esc'], desc: '모달 닫기 / NORMAL 모드' },
  ],
  'Vim — 이동': [
    { keys: ['h', 'j', 'k', 'l'], desc: '← ↓ ↑ → 이동' },
    { keys: ['w'], desc: '다음 단어' },
    { keys: ['b'], desc: '이전 단어' },
    { keys: ['0'], desc: '줄 맨 앞' },
    { keys: ['$'], desc: '줄 맨 끝' },
    { keys: ['gg'], desc: '파일 맨 위' },
    { keys: ['G'], desc: '파일 맨 아래' },
    { keys: ['Ctrl', 'd'], desc: '반 페이지 아래' },
    { keys: ['Ctrl', 'u'], desc: '반 페이지 위' },
  ],
  'Vim — 편집': [
    { keys: ['i'], desc: 'INSERT 모드 (커서 앞)' },
    { keys: ['a'], desc: 'INSERT 모드 (커서 뒤)' },
    { keys: ['o'], desc: '아래 줄에 새 줄 + INSERT' },
    { keys: ['dd'], desc: '현재 줄 삭제' },
    { keys: ['yy'], desc: '현재 줄 복사' },
    { keys: ['p'], desc: '붙여넣기' },
    { keys: ['u'], desc: '실행취소 (Undo)' },
    { keys: ['Ctrl', 'r'], desc: '다시실행 (Redo)' },
    { keys: ['ciw'], desc: '단어 내용 변경' },
    { keys: ['ci"'], desc: '따옴표 안 변경' },
  ],
  'Vim — 검색': [
    { keys: ['/'], desc: '앞으로 검색' },
    { keys: ['n'], desc: '다음 결과' },
    { keys: ['N'], desc: '이전 결과' },
    { keys: ['*'], desc: '커서 단어 검색' },
    { keys: [':%s/old/new/g'], desc: '전체 치환' },
  ],
  'Vim — 파일': [
    { keys: [':w'], desc: '저장' },
    { keys: [':q'], desc: '종료' },
    { keys: [':wq'], desc: '저장 + 종료' },
    { keys: [':q!'], desc: '강제 종료 (저장 안함)' },
  ],
  'MoonPKM 명령': [
    { keys: [':Brain'], desc: 'BRAIN 템플릿 삽입' },
    { keys: [':Graph'], desc: '지식 그래프 열기' },
    { keys: [':Find'], desc: 'Telescope 검색 (Vim 명령)' },
    { keys: [':w'], desc: '파일 저장' },
  ],
}

// ── 단축키 패널 컴포넌트 ─────────────────────────
interface KeyboardShortcutsProps {
  isOpen: boolean
  onClose: () => void
}

export function KeyboardShortcuts({ isOpen, onClose }: KeyboardShortcutsProps) {
  const [filter, setFilter] = useState('')

  useEffect(() => {
    if (isOpen) setFilter('')
  }, [isOpen])

  if (!isOpen) return null

  const filtered = filter.trim().toLowerCase()

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-[700px] max-h-[85vh] bg-[#1a1d23] rounded-2xl border border-[#3a3f4b] shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#3a3f4b] bg-[#21252b]">
          <span className="text-lg">⌨️</span>
          <span className="text-[#e6e6e6] font-semibold text-sm">단축키 참조</span>
          <input
            autoFocus
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="필터 (예: 검색, 이동...)"
            className="ml-auto bg-[#2c313a] border border-[#3a3f4b] rounded-lg px-3 py-1.5 text-xs text-[#abb2bf] placeholder-[#5c6370] outline-none w-44 focus:border-[#7c9ef8] transition-colors"
          />
          <button onClick={onClose} className="text-[#5c6370] hover:text-[#abb2bf] text-sm ml-1">✕</button>
        </div>

        {/* 본문 — 2열 그리드 */}
        <div className="overflow-y-auto p-5 grid grid-cols-2 gap-x-6 gap-y-4">
          {Object.entries(SHORTCUTS).map(([category, items]) => {
            const visible = items.filter(item =>
              !filtered ||
              item.desc.toLowerCase().includes(filtered) ||
              item.keys.some(k => k.toLowerCase().includes(filtered))
            )
            if (visible.length === 0) return null

            return (
              <div key={category}>
                <div className="text-[10px] uppercase tracking-wider text-[#5c6370] mb-2 font-semibold">
                  {category}
                </div>
                <div className="space-y-1">
                  {visible.map(item => (
                    <div
                      key={item.desc}
                      className="flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg hover:bg-[#2c313a] transition-colors"
                    >
                      <span className="text-[#abb2bf] text-xs flex-1">{item.desc}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {item.keys.map((key, i) => (
                          <span key={i} className="flex items-center gap-0.5">
                            {i > 0 && key.length === 1 && item.keys[i - 1].length === 1
                              ? <span className="text-[#5c6370] text-[9px] mx-0.5">/</span>
                              : i > 0 ? <span className="text-[#5c6370] text-[9px] mx-0.5">+</span>
                              : null}
                            <kbd className="inline-flex items-center px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold text-[#7c9ef8] bg-[#2c313a] border border-[#3a3f4b] whitespace-nowrap">
                              {key}
                            </kbd>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* 푸터 */}
        <div className="px-5 py-2.5 border-t border-[#3a3f4b] bg-[#21252b] flex items-center gap-4 text-[10px] text-[#5c6370]">
          <span><kbd className="text-[#7c9ef8] bg-[#2c313a] border border-[#3a3f4b] px-1 py-0.5 rounded text-[9px]">?</kbd> 이 패널 열기</span>
          <span><kbd className="text-[#7c9ef8] bg-[#2c313a] border border-[#3a3f4b] px-1 py-0.5 rounded text-[9px]">Esc</kbd> 닫기</span>
          <span className="ml-auto">MoonPKM v2.0</span>
        </div>
      </div>
    </div>
  )
}

// ── 호버 툴팁 컴포넌트 ──────────────────────────
interface TooltipProps {
  children: React.ReactNode
  content: string
  shortcut?: string[]
  side?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

export function Tooltip({ children, content, shortcut, side = 'bottom', delay = 300 }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null)

  const show = () => {
    const t = setTimeout(() => setVisible(true), delay)
    setTimer(t)
  }

  const hide = () => {
    if (timer) clearTimeout(timer)
    setVisible(false)
  }

  const posClass = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[side]

  return (
    <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <div
          className={`absolute ${posClass} z-50 pointer-events-none 
            flex items-center gap-2 px-2.5 py-1.5 rounded-lg 
            bg-[#21252b] border border-[#3a3f4b] shadow-xl
            whitespace-nowrap animate-in fade-in-0 zoom-in-95 duration-100`}
        >
          <span className="text-[#abb2bf] text-[11px]">{content}</span>
          {shortcut && shortcut.length > 0 && (
            <div className="flex items-center gap-0.5">
              {shortcut.map((k, i) => (
                <span key={i} className="flex items-center gap-0.5">
                  {i > 0 && <span className="text-[#5c6370] text-[9px]">+</span>}
                  <kbd className="px-1 py-0.5 rounded font-mono text-[9px] font-bold text-[#7c9ef8] bg-[#2c313a] border border-[#3a3f4b]">
                    {k}
                  </kbd>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
