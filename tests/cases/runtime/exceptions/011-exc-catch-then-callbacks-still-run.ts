// xl:title 接住一次异常之后，后面的回调**照旧完整跑完**（第 228 轮那条标志位的坑）
// xl:judge stdout
// xl:end

try { throw new Error("first"); } catch (e: any) { console.log("caught", e.message); }
console.log([1, 2, 3].map((v: number) => v + 1).join(","));
console.log([1, 2, 3].filter((v: number) => v > 1).join(","));
let n = 0;
try { [1, 2].forEach(() => { n += 1; if (n === 1) throw new Error("x"); }); } catch (e: any) { n += 10; }
console.log("n", n, [5, 6].every((v: number) => v > 0));
