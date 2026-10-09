// xl:title 往生成器里 `throw`：体里的 `catch` / `finally` 都要跑（第 766 轮收掉的那一格）
// xl:round 766
// xl:judge stdout
// xl:note 第 766 轮收掉的那一格，`exec/iterators/probe700-i-t03` 是它的最小形态；
// xl:note 这条把**四种排版**一起钉住（都在挂起点注入同一个错误）：
// xl:note ① 体里的 `catch` 接得住；② `try/finally` 的收尾要跑、跑完再往外抛；
// xl:note ③ `catch` 与 `finally` 同时在场时的次序；④ **两层 `finally` 嵌套**时从里到外各跑一遍。
// xl:note 根子在 `DoThrow` 挑处理点的方式上：它原来取**这一摞里最靠后压进来的**那一条，
// xl:note 而挂起的帧恢复时压在别人上面、它的处理点是**更早**压进来的 ⇒
// xl:note 抛进去的异常落到了外层那个 `try` 上（体里的 `catch` / `finally` 一次都不跑）。
// xl:note 现在按**帧的层深**挑（详见根 README 第 766 轮与 `vm.xl.md` 的 `DoThrow`）。
// xl:end
function* caught() { try { yield 1; } catch (e) { console.log("  catch", (e as Error).message); } console.log("  after"); }
const a = caught();
a.next();
try { a.throw(new Error("boom")); } catch (e) { console.log("01 escaped"); }
console.log("01 done");
function* withFinally() { try { yield 1; } finally { console.log("  fin"); } console.log("  after"); }
const b = withFinally();
b.next();
try { b.throw(new Error("boom")); } catch (e) { console.log("02 escaped"); }
console.log("02 done");
function* both() { try { yield 1; } catch (e) { console.log("  inner catch"); } finally { console.log("  inner fin"); } }
const c = both();
c.next();
try { c.throw(new Error("boom")); } catch (e) { console.log("03 escaped"); }
console.log("03 done");
function* nested() {
  try {
    try { yield 1; } finally { console.log("  fin-inner"); }
  } finally {
    console.log("  fin-outer");
  }
}
const d = nested();
d.next();
try { d.throw(new Error("boom")); } catch (e) { console.log("04 escaped"); }
console.log("04 done");
