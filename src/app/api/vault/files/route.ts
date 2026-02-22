import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'

const DEFAULT_VAULT = process.env.VAULT_PATH || 'C:\\Users\\sound\\Documents\\MyZettelkasten'

function getVaultPath() {
  return DEFAULT_VAULT
}

// 재귀 파일 트리 생성
async function buildFileTree(dirPath: string, relativeTo: string): Promise<FileNode[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  const nodes: FileNode[] = []

  for (const entry of entries) {
    // 숨김 폴더/파일 제외
    if (entry.name.startsWith('.')) continue
    
    const fullPath = path.join(dirPath, entry.name)
    const relPath = path.relative(relativeTo, fullPath).replace(/\\/g, '/')

    if (entry.isDirectory()) {
      const children = await buildFileTree(fullPath, relativeTo)
      nodes.push({
        id: relPath,
        name: entry.name,
        type: 'directory',
        path: relPath,
        children,
      })
    } else if (entry.name.endsWith('.md')) {
      nodes.push({
        id: relPath,
        name: entry.name.replace('.md', ''),
        type: 'file',
        path: relPath,
      })
    }
  }

  // PARA 순서대로 정렬
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name, 'ko')
  })

  return nodes
}

export interface FileNode {
  id: string
  name: string
  type: 'file' | 'directory'
  path: string
  children?: FileNode[]
}

// GET /api/vault/files — 파일 트리 또는 파일 내용
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const filePath = searchParams.get('path')
  const vaultPath = getVaultPath()

  try {
    if (filePath) {
      // 특정 파일 읽기
      const fullPath = path.join(vaultPath, filePath)
      const content = await fs.readFile(fullPath, 'utf-8')
      const { data: frontmatter, content: body } = matter(content)
      
      // [[wikilink]] 파싱
      const wikilinkRegex = /\[\[([^\]]+)\]\]/g
      const links: string[] = []
      let match
      while ((match = wikilinkRegex.exec(body)) !== null) {
        links.push(match[1])
      }

      return NextResponse.json({ content, frontmatter, body, links })
    } else {
      // 전체 파일 트리
      const tree = await buildFileTree(vaultPath, vaultPath)
      return NextResponse.json({ tree, vaultPath })
    }
  } catch (error) {
    console.error('Vault read error:', error)
    return NextResponse.json({ error: 'Failed to read vault' }, { status: 500 })
  }
}

// POST /api/vault/files — 파일 저장
export async function POST(request: NextRequest) {
  const { path: filePath, content } = await request.json()
  const vaultPath = getVaultPath()

  try {
    const fullPath = path.join(vaultPath, filePath)
    // 디렉토리 없으면 생성
    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    await fs.writeFile(fullPath, content, 'utf-8')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Vault write error:', error)
    return NextResponse.json({ error: 'Failed to write file' }, { status: 500 })
  }
}

// PUT /api/vault/files — 새 파일 생성
export async function PUT(request: NextRequest) {
  const { path: filePath, template } = await request.json()
  const vaultPath = getVaultPath()

  const templates: Record<string, string> = {
    brain: `---
type: brain
dikm: information
tags: []
created: ${new Date().toISOString().split('T')[0]}
---

# ${filePath.split('/').pop()?.replace('.md', '')}

## Background (배경/맥락)


## Resonance (울림/감정)


## Amplify (왜 중요한가)


## Integrate (연결 노트)

- [[]]
- [[]]

## Navigate (다음 행동)

- [ ] 
`,
    evergreen: `---
type: evergreen
dikm: knowledge
tags: []
created: ${new Date().toISOString().split('T')[0]}
updated: ${new Date().toISOString().split('T')[0]}
---

# ${filePath.split('/').pop()?.replace('.md', '')}

> 핵심 주장 한 문장으로

## 개념

## 예시

## 연결

- [[]]

## 참고

`,
    moc: `---
type: moc
dikm: meaning
tags: []
created: ${new Date().toISOString().split('T')[0]}
---

# MOC: ${filePath.split('/').pop()?.replace('.md', '')}

## 목적


## 핵심 노트

- [[]]
- [[]]

## 산출물

- 

## 상태

- [ ] 초안
- [ ] 작성 중
- [ ] 완성
`,
    default: `---
type: note
dikm: data
tags: []
created: ${new Date().toISOString().split('T')[0]}
---

# ${filePath.split('/').pop()?.replace('.md', '')}

`,
  }

  try {
    const fullPath = path.join(vaultPath, filePath)
    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    const templateContent = templates[template || 'default']
    await fs.writeFile(fullPath, templateContent, 'utf-8')
    return NextResponse.json({ success: true, content: templateContent })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create file' }, { status: 500 })
  }
}
