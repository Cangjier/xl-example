// xl:title 完整程序：文本报表（split / Number / toFixed / padEnd）
// xl:round 676
// xl:judge stdout
// xl:end

const rows = ["alice:30", "bob:25", "carol:35"];
const names: string[] = [];
let total = 0;
for (const row of rows) {
  const parts = row.split(":");
  const n = Number(parts[1]);
  if (!Number.isFinite(n)) continue;
  names.push(parts[0].toUpperCase());
  total += n;
}
const avg = (total / rows.length).toFixed(2);
console.log(names.join(","), total, avg.padEnd(6, "0"));
