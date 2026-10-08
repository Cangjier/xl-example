// xl:title `padStart` / `padEnd` / `repeat` 的边界
// xl:round 691
// xl:judge stdout
// xl:end
console.log("5".padStart(3, "0"), "5".padEnd(3, "ab"), "abc".padStart(2));
console.log("ab".repeat(0), "ab".repeat(2));
try { "a".repeat(-1); } catch (e: any) { console.log("repeat-neg", e.constructor.name); }
