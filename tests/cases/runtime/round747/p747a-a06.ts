// xl:title `async` / `await`：三种实参与 thenable
// xl:round 747
// xl:judge stdout
// xl:end
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
