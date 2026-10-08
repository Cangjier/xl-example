// xl:title 文本表格：列宽 + 对齐 + 数字右对齐
// xl:round 330
// xl:judge stdout
// xl:end

type Row = { name: string; qty: number; price: number };
const rows: Row[] = [
  { name: "apple", qty: 3, price: 1.5 },
  { name: "kiwi", qty: 12, price: 0.75 },
  { name: "watermelon", qty: 1, price: 6 },
];
function pad(text: string, width: number, right: boolean): string {
  let out = text;
  while (out.length < width) out = right ? " " + out : out + " ";
  return out;
}
const widths = [
  Math.max(...rows.map((r) => r.name.length), 4),
  Math.max(...rows.map((r) => String(r.qty).length), 3),
  Math.max(...rows.map((r) => r.price.toFixed(2).length), 5),
];
console.log(pad("name", widths[0], false) + " | " + pad("qty", widths[1], true) + " | " + pad("price", widths[2], true));
console.log("-".repeat(widths[0] + widths[1] + widths[2] + 6));
let total = 0;
for (const row of rows) {
  total = total + row.qty * row.price;
  console.log(pad(row.name, widths[0], false) + " | " + pad(String(row.qty), widths[1], true)
    + " | " + pad(row.price.toFixed(2), widths[2], true));
}
console.log("total =", total.toFixed(2));
