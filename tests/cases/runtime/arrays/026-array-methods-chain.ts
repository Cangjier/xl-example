// xl:title 数组方法链：map/filter/reduce/sort 一起用
// xl:round 323
// xl:judge stdout
// xl:end

const rows = [
  { name: "b", n: 2 },
  { name: "a", n: 3 },
  { name: "c", n: 1 },
];
const out = rows
  .filter((r) => r.n > 1)
  .sort((p, q) => q.n - p.n)
  .map((r) => r.name + ":" + r.n)
  .join("|");
console.log(out);
console.log(rows.reduce((sum, r) => sum + r.n, 0));
