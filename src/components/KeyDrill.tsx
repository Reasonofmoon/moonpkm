'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ── 개발자 단축키 데이터베이스 ──────────────────────────────
const KEY_DATABASE = [
  // === VIM ESSENTIALS ===
  { id: 'v1',  category: 'Vim 생존', keys: ['Esc'],         desc: 'NORMAL 모드로 복귀',        detail: '가장 중요한 키. 언제든 Esc로 안전지대로 돌아온다.', color: '#ef4444' },
  { id: 'v2',  category: 'Vim 생존', keys: [':wq'],         desc: '저장 후 종료',               detail: 'write + quit. 작업 완료 후 항상 이 순서로.', color: '#ef4444' },
  { id: 'v3',  category: 'Vim 생존', keys: [':q!'],         desc: '강제 종료 (저장 안 함)',     detail: '! = 강제. 저장 없이 탈출하고 싶을 때.', color: '#ef4444' },
  { id: 'v4',  category: 'Vim 이동', keys: ['h'],           desc: '← 왼쪽',                    detail: '홈 포지션 왼쪽 손가락. 방향키 절대 금지.', color: '#f97316' },
  { id: 'v5',  category: 'Vim 이동', keys: ['j'],           desc: '↓ 아래',                    detail: 'j 모양이 아래 방향을 닮았다.', color: '#f97316' },
  { id: 'v6',  category: 'Vim 이동', keys: ['k'],           desc: '↑ 위',                      detail: 'j의 반대. 위로 올라간다.', color: '#f97316' },
  { id: 'v7',  category: 'Vim 이동', keys: ['l'],           desc: '→ 오른쪽',                  detail: '홈 포지션 오른쪽 손가락.', color: '#f97316' },
  { id: 'v8',  category: 'Vim 이동', keys: ['w'],           desc: '다음 단어 시작으로 이동',   detail: 'word. 5w = 5단어 앞으로.', color: '#f97316' },
  { id: 'v9',  category: 'Vim 이동', keys: ['b'],           desc: '이전 단어 시작으로 이동',   detail: 'back. 반대 방향 w.', color: '#f97316' },
  { id: 'v10', category: 'Vim 이동', keys: ['0'],           desc: '줄 맨 앞으로',               detail: '숫자 0. ^과 다름 (^은 첫 공백 아닌 문자).', color: '#f97316' },
  { id: 'v11', category: 'Vim 이동', keys: ['$'],           desc: '줄 맨 끝으로',               detail: '달러 기호. 정규식의 줄 끝과 같음.', color: '#f97316' },
  { id: 'v12', category: 'Vim 이동', keys: ['gg'],          desc: '파일 맨 위로',               detail: 'g를 두 번. G(대문자)는 파일 맨 아래.', color: '#f97316' },
  { id: 'v13', category: 'Vim 이동', keys: ['G'],           desc: '파일 맨 아래로',             detail: '대문자 G. 로그 파일 끝 볼 때 쓴다.', color: '#f97316' },
  { id: 'v14', category: 'Vim 편집', keys: ['i'],           desc: 'INSERT 모드 (커서 앞)',      detail: '커서 위치 앞에서 입력 시작.', color: '#22c55e' },
  { id: 'v15', category: 'Vim 편집', keys: ['a'],           desc: 'INSERT 모드 (커서 뒤)',      detail: 'append. 커서 뒤에서 입력.', color: '#22c55e' },
  { id: 'v16', category: 'Vim 편집', keys: ['o'],           desc: '아래 줄에 새 줄 삽입',      detail: '가장 많이 쓰는 삽입 방법. 자동 INDENT.', color: '#22c55e' },
  { id: 'v17', category: 'Vim 편집', keys: ['dd'],          desc: '현재 줄 삭제 (잘라내기)',   detail: '5dd = 5줄 삭제. p로 붙여넣기 가능.', color: '#22c55e' },
  { id: 'v18', category: 'Vim 편집', keys: ['yy'],          desc: '현재 줄 복사',               detail: 'yank. 5yy = 5줄 복사.', color: '#22c55e' },
  { id: 'v19', category: 'Vim 편집', keys: ['p'],           desc: '커서 뒤에 붙여넣기',        detail: 'P(대문자) = 커서 앞에. dd + p = 줄 이동.', color: '#22c55e' },
  { id: 'v20', category: 'Vim 편집', keys: ['u'],           desc: '실행취소 (Undo)',            detail: '여러 번 누르면 계속 되돌아간다.', color: '#22c55e' },
  { id: 'v21', category: 'Vim 편집', keys: ['Ctrl', 'r'],  desc: '다시실행 (Redo)',            detail: 'u를 너무 많이 눌렀을 때 복구.', color: '#22c55e' },
  { id: 'v22', category: 'Vim 검색', keys: ['/패턴'],       desc: '앞으로 패턴 검색',          detail: '입력 후 Enter. n으로 다음, N으로 이전.', color: '#3b82f6' },
  { id: 'v23', category: 'Vim 검색', keys: ['n'],          desc: '다음 검색 결과',              detail: '/ 검색 후 n으로 빠르게 이동.', color: '#3b82f6' },
  { id: 'v24', category: 'Vim 검색', keys: ['*'],          desc: '커서 단어 즉시 검색',        detail: '가장 빠른 단어 검색. n으로 다음 결과.', color: '#3b82f6' },
  { id: 'v25', category: 'Vim 고급', keys: ['ciw'],        desc: '단어 내용 전체 변경',        detail: 'c=change, i=inner, w=word. 프로의 필수 기술.', color: '#a855f7' },
  { id: 'v26', category: 'Vim 고급', keys: ['ci"'],        desc: '따옴표 안 내용 변경',        detail: 'ci( = 괄호 안, ci{ = 중괄호 안.', color: '#a855f7' },
  { id: 'v27', category: 'Vim 고급', keys: ['V'],          desc: '줄 단위 선택 모드',           detail: 'Visual Line 모드. d/y로 조작.', color: '#a855f7' },
  { id: 'v28', category: 'Vim 고급', keys: ['Ctrl', 'v'], desc: '블록 선택 모드',              detail: '여러 줄 동시 편집. I로 앞에 텍스트 삽입.', color: '#a855f7' },
  { id: 'v29', category: 'Vim 고급', keys: ['qa'],         desc: '매크로 기록 시작 (a 레지스터)', detail: 'q로 시작, 작업 후 q로 종료. @a로 실행.', color: '#a855f7' },
  { id: 'v30', category: 'Vim 고급', keys: ['.'],          desc: '마지막 명령 반복',            detail: 'Vim 최강 단축키. 반복 작업의 핵심.', color: '#a855f7' },
  // === TERMINAL ===
  { id: 't1',  category: '터미널',   keys: ['Ctrl', 'c'], desc: '실행 중인 프로세스 종료',    detail: '멈추고 싶을 때 항상 이거. SIGINT 신호.', color: '#06b6d4' },
  { id: 't2',  category: '터미널',   keys: ['Ctrl', 'z'], desc: '프로세스 백그라운드 전환',   detail: 'fg로 다시 포그라운드로. suspend.', color: '#06b6d4' },
  { id: 't3',  category: '터미널',   keys: ['Ctrl', 'l'], desc: '터미널 화면 클리어',         detail: 'clear 명령과 동일. 한 손가락이 더 빠름.', color: '#06b6d4' },
  { id: 't4',  category: '터미널',   keys: ['Ctrl', 'a'], desc: '줄 맨 앞으로 이동',          detail: 'Home 키보다 빠름. Bash/Zsh 공통.', color: '#06b6d4' },
  { id: 't5',  category: '터미널',   keys: ['Ctrl', 'e'], desc: '줄 맨 끝으로 이동',          detail: 'End 키보다 빠름. Emacs 스타일.', color: '#06b6d4' },
  { id: 't6',  category: '터미널',   keys: ['Ctrl', 'r'], desc: '명령어 히스토리 검색',       detail: '입력하면 실시간 검색. Enter로 실행.', color: '#06b6d4' },
  { id: 't7',  category: '터미널',   keys: ['↑'],         desc: '이전 명령어',                detail: '계속 누르면 히스토리 거슬러 올라감.', color: '#06b6d4' },
  { id: 't8',  category: '터미널',   keys: ['Tab'],       desc: '자동완성',                   detail: '두 번 누르면 후보 목록. 개발자의 절약 습관.', color: '#06b6d4' },
  // === GIT ===
  { id: 'g1',  category: 'Git',      keys: ['git add .'],          desc: '모든 변경사항 스테이징',  detail: '점(.)은 현재 디렉토리 전체. 조심해서 쓸 것.', color: '#f59e0b' },
  { id: 'g2',  category: 'Git',      keys: ['git commit -m "..."'], desc: '커밋 메시지와 함께 커밋', detail: '-m 없으면 vim 에디터 열림. 메시지는 현재형.', color: '#f59e0b' },
  { id: 'g3',  category: 'Git',      keys: ['git status'],         desc: '변경사항 현황 확인',       detail: '커밋 전 항상 확인하는 습관을 들여라.', color: '#f59e0b' },
  { id: 'g4',  category: 'Git',      keys: ['git diff'],           desc: '변경 내용 비교',           detail: '--staged = 스테이징된 변경사항 비교.', color: '#f59e0b' },
  { id: 'g5',  category: 'Git',      keys: ['git log --oneline'],  desc: '커밋 히스토리 한 줄 보기', detail: '가장 간결한 로그 형식. 브랜치 상태 파악.', color: '#f59e0b' },
  { id: 'g6',  category: 'Git',      keys: ['git stash'],          desc: '작업 임시 저장',           detail: 'pop으로 복구. 브랜치 전환 전 필수.', color: '#f59e0b' },
]

type DrillCard = typeof KEY_DATABASE[0]

const CATEGORIES = ['전체', ...Array.from(new Set(KEY_DATABASE.map(k => k.category)))]

// ── 키 비주얼 렌더링 ─────────────────────────────
function KeyCap({ k, pressed }: { k: string; pressed: boolean }) {
  const isSpecial = k.length > 3 || k.includes('+') || k.startsWith('git') || k.startsWith(':')
  return (
    <div
      className={`
        inline-flex items-center justify-center font-mono font-bold rounded-lg
        border-b-[3px] transition-all duration-150 select-none
        ${isSpecial
          ? 'px-4 py-2 text-sm min-w-[80px]'
          : 'w-12 h-12 text-lg'}
        ${pressed
          ? 'translate-y-[2px] border-b-[1px] brightness-110'
          : 'translate-y-0'}
      `}
      style={{
        background: pressed ? 'rgba(124, 158, 248, 0.25)' : 'rgba(44, 49, 58, 0.9)',
        borderColor: pressed ? '#7c9ef8' : '#4a5568',
        color: pressed ? '#7c9ef8' : '#e6e6e6',
        boxShadow: pressed
          ? 'inset 0 2px 4px rgba(0,0,0,0.4)'
          : '0 4px 0 rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      {k}
    </div>
  )
}

// ── 메인 드릴 컴포넌트 ──────────────────────────
interface KeyDrillProps {
  isOpen: boolean
  onClose: () => void
}

type Phase = 'show-key' | 'show-desc' | 'result'
type Rating = 'know' | 'unsure' | 'fail'

export default function KeyDrill({ isOpen, onClose }: KeyDrillProps) {
  const [category, setCategory] = useState('전체')
  const [deck, setDeck] = useState<DrillCard[]>([])
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('show-key')
  const [pressed, setPressed] = useState(false)
  const [ratings, setRatings] = useState<Record<string, Rating>>({})
  const [typing, setTyping] = useState('')
  const [sessionDone, setSessionDone] = useState(false)
  const [autoReveal, setAutoReveal] = useState(false)
  const [speed, setSpeed] = useState(2) // 초
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const typingRef = useRef<NodeJS.Timeout | null>(null)

  // 덱 셔플 + 초기화
  const initDeck = useCallback((cat: string) => {
    const pool = cat === '전체' ? KEY_DATABASE : KEY_DATABASE.filter(k => k.category === cat)
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    setDeck(shuffled)
    setIdx(0)
    setPhase('show-key')
    setRatings({})
    setSessionDone(false)
    setTyping('')
    setPressed(false)
  }, [])

  useEffect(() => {
    if (isOpen) initDeck(category)
  }, [isOpen, category, initDeck])

  const currentCard = deck[idx]

  // 타이핑 애니메이션
  useEffect(() => {
    if (phase !== 'show-desc' || !currentCard) return
    setTyping('')
    if (typingRef.current) clearInterval(typingRef.current)
    let i = 0
    const full = currentCard.detail
    typingRef.current = setInterval(() => {
      if (i <= full.length) {
        setTyping(full.slice(0, i))
        i++
      } else {
        clearInterval(typingRef.current!)
      }
    }, 20)
    return () => { if (typingRef.current) clearInterval(typingRef.current) }
  }, [phase, idx, currentCard])

  // 키 눌림 애니메이션
  useEffect(() => {
    if (phase !== 'show-key') return
    setPressed(false)
    const t = setTimeout(() => setPressed(true), 400)
    return () => clearTimeout(t)
  }, [idx, phase])

  // 자동 다음
  useEffect(() => {
    if (!autoReveal) return
    if (phase === 'show-key') {
      timerRef.current = setTimeout(() => setPhase('show-desc'), speed * 1000)
    } else if (phase === 'show-desc') {
      timerRef.current = setTimeout(() => rate('know'), speed * 1000 * 1.5)
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [phase, idx, autoReveal, speed])

  const rate = (r: Rating) => {
    if (!currentCard) return
    const newRatings = { ...ratings, [currentCard.id]: r }
    setRatings(newRatings)
    const next = idx + 1
    if (next >= deck.length) {
      setSessionDone(true)
    } else {
      setIdx(next)
      setPhase('show-key')
      setPressed(false)
    }
  }

  if (!isOpen) return null

  const knowCount = Object.values(ratings).filter(r => r === 'know').length
  const failCount = Object.values(ratings).filter(r => r === 'fail').length
  const progress = deck.length > 0 ? (idx / deck.length) * 100 : 0

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="w-[660px] bg-[#1a1d23] rounded-2xl border border-[#3a3f4b] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">

        {/* 헤더 */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-[#3a3f4b] bg-[#21252b] shrink-0">
          <span className="text-xl">⌨️</span>
          <span className="text-[#e6e6e6] font-semibold text-sm">단축키 드릴</span>

          {/* 카테고리 */}
          <div className="flex items-center gap-1 ml-2 flex-wrap">
            {CATEGORIES.slice(0, 7).map(cat => (
              <button
                key={cat}
                onClick={() => { setCategory(cat); initDeck(cat) }}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                  category === cat
                    ? 'bg-[#7c9ef8] text-white'
                    : 'bg-[#2c313a] text-[#5c6370] hover:text-[#abb2bf]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* 속도 */}
            <div className="flex items-center gap-1 text-[10px] text-[#5c6370]">
              <span>속도</span>
              {[1, 2, 3].map(s => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`w-5 h-5 rounded text-[9px] font-bold ${speed === s ? 'bg-[#7c9ef8] text-white' : 'bg-[#2c313a] text-[#5c6370]'}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              onClick={() => setAutoReveal(a => !a)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                autoReveal ? 'bg-[#22c55e] text-white' : 'bg-[#2c313a] text-[#5c6370]'
              }`}
            >
              {autoReveal ? '⏸ 자동' : '▶ 자동'}
            </button>
            <button onClick={onClose} className="text-[#5c6370] hover:text-[#abb2bf] text-sm">✕</button>
          </div>
        </div>

        {/* 진행 바 */}
        <div className="h-1 bg-[#2c313a] shrink-0">
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: currentCard ? currentCard.color : '#7c9ef8'
            }}
          />
        </div>

        {/* 카드 영역 */}
        {sessionDone ? (
          /* 세션 완료 화면 */
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
            <div className="text-5xl">🎉</div>
            <div className="text-[#e6e6e6] text-xl font-bold">세션 완료!</div>
            <div className="flex gap-6 text-sm">
              <div className="text-center">
                <div className="text-3xl font-bold text-[#22c55e]">{knowCount}</div>
                <div className="text-[#5c6370]">알고 있음</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-[#f97316]">
                  {Object.values(ratings).filter(r => r === 'unsure').length}
                </div>
                <div className="text-[#5c6370]">불확실</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-[#ef4444]">{failCount}</div>
                <div className="text-[#5c6370]">모름</div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => initDeck(category)}
                className="px-5 py-2 bg-[#7c9ef8] text-white rounded-lg text-sm font-medium hover:bg-[#6b8de8] transition-colors"
              >
                🔄 다시 시작
              </button>
              <button
                onClick={() => {
                  // 틀린 것만 다시
                  const failIds = Object.entries(ratings).filter(([,r]) => r !== 'know').map(([id]) => id)
                  const failDeck = KEY_DATABASE.filter(k => failIds.includes(k.id)).sort(() => Math.random() - 0.5)
                  if (failDeck.length > 0) {
                    setDeck(failDeck)
                    setIdx(0)
                    setPhase('show-key')
                    setRatings({})
                    setSessionDone(false)
                  }
                }}
                className="px-5 py-2 bg-[#ef4444] text-white rounded-lg text-sm font-medium hover:bg-[#dc2626] transition-colors disabled:opacity-40"
                disabled={failCount + Object.values(ratings).filter(r => r === 'unsure').length === 0}
              >
                🔥 모른 것만
              </button>
            </div>
          </div>
        ) : currentCard ? (
          <div className="flex-1 flex flex-col">
            {/* 카드 상단 — 카테고리 + 번호 */}
            <div className="flex items-center justify-between px-6 pt-5 pb-2">
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider"
                style={{ background: currentCard.color + '22', color: currentCard.color }}
              >
                {currentCard.category}
              </span>
              <span className="text-[#5c6370] text-xs">{idx + 1} / {deck.length}</span>
            </div>

            {/* 키 비주얼 */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
              {/* 키캡 */}
              <div className="flex items-center gap-2">
                {currentCard.keys.map((k, i) => (
                  <span key={i} className="flex items-center gap-2">
                    {i > 0 && <span className="text-[#5c6370] text-lg font-bold">+</span>}
                    <KeyCap k={k} pressed={pressed} />
                  </span>
                ))}
              </div>

              {/* 설명 영역 */}
              <div
                className={`w-full max-w-md text-center transition-all duration-300 ${
                  phase === 'show-key' ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
                }`}
              >
                <div className="text-[#e6e6e6] text-xl font-bold mb-3">
                  {currentCard.desc}
                </div>
                <div className="bg-[#2c313a] rounded-xl px-5 py-4 border border-[#3a3f4b]">
                  <p className="text-[#98c379] text-sm font-mono text-left">
                    {typing}
                    {typing.length < currentCard.detail.length && (
                      <span className="animate-pulse text-[#7c9ef8]">|</span>
                    )}
                  </p>
                </div>
              </div>

              {/* 클릭 힌트 */}
              {phase === 'show-key' && !autoReveal && (
                <button
                  onClick={() => setPhase('show-desc')}
                  className="mt-2 text-[#5c6370] text-xs flex items-center gap-2 hover:text-[#abb2bf] transition-colors animate-pulse"
                >
                  <span>Space 또는 클릭해서 설명 보기</span>
                </button>
              )}
            </div>

            {/* 하단 버튼 */}
            {phase !== 'show-key' && !autoReveal && (
              <div className="px-6 pb-5 flex items-center gap-3">
                <button
                  onClick={() => rate('fail')}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all bg-[#2c313a] text-[#ef4444] border border-[#ef4444]/30 hover:bg-[#ef4444]/20"
                >
                  😓 모름
                </button>
                <button
                  onClick={() => rate('unsure')}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all bg-[#2c313a] text-[#f97316] border border-[#f97316]/30 hover:bg-[#f97316]/20"
                >
                  🤔 애매함
                </button>
                <button
                  onClick={() => rate('know')}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all bg-[#2c313a] text-[#22c55e] border border-[#22c55e]/30 hover:bg-[#22c55e]/20"
                >
                  ✓ 알고 있음
                </button>
              </div>
            )}

            {/* Space 로 넘기기 힌트 */}
            {phase === 'show-key' && !autoReveal && (
              <div className="px-6 pb-5 text-center">
                <button
                  onClick={() => setPhase('show-desc')}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[#2c313a] text-[#7c9ef8] border border-[#7c9ef8]/30 hover:bg-[#7c9ef8]/10 transition-all"
                >
                  Space — 설명 보기
                </button>
              </div>
            )}
          </div>
        ) : null}

        {/* 하단 통계 바 */}
        {!sessionDone && deck.length > 0 && (
          <div className="px-5 py-2 border-t border-[#3a3f4b] bg-[#21252b] flex items-center gap-4 text-[10px] text-[#5c6370] shrink-0">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
              알고 있음 {knowCount}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#f97316]" />
              애매함 {Object.values(ratings).filter(r => r === 'unsure').length}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
              모름 {failCount}
            </span>
            <button
              onClick={() => initDeck(category)}
              className="ml-auto hover:text-[#abb2bf] transition-colors"
            >
              🔄 리셋
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
