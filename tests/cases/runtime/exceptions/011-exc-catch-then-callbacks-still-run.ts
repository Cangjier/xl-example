// xl:title 接住一次异常之后，后面的回调**照旧完整跑完**（第 228 轮那条标志位的坑）
// xl:judge stdout
// xl:end
// **第 794 轮把同判定点的一条并了进来**：probe694-x24（回调里抛出去，
// 外面接住，`message` 逐字对上）。判定点只有一个：
// **接住一次之后，后面的回调照旧完整跑完；回调里抛的那一抛有出口**。
try { throw new Error("first"); } catch (e: any) { console.log("caught", e.message); }
console.log([1, 2, 3].map((v: number) => v + 1).join(","));
console.log([1, 2, 3].filter((v: number) => v > 1).join(","));
let n = 0;
try { [1, 2].forEach(() => { n += 1; if (n === 1) throw new Error("x"); }); } catch (e: any) { n += 10; }
console.log("n", n, [5, 6].every((v: number) => v > 0));
const show = (v: any): string => (v === null ? "null" : typeof v + ":" + String(v));
try { console.log("callback-throw:", show((function () { try { [1].forEach(() => { throw new Error("in"); }); } catch (e) { return e.message; } })())); }
catch (e: any) { console.log("callback-throw:", show("throw:" + (e && e.constructor ? e.constructor.name : "?"))); }
