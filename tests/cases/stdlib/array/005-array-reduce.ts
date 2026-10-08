// xl:title Array.reduce：带初值 / 不带初值 / 空数组那一档
// xl:judge stdout
// xl:end

const xs = [1, 2, 3, 4];
console.log(xs.reduce((a, b) => a + b, 0), xs.reduce((a, b) => a + b));
console.log(["a", "b"].reduce((a, b) => a + b, ""));
try { [].reduce((a: any, b: any) => a + b); } catch (e: any) { console.log("empty:", e.name); }
