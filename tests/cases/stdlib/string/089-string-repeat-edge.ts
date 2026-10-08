// xl:title repeat：0 次、小数、负数抛错
// xl:round 371
// xl:judge stdout
// xl:end
console.log(JSON.stringify("ab".repeat(0)), "ab".repeat(1), "ab".repeat(3));
console.log("ab".repeat(2.9));
try { "ab".repeat(-1); } catch (e) { console.log((e as Error).name); }
console.log("ab".repeat(NaN).length);
