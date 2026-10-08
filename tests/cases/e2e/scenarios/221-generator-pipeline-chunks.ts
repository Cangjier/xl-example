// xl:title 生成器管道：分块 → 过滤 → 聚合
// xl:round 8
// xl:judge stdout
// xl:end

function* chunks(list, size) {
  for (let i = 0; i < list.length; i += size) yield list.slice(i, i + size);
}
function* keep(iter, pred) {
  for (const item of iter) if (pred(item)) yield item;
}
function* map(iter, fn) {
  for (const item of iter) yield fn(item);
}
const data = Array.from({ length: 10 }, (_, i) => i);
const total = [...keep(map(chunks(data, 3), (c) => c.reduce((a, b) => a + b, 0)), (s) => s % 2 === 0)];
console.log(total.join(","));
