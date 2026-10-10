// xl:note `yield` / `await` 在**生成器 / async 之外**是普通标识符（第 955 轮片段普查量出）：
// `const v = yield;` / `function f() { return (yield); }` / `const w = await;` 这三档里
// TS 那边都是 `Identifier`（脚本语境的 `yield` 是**普通名字**、非 async 函数里的 `await` 同理），
// 而产物一律投成 `YieldExpression` / `AwaitKeyword`（缺 `Identifier` 1、多 1）。
// **根因是「上下文」**：`projectExpression` 那一格认的是「这一格是不是 `yield` / `await` 这个词」
// （第 130 / 739 轮为「同一个词的两态」写的判据），而**要问的是「我在不在生成器 / async 里」**
// ——本仓到现在没有那个上下文（token 层也没有：`const await = 1;` 那种**名字位**是好的，
// 坏的全在**表达式位**）。
// **与括号无关**：`const v = yield;` 与 `const v = (yield);` 同形（第 954 轮收掉的那条是括号，
// 这一条不是）；`{ yield: 1 }` 那种**属性名**也是好的。
// **下一轮的入手处**：给投影（以及 token 层那一趟）一个「当前函数是不是生成器 / async」的上下文
// ——**别在这一格写第二个近似判据**（第 130 / 739 轮已经写明「同一个词两态都要认」，
// 缺的是第三态：**不在上下文里**）。这一族一旦收，两个词、九条排版一起绿。
// xl:known-gap yield / await 在生成器 / async 之外是普通标识符，本仓一律投成 YieldExpression / AwaitKeyword（缺 Identifier 1、多 1）
// xl:end
const v = yield;
function f() { return (yield); }
const w = await;
function g() { return await; }
