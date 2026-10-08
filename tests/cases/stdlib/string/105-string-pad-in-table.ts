// xl:title 用 padEnd / padStart 对齐一列文本
// xl:round 371
// xl:judge stdout
// xl:end
const rows = [["id", "name"], ["1", "alice"], ["22", "bob"]];
for (const [a, b] of rows) console.log(a.padStart(3) + " | " + b.padEnd(6) + "|");
console.log(rows.map((r) => r[1].padEnd(8, ".")).join(""));
console.log("header".padEnd(10, "="));
