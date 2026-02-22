'use client'

import { useState, useEffect, useRef } from 'react'

// Vim 학습 커리큘럼 — 25개 레슨, 5단계
const VIM_LESSONS = [
  // 🟢 BASIC — 생존 모드
  {
    level: 1, category: 'BASIC', day: 1,
    title: '첫 번째 임무: 탈출하라!',
    mission: 'Vim을 열고 닫을 수 있어야 한다',
    commands: [
      { key: ':q!', desc: '저장 없이 강제 종료', color: '#ef4444' },
      { key: ':wq', desc: '저장 후 종료', color: '#22c55e' },
      { key: 'i', desc: 'INSERT 모드 진입', color: '#3b82f6' },
      { key: 'Esc', desc: 'NORMAL 모드로 복귀', color: '#a855f7' },
    ],
    tip: 'Vim은 "모드" 기반 에디터. 항상 Esc로 NORMAL 모드로 돌아와라.',
    challenge: '1. nvim 실행 → 2. i 누르기 → 3. 텍스트 입력 → 4. Esc → 5. :wq',
  },
  {
    level: 1, category: 'BASIC', day: 2,
    title: '커서 이동의 기본',
    mission: '마우스 없이 커서를 자유롭게 이동한다',
    commands: [
      { key: 'h', desc: '← 왼쪽', color: '#f97316' },
      { key: 'j', desc: '↓ 아래', color: '#22c55e' },
      { key: 'k', desc: '↑ 위', color: '#3b82f6' },
      { key: 'l', desc: '→ 오른쪽', color: '#a855f7' },
    ],
    tip: 'hjkl은 손이 홈 포지션에서 벗어나지 않아도 된다. 방향키는 쓰지 마라.',
    challenge: '3분 동안 arrow key 대신 hjkl만 사용해서 파일 탐색하기',
  },
  {
    level: 1, category: 'BASIC', day: 3,
    title: '단어 단위 점프',
    mission: '단어 단위로 빠르게 이동한다',
    commands: [
      { key: 'w', desc: '다음 단어 시작으로', color: '#22c55e' },
      { key: 'b', desc: '이전 단어 시작으로', color: '#f97316' },
      { key: 'e', desc: '현재 단어 끝으로', color: '#3b82f6' },
      { key: '0', desc: '줄 맨 앞으로', color: '#a855f7' },
      { key: '$', desc: '줄 맨 끝으로', color: '#ef4444' },
    ],
    tip: 'w/b/e 는 Vim 속도의 핵심. 5w = 5단어 앞으로!',
    challenge: '긴 문장에서 5w, 3b, 2e를 연속으로 사용해보기',
  },
  {
    level: 1, category: 'BASIC', day: 4,
    title: '편집의 시작',
    mission: '텍스트를 정확하게 삽입하고 삭제한다',
    commands: [
      { key: 'dd', desc: '현재 줄 삭제', color: '#ef4444' },
      { key: 'yy', desc: '현재 줄 복사', color: '#22c55e' },
      { key: 'p', desc: '붙여넣기 (커서 뒤)', color: '#3b82f6' },
      { key: 'u', desc: '실행취소 (Undo)', color: '#a855f7' },
      { key: 'Ctrl+r', desc: '다시실행 (Redo)', color: '#f97316' },
    ],
    tip: 'dd + p = 줄 이동! yy + p = 줄 복제!',
    challenge: '마크다운 파일에서 줄을 삭제, 복사, 붙여넣기 해보기',
  },
  // 🔵 NORMAL — 생산성 모드
  {
    level: 2, category: 'NORMAL', day: 5,
    title: '검색과 치환',
    mission: '텍스트를 빠르게 찾고 바꾼다',
    commands: [
      { key: '/검색어', desc: '앞으로 검색', color: '#22c55e' },
      { key: 'n', desc: '다음 검색 결과', color: '#3b82f6' },
      { key: 'N', desc: '이전 검색 결과', color: '#a855f7' },
      { key: ':%s/old/new/g', desc: '전체 치환', color: '#ef4444' },
    ],
    tip: ':%s/old/new/gc 에서 c는 확인 모드. 하나씩 선택 가능.',
    challenge: '노트에서 특정 단어를 모두 찾아 다른 단어로 바꾸기',
  },
  {
    level: 2, category: 'NORMAL', day: 6,
    title: '비주얼 모드 마스터',
    mission: '텍스트 블록을 선택하고 조작한다',
    commands: [
      { key: 'v', desc: '문자 선택 모드', color: '#3b82f6' },
      { key: 'V', desc: '줄 선택 모드', color: '#22c55e' },
      { key: 'Ctrl+v', desc: '블록 선택 모드', color: '#a855f7' },
      { key: 'gq', desc: '선택 영역 포맷팅', color: '#f97316' },
    ],
    tip: 'Ctrl+v로 블록 선택 → I → 텍스트 → Esc = 여러 줄 동시 수정!',
    challenge: '여러 줄의 앞에 동시에 "- " 추가해보기 (블록 선택 사용)',
  },
  {
    level: 2, category: 'NORMAL', day: 7,
    title: '매크로: 반복 자동화',
    mission: '반복 작업을 매크로로 자동화한다',
    commands: [
      { key: 'qa', desc: 'a 레지스터에 매크로 기록 시작', color: '#f97316' },
      { key: 'q', desc: '기록 종료', color: '#ef4444' },
      { key: '@a', desc: 'a 매크로 실행', color: '#22c55e' },
      { key: '@@', desc: '마지막 매크로 반복', color: '#3b82f6' },
      { key: '100@a', desc: '매크로 100번 실행', color: '#a855f7' },
    ],
    tip: '매크로는 Vim의 superpower. 반복 작업을 한 번만 만들면 된다!',
    challenge: '줄 앞에 번호 붙이는 매크로 만들어서 20줄에 적용하기',
  },
  // 🟣 ADVANCED
  {
    level: 3, category: 'ADVANCED', day: 8,
    title: '텍스트 오브젝트',
    mission: '의미 단위로 텍스트를 조작한다',
    commands: [
      { key: 'ciw', desc: '단어 내용 변경 (change inner word)', color: '#22c55e' },
      { key: 'ci"', desc: '따옴표 안 내용 변경', color: '#3b82f6' },
      { key: 'ci(', desc: '괄호 안 내용 변경', color: '#a855f7' },
      { key: 'dit', desc: 'HTML 태그 내용 삭제', color: '#f97316' },
      { key: 'vap', desc: '단락 전체 선택', color: '#ef4444' },
    ],
    tip: 'c=change, d=delete, y=yank + i=inner, a=around + 오브젝트',
    challenge: 'JSON 파일에서 ci" 로 값만 바꾸기, ci{ 로 블록 바꾸기',
  },
  // moonpkm 전용 명령
  {
    level: 4, category: 'MOONPKM', day: 9,
    title: 'MoonPKM Vim 명령',
    mission: ':Moon 명령으로 PKM을 Vim에서 제어한다',
    commands: [
      { key: ':MoonCapture', desc: '현재 줄을 Inbox에 캡처', color: '#22c55e' },
      { key: ':MoonBrain', desc: 'BRAIN 섹션 삽입', color: '#3b82f6' },
      { key: ':MoonSearch', desc: 'Vault 검색', color: '#a855f7' },
      { key: ':MoonAgent', desc: '에이전트 실행', color: '#f97316' },
      { key: '<leader>ms', desc: '검색 (축약)', color: '#ef4444' },
    ],
    tip: 'moon.nvim을 설치하면 Vim 안에서 전체 PKM을 제어할 수 있다!',
    challenge: ':MoonCapture로 오늘의 아이디어를 Inbox에 저장해보기',
  },
]

const LEVEL_COLORS: Record<string, string> = {
  BASIC: '#22c55e',
  NORMAL: '#3b82f6',
  ADVANCED: '#a855f7',
  MOONPKM: '#f97316',
}

const LEVEL_LABELS: Record<string, string> = {
  BASIC: '🟢 기초',
  NORMAL: '🔵 심화',
  ADVANCED: '🟣 고급',
  MOONPKM: '🌙 MoonPKM',
}

interface VimTutorProps {
  isOpen: boolean
  onClose: () => void
}

export default function VimTutor({ isOpen, onClose }: VimTutorProps) {
  const [currentDay, setCurrentDay] = useState(1)
  const [shownCmd, setShownCmd] = useState(0)
  const [showChallenge, setShowChallenge] = useState(false)
  const [completedDays, setCompletedDays] = useState<Set<number>>(new Set())
  const [typing, setTyping] = useState('')
  const animRef = useRef<NodeJS.Timeout | null>(null)

  const lesson = VIM_LESSONS.find(l => l.day === currentDay) || VIM_LESSONS[0]
  const totalLessons = VIM_LESSONS.length
  const progress = Math.round((completedDays.size / totalLessons) * 100)

  // 명령어 순차 애니메이션
  useEffect(() => {
    if (!isOpen) return
    setShownCmd(0)
    setTyping('')
    setShowChallenge(false)
    let i = 0
    const interval = setInterval(() => {
      i++
      setShownCmd(i)
      if (i >= lesson.commands.length) clearInterval(interval)
    }, 500)
    return () => clearInterval(interval)
  }, [currentDay, isOpen, lesson.commands.length])

  // 타이핑 애니메이션 (팁 텍스트)
  useEffect(() => {
    if (!isOpen) return
    let i = 0
    const full = lesson.tip
    if (animRef.current) clearInterval(animRef.current)
    const timer = setInterval(() => {
      if (i <= full.length) {
        setTyping(full.slice(0, i))
        i++
      } else {
        clearInterval(timer)
      }
    }, 30)
    animRef.current = timer
    return () => clearInterval(timer)
  }, [currentDay, isOpen, lesson.tip])

  const markComplete = () => {
    setCompletedDays(prev => new Set(prev).add(currentDay))
    if (currentDay < totalLessons) setCurrentDay(d => d + 1)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="w-[680px] max-h-[90vh] bg-[#1a1d23] rounded-2xl border border-[#3a3f4b] shadow-2xl flex flex-col overflow-hidden">
        
        {/* 헤더 */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#3a3f4b] bg-[#21252b]">
          <span className="text-2xl">🎯</span>
          <div className="flex-1">
            <div className="text-[#e6e6e6] font-bold text-sm">VimTutor — Day {lesson.day}</div>
            <div className="text-[#5c6370] text-xs">{lesson.title}</div>
          </div>
          
          {/* 프로그레스 바 */}
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-[#2c313a] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: LEVEL_COLORS[lesson.category] }}
              />
            </div>
            <span className="text-[10px] text-[#5c6370]">{progress}%</span>
          </div>
          
          <button onClick={onClose} className="text-[#5c6370] hover:text-[#abb2bf] text-lg leading-none">✕</button>
        </div>

        {/* 레벨 배지 */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-[#3a3f4b]">
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded"
            style={{ background: LEVEL_COLORS[lesson.category] + '33', color: LEVEL_COLORS[lesson.category] }}
          >
            {LEVEL_LABELS[lesson.category]}
          </span>
          <span className="text-[#5c6370] text-xs">미션: {lesson.mission}</span>
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          
          {/* 명령어 카드 (순차 애니메이션) */}
          <div>
            <div className="text-[#5c6370] text-xs mb-3 uppercase tracking-wider">오늘의 명령어</div>
            <div className="grid grid-cols-1 gap-2">
              {lesson.commands.map((cmd, i) => (
                <div
                  key={cmd.key}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-300 ${
                    i < shownCmd
                      ? 'opacity-100 translate-x-0'
                      : 'opacity-0 translate-x-4'
                  }`}
                  style={{
                    background: cmd.color + '11',
                    borderColor: i < shownCmd ? cmd.color + '44' : 'transparent',
                  }}
                >
                  <kbd
                    className="font-mono text-sm font-bold px-3 py-1.5 rounded-md min-w-[80px] text-center"
                    style={{ background: cmd.color + '22', color: cmd.color, border: `1px solid ${cmd.color}44` }}
                  >
                    {cmd.key}
                  </kbd>
                  <span className="text-[#abb2bf] text-sm flex-1">{cmd.desc}</span>
                  {i < shownCmd && (
                    <span className="text-[10px] animate-pulse" style={{ color: cmd.color }}>✓</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 타이핑 팁 */}
          {typing && (
            <div className="bg-[#2c313a] rounded-lg px-4 py-3 border border-[#3a3f4b]">
              <div className="text-[#5c6370] text-[10px] mb-1.5 uppercase tracking-wider">💡 Tip</div>
              <p className="text-[#98c379] text-sm font-mono">
                {typing}
                <span className="animate-pulse text-[#7c9ef8]">|</span>
              </p>
            </div>
          )}

          {/* 오늘의 챌린지 */}
          {shownCmd >= lesson.commands.length && (
            <div
              className="bg-[#2c313a] rounded-lg border border-[#3a3f4b] overflow-hidden cursor-pointer"
              onClick={() => setShowChallenge(!showChallenge)}
            >
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span>🎯</span>
                  <span className="text-[#e6e6e6] text-sm font-medium">오늘의 챌린지</span>
                </div>
                <span className="text-[#5c6370] text-xs">{showChallenge ? '▲' : '▼'}</span>
              </div>
              {showChallenge && (
                <div className="px-4 pb-4 text-[#abb2bf] text-sm border-t border-[#3a3f4b] pt-3">
                  {lesson.challenge}
                </div>
              )}
            </div>
          )}

          {/* 레슨 네비게이션 */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {VIM_LESSONS.map(l => (
              <button
                key={l.day}
                onClick={() => setCurrentDay(l.day)}
                className={`shrink-0 w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                  l.day === currentDay
                    ? 'text-white ring-2'
                    : completedDays.has(l.day)
                    ? 'text-white opacity-70'
                    : 'text-[#5c6370] bg-[#2c313a] hover:bg-[#3a3f4b]'
                }`}
                style={
                  l.day === currentDay || completedDays.has(l.day)
                    ? { background: LEVEL_COLORS[l.category], outline: `2px solid ${LEVEL_COLORS[l.category]}` }
                    : {}
                }
                title={`Day ${l.day}: ${l.title}`}
              >
                {completedDays.has(l.day) ? '✓' : l.day}
              </button>
            ))}
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-[#3a3f4b] bg-[#21252b]">
          <button
            onClick={() => setCurrentDay(d => Math.max(1, d - 1))}
            className="text-[#5c6370] text-sm hover:text-[#abb2bf] transition-colors"
          >
            ← 이전
          </button>
          <button
            onClick={markComplete}
            className="px-4 py-1.5 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
            style={{ background: LEVEL_COLORS[lesson.category] }}
          >
            {completedDays.has(currentDay) ? '완료됨 ✓' : '완료! 다음으로 →'}
          </button>
          <button
            onClick={() => setCurrentDay(d => Math.min(totalLessons, d + 1))}
            className="text-[#5c6370] text-sm hover:text-[#abb2bf] transition-colors"
          >
            다음 →
          </button>
        </div>
      </div>
    </div>
  )
}
