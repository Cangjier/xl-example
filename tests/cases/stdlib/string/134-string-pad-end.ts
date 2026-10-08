// xl:title String.padEnd / padStart：截断、填充串与默认空格
// xl:round 676
// xl:judge stdout
// xl:end

console.log("ab".padEnd(5, "xy"), "ab".padEnd(1, "x"), "ab".padStart(5, "12"));
console.log("a".padEnd(4).length, "|" + "a".padStart(3) + "|");
