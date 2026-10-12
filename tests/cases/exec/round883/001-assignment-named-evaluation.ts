// xl:title 简单赋值那一格也是命名位置（NamedEvaluation 的第四处 FunctionNameHint）
// xl:round 883
// xl:judge stdout
// xl:why 第 883 轮在 `typescript-exec/lowering.xl.md` 的 `LowerBinary` 那条 `=`
// xl:why 分支上补的第四处 `FunctionNameHint`——前两处是变量声明（`LowerVariable`，第 238 轮）
// xl:why 与形参默认值（`LowerParamDefault`，第 882 轮），判据都是同一个 `NamesFunctionValue`。
// xl:why 规范那一侧是 `AssignmentExpression : LeftHandSideExpression = AssignmentExpression`
// xl:why 的 NamedEvaluation：名字来自**左边那个标识符**。
// xl:why
// xl:why **反例不许被带偏**（第 4 / 5 行）：`o.m = function () {}` 与
// xl:why `arr[0] = function () {}` 在规范里**没有** NamedEvaluation，JS 给空串——
// xl:why 那两条走的是 `PropertyAccessExpression` / `ElementAccessExpression` 分支，
// xl:why 这一轮**一个字都没动**。
// xl:why **三元那一格也不取名**（第 7 行）：`t = flag ? f1 : f2` 里两个函数都是匿名的
// xl:why （那一问由 `NamesFunctionValue` 答）。
// xl:why **自己的名字优先**（第 6 行）：`w = function named() {}` 给 `"named"`、不是 `"w"`。
// xl:end
const show = (v: any): string => JSON.stringify(v);
let x: any;
x = function () { return 3; };
console.log("01", show(x.name));
let y: any;
y = () => 4;
console.log("02", show(y.name));
let z: any;
z = (function () { return 7; });
console.log("03", show(z.name));
const o: any = {};
o.m = function () { return 5; };
console.log("04", show(o.m.name));
const arr: any[] = [];
arr[0] = function () { return 6; };
console.log("05", show(arr[0].name));
let w: any;
w = function named() { return 8; };
console.log("06", show(w.name));
let t: any;
t = true ? function () { return 9; } : function () { return 10; };
console.log("07", show(t.name));
let q: any;
q = class {};
console.log("08", show(q.name));
function outer() { let s: any; s = function () { return 11; }; return s.name; }
console.log("09", show(outer()));
const obj: any = {};
obj.m = function named2() { return 12; };
console.log("10", show(obj.m.name));
