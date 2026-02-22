'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { EditorView, keymap, ViewUpdate } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { vim, Vim } from '@replit/codemirror-vim'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { autocompletion, completionKeymap } from '@codemirror/autocomplete'
import { lineNumbers, highlightActiveLineGutter } from '@codemirror/view'
import { bracketMatching, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { languages } from '@codemirror/language-data'

interface VimEditorProps {
  content: string
  filePath: string | null
  onChange?: (content: string) => void
  onSave?: (content: string) => void
  onOpenFile?: (query: string) => void
  onToggleGraph?: () => void
  availableFiles?: string[]
}

const DIKM_COLORS: Record<string, string> = {
  data: '#ef4444',
  information: '#f97316',
  knowledge: '#a855f7',
  meaning: '#22c55e',
}

export default function VimEditor({
  content,
  filePath,
  onChange,
  onSave,
  onOpenFile,
  onToggleGraph,
  availableFiles = [],
}: VimEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const [mode, setMode] = useState<'NORMAL' | 'INSERT' | 'VISUAL' | 'COMMAND'>('NORMAL')
  const [statusMsg, setStatusMsg] = useState('')
  const [cursor, setCursor] = useState({ line: 1, col: 1 })

  // wikilink 자동완성
  const wikilinkCompletion = useCallback(() => ({
    override: [
      async (context: import('@codemirror/autocomplete').CompletionContext) => {
        const word = context.matchBefore(/\[\[[^\]]*/)
        if (!word) return null
        const query = word.text.slice(2)
        const options = availableFiles
          .filter(f => f.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 20)
          .map(f => ({
            label: `[[${f}]]`,
            apply: `[[${f}]]`,
            type: 'keyword',
          }))
        return { from: word.from, options }
      }
    ]
  }), [availableFiles])

  useEffect(() => {
    if (!editorRef.current) return

    // Vim 커스텀 명령어 등록
    Vim.defineEx('w', '', () => {
      const view = viewRef.current
      if (view && onSave) {
        onSave(view.state.doc.toString())
        setStatusMsg('"' + (filePath || 'buffer') + '" written')
      }
    })

    Vim.defineEx('wa', '', () => {
      const view = viewRef.current
      if (view && onSave) {
        onSave(view.state.doc.toString())
        setStatusMsg('All files written')
      }
    })

    Vim.defineEx('q', '', () => {
      setStatusMsg('Use browser to close tab')
    })

    Vim.defineEx('Brain', '', () => {
      const view = viewRef.current
      if (!view) return
      const brainTemplate = `\n## Background (배경/맥락)\n\n\n## Resonance (울림/감정)\n\n\n## Amplify (왜 중요한가)\n\n\n## Integrate (연결 노트)\n\n- [[]]\n- [[]]\n\n## Navigate (다음 행동)\n\n- [ ] \n`
      view.dispatch({
        changes: { from: view.state.doc.length, insert: brainTemplate }
      })
      setStatusMsg('BRAIN template inserted')
    })

    Vim.defineEx('Graph', '', () => {
      onToggleGraph?.()
      setStatusMsg('Graph view toggled')
    })

    Vim.defineEx('Find', '', () => {
      onOpenFile?.('')
      setStatusMsg('File finder opened')
    })

    Vim.defineEx('Telescope', '', () => {
      onOpenFile?.('')
      setStatusMsg('Telescope opened')
    })

    const extensions = [
      vim(),
      lineNumbers(),
      highlightActiveLineGutter(),
      history(),
      markdown({
        base: markdownLanguage,
        codeLanguages: languages,
      }),
      oneDark,
      bracketMatching(),
      syntaxHighlighting(defaultHighlightStyle),
      highlightSelectionMatches(),
      autocompletion(wikilinkCompletion()),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap,
        ...completionKeymap,
      ]),
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged && onChange) {
          onChange(update.state.doc.toString())
        }
        // 커서 위치 업데이트
        const sel = update.state.selection.main
        const line = update.state.doc.lineAt(sel.head)
        setCursor({ line: line.number, col: sel.head - line.from + 1 })
      }),
      EditorView.theme({
        '&': {
          height: '100%',
          fontSize: '15px',
          fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
        },
        '.cm-content': { padding: '16px 0' },
        '.cm-line': { padding: '0 24px' },
        '.cm-scroller': { overflow: 'auto' },
        '.cm-focused': { outline: 'none' },
        // wikilink 하이라이트
        '.cm-link': { color: '#7c9ef8', textDecoration: 'none' },
      }),
    ]

    const state = EditorState.create({
      doc: content,
      extensions,
    })

    const view = new EditorView({
      state,
      parent: editorRef.current,
    })

    viewRef.current = view
    view.focus()

    return () => {
      view.destroy()
      viewRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 외부에서 content 변경 시 에디터 업데이트
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== content) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: content }
      })
    }
  }, [content])

  // Vim 모드 감지
  useEffect(() => {
    const interval = setInterval(() => {
      const vimState = (viewRef.current as any)?._vimState
        || (viewRef.current?.dom?.querySelector('.cm-vim-panel') ? 'COMMAND' : null)
      
      // DOM에서 vim 모드 감지
      const cmdLine = document.querySelector('.cm-vim-panel')
      if (cmdLine) {
        setMode('COMMAND')
      }
    }, 100)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col h-full bg-[#282c34]">
      {/* 에디터 메인 영역 */}
      <div
        ref={editorRef}
        className="flex-1 overflow-hidden"
        style={{ minHeight: 0 }}
      />
      
      {/* Vim 상태바 */}
      <div className="flex items-center justify-between px-4 py-1 bg-[#21252b] border-t border-[#3a3f4b] text-xs font-mono select-none">
        <div className="flex items-center gap-3">
          {/* 모드 표시 */}
          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
            mode === 'INSERT' ? 'bg-green-600 text-white' :
            mode === 'VISUAL' ? 'bg-purple-600 text-white' :
            mode === 'COMMAND' ? 'bg-yellow-600 text-black' :
            'bg-blue-600 text-white'
          }`}>
            -- {mode} --
          </span>
          
          {/* 파일 경로 */}
          <span className="text-[#abb2bf] truncate max-w-[300px]">
            {filePath || '[No file]'}
          </span>
          
          {/* 상태 메시지 */}
          {statusMsg && (
            <span className="text-[#98c379]">{statusMsg}</span>
          )}
        </div>
        
        {/* 커서 위치 */}
        <span className="text-[#5c6370]">
          {cursor.line}:{cursor.col}
        </span>
      </div>
    </div>
  )
}
