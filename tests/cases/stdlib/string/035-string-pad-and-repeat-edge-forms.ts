// xl:title padStart / padEnd / repeat 的截断、负数与零次
// xl:judge stdout
// xl:end

console.log("5".padStart(3, "0"), "5".padEnd(3, "0"), "abc".padStart(2, "0"));
console.log("5".padStart(5, "ab"), "5".padEnd(4));
console.log("ab".repeat(3), "ab".repeat(0), "".repeat(3), "a".repeat(2.9).length);
try { "a".repeat(-1); } catch (e: any) { console.log(e.name); }
