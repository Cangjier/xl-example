// xl:title 分页：切片、边界页与越界页
// xl:round 331
// xl:judge stdout
// xl:end

const items: number[] = [];
for (let i = 1; i <= 23; i++) items.push(i);
function page(all: number[], size: number, index: number): number[] {
  const from = index * size;
  return all.slice(from, from + size);
}
for (const index of [0, 2, 3, 99]) {
  const got = page(items, 5, index);
  console.log(index, got.length, got.length > 0 ? got[0] + ".." + got[got.length - 1] : "-");
}
console.log(Math.ceil(items.length / 5));
