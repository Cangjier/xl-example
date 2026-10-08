// xl:title 符号进字符串拼接：抛的是 `TypeError`（不是笼统的 `Error`）
// xl:judge stdout
// xl:end

// **这里不写模板串** ✗：模板串那一档已有判据 `symbol-concat-throws` ✓，
// 而在 `.mjs` 的模板串里嵌模板串要连着两层转义 ✓，读起来比它量的东西复杂 ✗。
try { console.log("x" + (Symbol("s") as any)); } catch (e: any) { console.log("plus", e.name, e instanceof TypeError); }
try { console.log("y" + String(Symbol("t") as any)); } catch (e: any) { console.log("str", e.name); }
console.log(typeof Symbol, String(Symbol("d")));
try { console.log(1 + (Symbol("n") as any)); } catch (e: any) { console.log("num", e.name); }
