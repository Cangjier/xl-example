// xl:title 端到端：一张对齐的文本报表（补齐、截断、汇总）
// xl:round 323
// xl:judge stdout
// xl:end

type Row = { name: string; qty: number; price: number };
const rows: Row[] = [
  { name: "widget", qty: 3, price: 2.5 },
  { name: "a-very-long-name", qty: 1, price: 10 },
  { name: "gizmo", qty: 12, price: 0.75 },
];
const pad = (s: string, n: number) => (s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length));
const num = (s: string, n: number) => " ".repeat(Math.max(0, n - s.length)) + s;
console.log(pad("name", 18) + num("qty", 5) + num("total", 9));
for (const r of rows) console.log(pad(r.name, 18) + num(String(r.qty), 5) + num((r.qty * r.price).toFixed(2), 9));
const total = rows.reduce((s, r) => s + r.qty * r.price, 0);
console.log(pad("TOTAL", 18) + num("", 5) + num(total.toFixed(2), 9));
