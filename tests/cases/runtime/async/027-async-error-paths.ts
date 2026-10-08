// xl:title async 里的抛错 / 拒绝 / try-catch / finally
// xl:round 371
// xl:judge stdout
// xl:end
async function boom(): Promise<void> { throw new Error("boom"); }
async function reject(): Promise<void> { await Promise.reject(new Error("rej")); }
async function guarded(): Promise<string> {
  try { await boom(); return "no"; } catch (e) { return "caught:" + (e as Error).message; } finally { console.log("fin"); }
}
boom().catch((e) => console.log("1", (e as Error).message));
reject().catch((e) => console.log("2", (e as Error).message));
guarded().then((v) => console.log("3", v));
(async () => { try { await Promise.reject("raw"); } catch (e) { console.log("4", e); } })();
