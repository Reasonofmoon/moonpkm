import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'

const DEFAULT_VAULT = process.env.VAULT_PATH || 'C:\\Users\\sound\\Documents\\MyZettelkasten'

interface GraphNode {
  id: string
  label: string
  type: string
  dikm: string
  path: string
}

interface GraphEdge {
  id: string
  source: string
  target: string
}

export async function GET(_request: NextRequest) {
  const vaultPath = DEFAULT_VAULT
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const pathIndex: Map<string, string> = new Map() // filename -> full path

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(fullPath)
      } else if (entry.name.endsWith('.md')) {
        const relPath = path.relative(vaultPath, fullPath).replace(/\\/g, '/')
        const title = entry.name.replace('.md', '')
        pathIndex.set(title.toLowerCase(), relPath)
        
        try {
          const raw = await fs.readFile(fullPath, 'utf-8')
          const { data } = matter(raw)
          nodes.push({
            id: relPath,
            label: title,
            type: data.type || 'note',
            dikm: data.dikm || 'data',
            path: relPath,
          })
        } catch {
          nodes.push({
            id: relPath,
            label: title,
            type: 'note',
            dikm: 'data',
            path: relPath,
          })
        }
      }
    }
  }

  async function buildEdges(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await buildEdges(fullPath)
      } else if (entry.name.endsWith('.md')) {
        try {
          const relPath = path.relative(vaultPath, fullPath).replace(/\\/g, '/')
          const raw = await fs.readFile(fullPath, 'utf-8')
          const { content } = matter(raw)
          const wikilinkRegex = /\[\[([^\]|#]+)(?:[|#][^\]]*)?]]/g
          let match
          while ((match = wikilinkRegex.exec(content)) !== null) {
            const targetName = match[1].trim().toLowerCase()
            const targetPath = pathIndex.get(targetName)
            if (targetPath && targetPath !== relPath) {
              edges.push({
                id: `${relPath}->${targetPath}`,
                source: relPath,
                target: targetPath,
              })
            }
          }
        } catch {
          // 파싱 실패 무시
        }
      }
    }
  }

  try {
    await walk(vaultPath)
    await buildEdges(vaultPath)

    // 중복 엣지 제거
    const uniqueEdges = edges.filter((e, i, arr) => 
      arr.findIndex(x => x.id === e.id) === i
    )

    return NextResponse.json({ nodes, edges: uniqueEdges })
  } catch (error) {
    console.error('Graph error:', error)
    return NextResponse.json({ error: 'Failed to build graph' }, { status: 500 })
  }
}
