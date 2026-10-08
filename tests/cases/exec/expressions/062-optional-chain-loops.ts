// xl:title 可选链在循环与调用实参位上
// xl:round 330
// xl:judge stdout
// xl:end

const rows: { name?: string; tags?: string[] }[] = [{ name: "a", tags: ["x"] }, {}, { name: "c" }];
for (const row of rows) {
  console.log(row.name ?? "-", row.tags?.length ?? 0);
}
const box: { get?(): number } = {};
console.log(box.get?.() ?? -1, box.get?.());
