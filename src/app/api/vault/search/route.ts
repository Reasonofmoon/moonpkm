import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'
import MiniSearch from 'minisearch'

const DEFAULT_VAULT = process.env.VAULT_PATH || 'C:\\Users\\sound\\Documents\\MyZettelkasten'

interface NoteDoc {
  id: string
  path: string
  title: string
  content: string
  tags: string[]
  type: string
  dikm: string
}

async function indexVault(vaultPath: string): Promise<NoteDoc[]> {
  const docs: NoteDoc[] = []
  
  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(fullPath)
      } else if (entry.name.endsWith('.md')) {
        try {
          const raw = await fs.readFile(fullPath, 'utf-8')
          const { data, content } = matter(raw)
          const relPath = path.relative(vaultPath, fullPath).replace(/\\/g, '/')
          docs.push({
            id: relPath,
            path: relPath,
            title: entry.name.replace('.md', ''),
            content: content.slice(0, 2000), // 검색용 앞부분만
            tags: data.tags || [],
            type: data.type || 'note',
            dikm: data.dikm || 'data',
          })
        } catch {
          // 읽기 실패 시 건너뜀
        }
      }
    }
  }

  await walk(vaultPath)
  return docs
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''
  const vaultPath = DEFAULT_VAULT

  if (!query) {
    return NextResponse.json({ results: [] })
  }

  try {
    const docs = await indexVault(vaultPath)
    
    const miniSearch = new MiniSearch<NoteDoc>({
      fields: ['title', 'content', 'tags'],
      storeFields: ['path', 'title', 'type', 'dikm', 'tags'],
      searchOptions: {
        boost: { title: 3, tags: 2 },
        fuzzy: 0.2,
        prefix: true,
      },
    })

    miniSearch.addAll(docs)
    const results = miniSearch.search(query).slice(0, 20)

    return NextResponse.json({ results, total: docs.length })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
