// xl:note 第 1242 轮的守卫用例（口径 1.1）：**「冒号后面那一格」只要是一条语句的开头，
// 这一对就是标签**——包括字面量与一元前缀开头的那几档。
//
// 这一份钉的是第 1241 轮登记、第 1242 轮收掉的那一族：`StatementStartsHere` 原来只认
// `Identifier`（数字 / 布尔在词法层就是它）与 `{` 括号，于是 `lbl: 'x'` / `lbl: (x)` /
// `lbl: [1]` / `lbl: -1` / `` lbl: `x` `` / `lbl: !x` 六档的标签收不出来。
//
// 三档一起钉：① 六种「不是 `Identifier` 的开头」；② 七个体宿主（顶层 / 块 / `if` 体 /
// `else` 体 / 循环体 / 函数体 / 箭头体）——第 1241 轮量过这一族**与体无关**；
// ③ 对照哨兵：同一批形状在**值位**（对象字面量属性）与**类型位**（变量标注 / 接口成员 /
// 形参）上**必须仍是类型标注**，在三元里**必须仍是三元**。
// xl:round 1242
// xl:end
declare const a: any, b: any, c: any, x: any;

lbl1: 'x';
lbl2: `x`;
lbl3: (x);
lbl4: [1];
lbl5: -1;
lbl6: !x;
while (a) { lbl7: 'x'; }
if (a) { } else { lbl8: 'x'; }
if (a) { lbl9: 'x'; }
for (;;) { lbl10: 'x'; }
function f() { lbl11: 'x'; }
const g = () => { lbl12: 'x'; };
{ lbl13: 'x'; }
const o = { k: 'x' };
let v: 'x' = 'x';
interface I { k: 'x' }
function h(p: 'x') { }
const r = a ? b : 'x';
switch (a) { case 1: 'x'; }
