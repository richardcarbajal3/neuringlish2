import Graph from '../components/Graph'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import Link from 'next/link'

type Analysis = {
  text: string
  subject?: string
  verb?: string
  objects?: string
  adjectives?: string
  details?: string
} | null

export default function Home() {
  const [sentence, setSentence] = useState('')
  const [analysis, setAnalysis] = useState<Analysis>(null)
  const [savedMsg, setSavedMsg] = useState('')
  const [recent, setRecent] = useState<any[]>([])

  const runGrammarAnalysis = (text: string): Analysis => {
    if (!text || text.trim().length === 0) return null
    // Heurístico simple: subject = first word, verb = first verb-like word, objects = rest
    const words = text.trim().split(/\s+/)
    const subject = words[0] || ''
    // very naive verb detection: look for common verbs
    const verbs = ['is','are','am','was','were','go','goes','went','eat','eats','ate','feel','feels','have','has','had','do','does','did','say','says','said','be','being']
    let verb = ''
    for (const w of words) {
      if (verbs.includes(w.toLowerCase().replace(/[^a-z]/g,''))) { verb = w; break }
    }
    const objects = words.slice(verb ? words.indexOf(verb)+1 : 1).join(' ')
    const adjectives = words.filter(w=>w.endsWith('y')||w.endsWith('ful')||w.endsWith('ous')||w.endsWith('ive')).join(', ')
    return {
      text,
      subject,
      verb,
      objects,
      adjectives,
      details: `subject: ${subject} | verb: ${verb} | objects: ${objects} | adjectives: ${adjectives}`
    }
  }

  const handleAnalyze = () => {
    const res = runGrammarAnalysis(sentence)
    setAnalysis(res)
  }

  const addToNetwork = async () => {
    if (!analysis) return
    setSavedMsg('Guardando...')
    const { error } = await supabase
      .from('sentences')
      .insert([{
        sentence: analysis.text,
        analysis: analysis,
        subject: analysis.subject || null,
        verb: analysis.verb || null,
        objects: analysis.objects || null,
        adjectives: analysis.adjectives || null
      }])
    if (error) {
      console.error(error)
      setSavedMsg('Error guardando')
    } else {
      setSavedMsg('Guardado ✔️')
      setTimeout(()=>setSavedMsg(''),2000)
      loadRecent()
    }
  }

  const loadRecent = async () => {
    const { data, error } = await supabase
      .from('sentences')
      .select('*')
      .order('created_at',{ascending:false})
      .limit(20)
    if (!error && data) setRecent(data)
  }

  useEffect(()=>{ loadRecent() },[])

  return (
    <div style={{display:'flex', minHeight:'100vh'}}>
      <aside style={{width:320, padding:20, background:'#0b1220', color:'#dbeafe'}}>
        <h2>Semantic Network Explorer</h2>
        <p>Analyze a sentence</p>
        <textarea value={sentence} onChange={e=>setSentence(e.target.value)} rows={4} style={{width:'100%'}} placeholder="Enter a sentence..." />
        <button onClick={handleAnalyze} style={{marginTop:8}}>Analyze</button>
        {analysis && <>
          <div style={{marginTop:12, background:'#071029', padding:10, borderRadius:8}}>
            <p><b>Subject:</b> {analysis.subject}</p>
            <p><b>Verb:</b> {analysis.verb}</p>
            <p><b>Objects:</b> {analysis.objects}</p>
            <p><b>Adjectives:</b> {analysis.adjectives}</p>
          </div>
          <button onClick={addToNetwork} style={{marginTop:10, background:'#06b6d4', color:'#001219', padding:'8px 12px', borderRadius:8}}>Add to my network</button>
          <div style={{marginTop:8}}>{savedMsg}</div>
        </>}
        <div style={{marginTop:20}}>
          <h4>Recent</h4>
          <ul>
            {recent.map(r=>(
              <li key={r.id} style={{marginBottom:8}}>
                <strong>{r.sentence}</strong><br/>
                <small>{new Date(r.created_at).toLocaleString()}</small>
              </li>
            ))}
            {recent.length===0 && <li>No saved sentences.</li>}
          </ul>
        </div>
        <div style={{position:'absolute', bottom:20}}>
          <Link href="/graph"><a style={{color:'#06b6d4'}}>View semantic graph →</a></Link>
        </div>
      </aside>

      <main style={{flex:1, padding:24, borderLeft:'1px solid #555', display:'flex', flexDirection:'column'}}>
  <h1 style={{color:'#001219'}}>NeurEnglish — Graph MVP</h1>
  <p>Use the left panel to analyze and add sentences to your persistent semantic network.</p>
  <div style={{flex:1, marginTop:12}}>
    <Graph />
  </div>
</main>
      
    </div>
  )
}
