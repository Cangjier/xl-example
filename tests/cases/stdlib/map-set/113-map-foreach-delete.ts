// xl:title 遍历中删除 / 追加的可见性
// xl:round 691
// xl:judge stdout
// xl:end
const m: any = new Map<any, any>([["a", 1], ["b", 2], ["c", 3]]);
const seen: string[] = [];
m.forEach((v: any, k: any) => { seen.push(k); if (k === "a") { m.delete("c"); m.set("d", 4); } });
console.log(seen.join(","), m.size);
