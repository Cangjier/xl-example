// xl:title `Object.keys/values/entries` 收原始值：数字与布尔给空、null 与 undefined 抛
// xl:round 377
// xl:judge stdout
// xl:end
console.log("A", Object.keys("abc").join(","), JSON.stringify(Object.values("abc")));
console.log("B", JSON.stringify(Object.entries("ab")), Object.keys("").length);
console.log("C", Object.keys(5).length, Object.keys(true).length, Object.keys(5.5).length);
console.log("D", JSON.stringify(Object.values(7)), JSON.stringify(Object.entries(false)));
try { Object.keys(null as any); } catch (e) { console.log("E", (e as Error).name); }
try { Object.values(undefined as any); } catch (e) { console.log("F", (e as Error).name); }
try { Object.entries(null as any); } catch (e) { console.log("G", (e as Error).name); }
console.log("H", Object.keys({ 3: "c", 1: "a", "b": 2 }).join(","));
