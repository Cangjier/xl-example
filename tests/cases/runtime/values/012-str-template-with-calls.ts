// xl:title 模板字面量里嵌调用 / 嵌套模板 / 三元
// xl:judge stdout
// xl:end

const xs = [1, 2];
console.log(`len=${xs.length} sum=${xs.reduce((a, b) => a + b, 0)} ${xs.length > 1 ? "many" : "one"}`);
console.log(`outer ${xs.map((v) => `<${v}>`).join("")} end`);
