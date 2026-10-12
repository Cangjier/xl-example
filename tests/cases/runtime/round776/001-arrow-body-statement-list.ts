// xl:title 箭头函数的体是**语句列表**：裸块与标签块
// xl:round 776
// xl:judge stdout
// xl:end
// 第 776 轮收掉的那一处根：`text-common-util.xl.md` 的 `IsStatementList` 少了
// **`LamdaBody`** 这一格 —— 箭头函数的体（`() => { … }`）与 `FunctionBody` / `MethodBody`
// 并列，`Data` 里装的同样是语句，可它不在白名单里 ⇒ `IsStatementStart` 给假 ⇒
// `JsonObjectCloseRule` 把**语句位置的 `{`** 收成对象字面量。三种排版、三个出口：
//   · 裸块语句 ⇒ `unimplemented: statement ObjectLiteralExpression`
//   · 标签块 ⇒ `unimplemented: object literal member ExpressionStatement`
//   · 当回调用时 ⇒ `name is not a local or a capture: <标签名>`
// 这一条把三种排版一起钉住，另一条（`r776a-02`）钉**值位那一半没被带偏**。
const show = (f: () => any): string => {
  try { return "ok:" + String(f()); } catch (e) { return "throw:" + ((e as any).constructor ? (e as any).constructor.name : "?"); }
};
console.log('01 箭头体里的裸块语句', show(() => { const f = () => { { let y = 2; return y; } }; return f(); }));
console.log('02 箭头体里的裸块：外层语句照旧', show(() => { const f = () => { let log = ""; { log += "a"; } log += "b"; return log; }; return f(); }));
console.log('03 箭头体里的标签块 + break', show(() => { const f = () => { let log = ""; blk: { log += "a"; break blk; log += "z"; } return log; }; return f(); }));
console.log('04 箭头体里的标签块：不 break 就落下去', show(() => { const f = () => { let log = ""; blk: { log += "a"; log += "b"; } log += "c"; return log; }; return f(); }));
console.log('05 标签块里再套一层标签块', show(() => { const f = () => { let log = ""; a: { log += "1"; b: { log += "2"; break a; log += "z"; } log += "y"; } return log; }; return f(); }));
console.log('06 箭头体里的块 + 函数声明', show(() => { const f = () => { { function inner() { return "i"; } return inner(); } }; return f(); }));
console.log('07 当回调用时（forEach）', show(() => { let got = ""; [1, 2].forEach(() => { w: { got += "w"; break w; } got += "-"; }); return got; }));
console.log('08 嵌套箭头（内层体里也有块）', show(() => { const f = () => { const g = () => { { return "g"; } }; return g(); }; return f(); }));
console.log('09 箭头体里标签挂在 for 上（不是花括号那一档）', show(() => { const f = () => { let log = ""; lbl: for (let i = 0; i < 3; i++) { if (i === 1) continue lbl; log += i; } return log; }; return f(); }));
console.log('10 箭头体里的 switch 分支块', show(() => { const f = () => { switch (1) { case 1: { return "one"; } default: { return "other"; } } }; return f(); }));
console.log('11 箭头体 + try / catch 里的块', show(() => { const f = () => { try { { throw new Error("x"); } } catch { return "caught"; } }; return f(); }));
console.log('12 箭头体 + 空块仍然好着（旧口径那一档）', show(() => { const f = () => { x: { } return "empty"; }; return f(); }));
console.log('13 声明位：函数体 / 方法体里的同形状（哨兵）', show(() => { function g() { blk: { return "fn"; } } return g(); }));
console.log('14 声明位：方法体里的同形状（哨兵）', show(() => { const o = { m() { blk: { return "method"; } } }; return o.m(); }));
console.log('15 类字段里的箭头函数（哨兵）', show(() => { class C { f = () => { blk: { return "field"; } }; } return new C().f(); }));
