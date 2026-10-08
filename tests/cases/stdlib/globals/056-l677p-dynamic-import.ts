// xl:title 口径外：动态 import() 的返回形状（多文件加载不是 v1 目标）
// xl:judge stdout
// xl:want blocked
// xl:why 动态 `import()` 没进降级层：`unimplemented: expression ImportKeyword`。**要做**（它是模块加载的一档，不是另一套范式）
// xl:end

const p = import("node:path");
console.log(typeof p, typeof p.then);
const mod = await p;
console.log(typeof mod.join, mod.join("a", "b"));
