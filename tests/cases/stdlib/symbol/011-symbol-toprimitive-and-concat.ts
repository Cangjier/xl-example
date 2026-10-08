// xl:title Symbol.toPrimitive 的三种提示与符号拼接抛错
// xl:judge stdout
// xl:end

const o = { [Symbol.toPrimitive](hint: string) { return hint === "number" ? 1 : hint === "string" ? "S" : "default"; } };
console.log(o as any as number + 1, `${o}`, String(o));
try { console.log("x" + (Symbol("s") as any)); } catch (e: any) { console.log(e.name); }
