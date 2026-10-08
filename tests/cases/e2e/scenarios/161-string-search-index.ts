// xl:title 倒排索引：建索引、查询、打分排序
// xl:round 371
// xl:judge stdout
// xl:end
const docs: { id: number; text: string }[] = [
  { id: 1, text: "the quick brown fox" },
  { id: 2, text: "the lazy dog sleeps" },
  { id: 3, text: "quick quick fox jumps" },
  { id: 4, text: "dog and fox are friends" },
];
function tokenize(text: string): string[] {
  return text.split(" ").filter((w) => w.length > 0);
}
const index = new Map<string, Map<number, number>>();
const lengths = new Map<number, number>();
for (const doc of docs) {
  const words = tokenize(doc.text);
  lengths.set(doc.id, words.length);
  for (const w of words) {
    const posting = index.get(w) ?? new Map<number, number>();
    posting.set(doc.id, (posting.get(doc.id) ?? 0) + 1);
    index.set(w, posting);
  }
}
console.log(index.size, [...index.get("fox")!.entries()].map(([id, n]) => id + ":" + n).join(","));
function search(query: string): { id: number; score: number }[] {
  const scores = new Map<number, number>();
  for (const term of tokenize(query)) {
    const posting = index.get(term);
    if (!posting) continue;
    const idf = Math.log(docs.length / posting.size);
    for (const [id, tf] of posting) {
      const norm = tf / (lengths.get(id) as number);
      scores.set(id, (scores.get(id) ?? 0) + tf * idf * (1 - norm));
    }
  }
  return [...scores.entries()].map(([id, score]) => ({ id, score })).sort((a, b) => b.score - a.score || a.id - b.id);
}
for (const q of ["fox", "quick fox", "dog", "missing"]) {
  console.log(q, "->", search(q).map((r) => r.id + "(" + r.score.toFixed(3) + ")").join(" "));
}
console.log(search("").length, tokenize("a b").length);
