// xl:title 未接住的异常：`cause` 的传递与 `finally` 的次序
// xl:round 778
// xl:judge stdout
// xl:may-fail
// xl:end
// 第 778 轮第二普查面：**抛到顶层**那一档。这条用例**故意**让一个异常跑到顶层
// （`xl:may-fail`：两边退出码都非零，退出码仍要对得上、stdout 仍要逐字节相同——
// 这一档同时量着「抛出之前已经打出来的那些行有没有丢掉」）。
// 判据只取「能预期的那几行」：接得住的家族名、`cause` 链、`finally` 的次序——
// **栈文本本身不比**（两边路径与行号不可能一样，判据那一层早就把栈行滤掉了）。
//
// **函数体里的类声明**是另一条缺口（`heap object is not an environment`），
// 所以这一条不碰它——那一格在 `runtime/round778b/r778m-01` 单独登记着。
const show = (v: any): string => (v === null ? "null" : typeof v === "string" ? JSON.stringify(v) : String(v));
console.log('01 接得住的 TypeError', show((() => { try { return (null as any).x; } catch (e: any) { return e.constructor.name; } })()));
console.log('02 cause 链', show((() => { const inner = new Error("inner"); const outer: any = new Error("outer", { cause: inner }); return [outer.message, outer.cause.message, outer.cause === inner].join("|"); })()));
console.log('03 cause 不是 Error 也给', show((() => { const e: any = new Error("m", { cause: 42 }); return String(e.cause); })()));
console.log('04 finally 里该跑完再抛', show((() => { const log: string[] = []; try { try { throw new Error("a"); } finally { log.push("f1"); } } catch { log.push("c1"); } return log.join(","); })()));
console.log('05 finally 里的 return 吃掉异常', show((() => { const f = (): string => { try { throw new Error("a"); } finally { return "kept"; } }; return f(); })()));
console.log('06 catch 里再抛、外层接住', show((() => { try { try { throw new TypeError("t"); } catch (e: any) { throw new RangeError("r:" + e.message); } } catch (e: any) { return e.constructor.name + ":" + e.message; } })()));
console.log('07 抛非 Error 值', show((() => { try { throw "plain"; } catch (e: any) { return typeof e + ":" + e; } })()));
console.log('08 抛 undefined', show((() => { try { throw undefined; } catch (e: any) { return typeof e; } })()));
console.log('09 AggregateError 的 errors', show((() => { const e: any = new AggregateError([new Error("a"), new Error("b")], "many"); return [e.name, e.message, e.errors.length, e.errors[0].message].join("|"); })()));
console.log('10 异常穿过生成器', show((() => { function* g(): any { try { yield 1; } catch (e: any) { yield "caught:" + e.message; } } const it = g(); it.next(); return it.throw(new Error("in")).value; })()));
console.log('11 异常穿过 try/catch 里的 return', show((() => { const f = (): string => { try { throw new Error("a"); } catch { return "c"; } finally { void 0; } }; return f(); })()));
console.log('12 顶层抛出前的最后一行', show("这一行该打出来，下一行是接不住的"));
throw new Error("top-level boom");
