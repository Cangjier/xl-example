// xl:title 库存报表：Map 分组 + 排序 + 汇总
// xl:round 330
// xl:judge stdout
// xl:end

type Item = { sku: string; category: string; qty: number; unit: number };
const items: Item[] = [
  { sku: "a1", category: "tool", qty: 2, unit: 10 },
  { sku: "b1", category: "food", qty: 5, unit: 3 },
  { sku: "a2", category: "tool", qty: 1, unit: 25 },
  { sku: "b2", category: "food", qty: 4, unit: 2 },
  { sku: "c1", category: "toy", qty: 7, unit: 1 },
];
const byCategory = new Map<string, Item[]>();
for (const item of items) {
  const bucket = byCategory.get(item.category);
  if (bucket === undefined) byCategory.set(item.category, [item]);
  else bucket.push(item);
}
const report: { category: string; count: number; value: number }[] = [];
for (const [category, list] of byCategory) {
  let value = 0;
  for (const item of list) value = value + item.qty * item.unit;
  report.push({ category, count: list.length, value });
}
report.sort((a, b) => b.value - a.value);
for (const row of report) console.log(row.category, row.count, row.value);
