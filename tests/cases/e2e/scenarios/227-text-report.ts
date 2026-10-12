// xl:title 完整程序：文本报表（split / padStart / join / 数值格式化）
// xl:round 9
// xl:judge stdout
// xl:end

const rows = [
  { item: "apple", qty: 3, price: 1.5 },
  { item: "banana", qty: 12, price: 0.25 },
  { item: "cherry", qty: 7, price: 3 },
];
let total = 0;
const lines: string[] = [];
for (const r of rows) {
  const sum = r.qty * r.price;
  total += sum;
  lines.push(r.item.padEnd(8, ".") + String(r.qty).padStart(4, " ") + sum.toFixed(2).padStart(8, " "));
}
lines.push("-".repeat(20));
lines.push("TOTAL".padEnd(8, ".") + total.toFixed(2).padStart(12, " "));
console.log(lines.join("\n"));
