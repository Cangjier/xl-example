// xl:title 承诺与 async：allSettled / any / race、thenable、async 的返回值与抛出、finally 透传、微任务次序
// xl:round 788
// xl:judge stdout
// xl:end
// **按判定点并组（第 788 轮）**：吸收 `exec/round707` 里逐条一问的 10 条探针
// （`p707b-p01` … `p707b-p10`）。正文逐字搬进各自的 IIFE（微任务在**全部同步代码之后**
// 按登记次序跑，与原来一条一个文件时各自的那一趟等价）。
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

(() => {
  Promise.allSettled([Promise.resolve(1), Promise.reject("e")]).then((r) => {
    console.log(show(r.map((x) => x.status).join("|")));
  });
})();
(() => {
  Promise.any([Promise.reject("a"), Promise.reject("b")]).catch((e) => {
    console.log(show(e.constructor.name) + "," + show(e.errors.length));
  });
})();
(() => {
  Promise.race([Promise.resolve("fast"), new Promise(() => {})]).then((v) => console.log(show(v)));
})();
(() => {
  const t = { then(res) { res(7); } };
  console.log(show(Promise.resolve(t) instanceof Promise));
  Promise.resolve(t).then((v) => console.log(show(v)));
})();
(() => {
  async function f() { return 1; }
  console.log(show(f() instanceof Promise) + "," + show(typeof f().then));
})();
(() => {
  async function f() { console.log(show(await 3)); }
  f();
})();
(() => {
  async function f() { throw new Error("boom"); }
  f().catch((e) => console.log(show(e.message)));
})();
(() => {
  Promise.resolve(1).finally(() => 2).then((v) => console.log(show(v)));
  Promise.reject("e").finally(() => 2).catch((v) => console.log(show(v)));
})();
(() => {
  Promise.resolve(1).then((v) => v + 1).then((v) => console.log(show(v)));
})();
(() => {
  console.log("sync");
  Promise.resolve().then(() => console.log("micro"));
  console.log("end");
})();
