import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Link from 'next/link'

const ForceGraph = dynamic(() => import('react-force-graph').then(mod => mod.ForceGraph2D), { ssr: false })

type SentenceRow = {
  id: number
  sentence: string
  subject?: string
  verb?: string
  objects?: string
  adjectives?: string
}

export default function GraphPage() {
  const [data, setData] = useState<{nodes:any[], links:any[]}>({nodes:[], links:[]})
  const [sentences, setSentences] = useState<SentenceRow[]>([])

  useEffect(()=>{ load() },[])

  const load = async () => {
    const { data, error } = await supabase
      .from('sentences')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) { console.error(error); return }
    const rows = data || []
    setSentences(rows)
    buildGraph(rows)
  }

  const buildGraph = (rows:any[]) => {
    const nodes:any[] = []
    const links:any[] = []
    const seen = new Map()
    const add = (id:string, group:string, label:string) => {
      if (seen.has(id)) return
      seen.set(id, true)
      nodes.push({ id, label, group })
    }
    for (const r of rows) {
      const sid = `s:${r.id}`
      add(sid,'sentence', r.sentence)
      if (r.subject) { const nid = `subject:${r.subject.toLowerCase()}`; add(nid,'subject', r.subject); links.push({ source:sid, target:nid }) }
      if (r.verb) { const nid = `verb:${r.verb.toLowerCase()}`; add(nid,'verb', r.verb); links.push({ source:sid, target:nid }) }
      if (r.objects) { const nid = `obj:${(r.objects||'').toLowerCase().slice(0,80)}`; add(nid,'object', r.objects); links.push({ source:sid, target:nid }) }
      if (r.adjectives) {
        const parts = (r.adjectives||'').split(',').map((p:string)=>p.trim()).filter(Boolean)
        for (const p of parts) { const nid = `adj:${p.toLowerCase()}`; add(nid,'adjective', p); links.push({ source:sid, target:nid }) }
      }
    }
    setData({nodes, links})
  }

  return (
    <div style={{display:'flex', minHeight:'100vh'}}>
      <aside style={{width:320, padding:20, background:'#071029', color:'#dbeafe'}}>
        <h3>Semantic Network Explorer</h3>
        <p>Last {sentences.length} sentences</p>
        <ul>
          {sentences.map(s=>(<li key={s.id}><strong>{s.sentence}</strong><br/><small>{new Date(s.created_at).toLocaleString()}</small></li>))}
        </ul>
        <div style={{marginTop:10}}><Link href="/"><a style={{color:'#06b6d4'}}>← Back</a></Link></div>
      </aside>
      <main style={{flex:1, position:'relative', background:'#001219'}}>
        <ForceGraph
          graphData={data}
          nodeAutoColorBy="group"
          nodeLabel="label"
          linkWidth={1.5}
          linkDirectionalParticles={2}
          nodeCanvasObject={(node:any, ctx:any, globalScale:any) => {
            const label = node.label
            const fontSize = 12/globalScale
            ctx.font = `${fontSize}px Sans-Serif`
            const textWidth = ctx.measureText(label).width
            const bckgDimensions = [textWidth, fontSize].map(n => n + 6)
            ctx.fillStyle = 'rgba(0,0,0,0.6)'
            ctx.fillRect(node.x - bckgDimensions[0]/2, node.y - bckgDimensions[1]/2, bckgDimensions[0], bckgDimensions[1])
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillStyle = '#ffffff'
            ctx.fillText(label, node.x, node.y)
          }}
          width={1200}
          height={800}
        />
      </main>
    </div>
  )
}
