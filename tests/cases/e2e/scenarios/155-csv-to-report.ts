// xl:title CSV 到报表：解析、分组、格式化输出
// xl:round 371
// xl:judge stdout
// xl:end
const raw = [
  "region,product,units,price",
  "north,widget,10,2.5",
  "north,gadget,4,10",
  "south,widget,7,2.5",
  "south,gadget,1,10",
  "east,widget,3,2.5",
].join("\n");
type Sale = { region: string; product: string; units: number; price: number };
const lines = raw.split("\n");
const header = lines[0].split(",");
const sales: Sale[] = [];
for (const line of lines.slice(1)) {
  const cells = line.split(",");
  const row: Record<string, string> = {};
  header.forEach((h, i) => { row[h] = cells[i]; });
  sales.push({ region: row.region, product: row.product, units: Number(row.units), price: Number(row.price) });
}
const revenue = (s: Sale): number => s.units * s.price;
let total = 0;
const byRegion = new Map<string, number>();
const byProduct = new Map<string, number>();
for (const s of sales) {
  const r = revenue(s);
  total += r;
  byRegion.set(s.region, (byRegion.get(s.region) ?? 0) + r);
  byProduct.set(s.product, (byProduct.get(s.product) ?? 0) + r);
}
const width = Math.max(...[...byRegion.keys()].map((k) => k.length), 6);
console.log("region".padEnd(width) + " revenue  share");
for (const [region, value] of [...byRegion.entries()].sort((a, b) => b[1] - a[1])) {
  const share = ((value / total) * 100).toFixed(1) + "%";
  console.log(region.padEnd(width) + " " + value.toFixed(2).padStart(7) + "  " + share);
}
console.log("total".padEnd(width) + " " + total.toFixed(2).padStart(7));
for (const [product, value] of [...byProduct.entries()].sort()) console.log(product, value.toFixed(2));
console.log(sales.length, sales.filter((s) => s.units > 4).length, (total / sales.length).toFixed(2));
