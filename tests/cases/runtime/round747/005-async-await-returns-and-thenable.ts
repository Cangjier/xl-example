// xl:title `async` / `await`：三种实参与 thenable
// xl:round 747
// xl:judge stdout
// xl:end
// 本文件是 `p747a-a06` 按命名规范改名（第 805 轮）：**正文一字未动**——
// 它量的是异步调度那一层，包一层壳就会换一个挂点（实测过），所以只改名、不并组。

async function f() { return 1; }
f().then((v) => console.log("ret", v, typeof v));
async function g() { return await 2; }
g().then((v) => console.log("await", v));
async function h() { return await Promise.resolve(3); }
h().then((v) => console.log("awaitP", v));
async function i() { const t = { then(res: any) { res(4); } }; return await t; }
i().then((v) => console.log("thenable", v));
async function j() { console.log("j1"); await null; console.log("j2"); }
console.log("a");
j();
console.log("b");
Promise.resolve().then(() => console.log("p"));
console.log("c");
