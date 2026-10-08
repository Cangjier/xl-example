// xl:title async 函数里 throw ⇒ 返回的承诺被拒绝
// xl:judge stdout
// xl:end

async function boom(): Promise<number> { throw new Error("async-fail"); }
boom().catch((e: any) => console.log("caught", e.message));
async function tryInside(): Promise<string> {
  try { await boom(); return "unreachable"; } catch (e: any) { return "handled:" + e.message; }
}
tryInside().then((v: string) => console.log(v));
