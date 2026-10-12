// xl:title CSV 解析与统计：`split` + `map` + `reduce` + `sort`
// xl:round 305
// xl:judge stdout
// xl:end

const csv = "name,score\nann,90\nbob,75\ncid,88\ndee,75";
const lines = csv.split("\n");
const header = lines[0].split(",");
const rows = lines.slice(1).map((line) => {
  const cells = line.split(",");
  const rec: Record<string, string | number> = {};
  header.forEach((h, i) => { rec[h] = i === 0 ? cells[i] : Number(cells[i]); });
  return rec as { name: string; score: number };
});
const scores = rows.map((r) => r.score);
console.log("n", rows.length, "max", Math.max(...scores), "min", Math.min(...scores));
console.log("avg", (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2));
console.log("pass", rows.filter((r) => r.score >= 80).map((r) => r.name).sort().join(","));
