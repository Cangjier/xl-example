// xl:title Object.freeze 的**数组元素**：push 在严格模式里该抛
// xl:judge stdout
// xl:end

const a: any = Object.freeze([1]);
try { a.push(2); console.log("pushed", a.length); } catch (e) { console.log("threw", (e as any).name); }
