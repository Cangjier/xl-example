// xl:title 这一轮收掉的四格一起再走一遍（同批回归哨）
// xl:round 735
// xl:judge stdout
// xl:end
// 与上面几条一起进语料：**同一批改动**碰过的几格，
// 免得日后有人只修一半（`ArrayLikeLength` 与 `Array.from` 各有一份判据）。
console.log(Array.from({ length: 2.5, 0: "a", 1: "b", 2: "c" } as any).join(","));
console.log(Object.is(JSON.parse("-0"), -0), 1 / JSON.parse("-0"));
console.log(Object.is(JSON.parse("0"), -0));
try { new Map([1] as any); console.log("no-throw"); } catch (e: any) { console.log(e.constructor.name); }
console.log(JSON.stringify([...new Map([[1, 2, 3]] as any)]));
console.log(Array.from(new Set([1, 2])).join(","));
