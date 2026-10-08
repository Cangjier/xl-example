// xl:title 符号进字符串拼接 / 模板串要抛（而且要是 `TypeError`）
// xl:judge stdout
// xl:end

try { console.log("x" + (Symbol("s") as any)); } catch (e: any) { console.log("threw", e.name); }
try { console.log(`${Symbol("t") as any}`); } catch (e: any) { console.log("threw", e.name); }
