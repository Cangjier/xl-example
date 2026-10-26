// 裸 yield / await 的上下文判据守卫：generator 里的 yield、async 里的 await 仍是节点；
// 其它上下文（脚本顶层/普通函数）TS 给 Identifier。一行一用例，多行形用行内 \n。
function* g1() { yield 1; }
function* g2() { yield; }
function g3() { yield g(); }
const v = yield;
function f1() { return (yield); }
async function a1() { await 1; }
function a2() { await g(); }
await;
