// xl:title `Set` 的迭代顺序与重复添加
// xl:round 691
// xl:judge stdout
// xl:end
const s: any = new Set<any>([3, 1, 3, 2]);
s.add(1); s.delete(3); s.add(3);
console.log([...s].join(","));
console.log([...s.entries()].map((e: any) => e.join(":")).join(","));
