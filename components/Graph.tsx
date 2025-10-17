import { useEffect, useState } from "react";
import ForceGraph2D, { GraphData, NodeObject, LinkObject } from "react-force-graph-2d";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type SentenceNode = {
  id: number;
  name: string;
  group: string;
  vector: number[];
};

type SentenceLink = {
  source: number;
  target: number;
  value: number;
};

export default function Graph() {
  const [nodes, setNodes] = useState<SentenceNode[]>([]);
  const [links, setLinks] = useState<SentenceLink[]>([]);

  function cosineSimilarity(vecA: number[], vecB: number[]) {
    if (!vecA || !vecB) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] ** 2;
      normB += vecB[i] ** 2;
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  useEffect(() => {
    async function fetchData() {
      const { data: sentences, error } = await supabase
        .from("sentences")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) return console.error(error);

      const nodesData: SentenceNode[] = sentences.map((s: any) => ({
        id: s.id,
        name: s.sentence,
        group: s.verb || "otros",
        vector: s.vector || [1, 0, 0],
      }));

      const linksData: SentenceLink[] = [];
      for (let i = 0; i < nodesData.length; i++) {
        for (let j = i + 1; j < nodesData.length; j++) {
          const sim = cosineSimilarity(nodesData[i].vector, nodesData[j].vector);
          if (sim > 0) linksData.push({ source: nodesData[i].id, target: nodesData[j].id, value: sim });
        }
      }

      setNodes(nodesData);
      setLinks(linksData);
    }

    fetchData();
  }, []);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ForceGraph2D
        graphData={{ nodes, links }}
        nodeLabel="name"
        nodeAutoColorBy="group"
        linkWidth={l => (l as any).value * 5}
      />
    </div>
  );
}
