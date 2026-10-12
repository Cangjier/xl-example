// xl:title 默认实参里的函数表达式：那一格也是**命名位置**（NamedEvaluation）
// xl:round 882
// xl:judge stdout
// xl:why 默认值那一格在第 778 轮普查时把整份文件带走（`unimplemented: expression
// xl:why FunctionDeclaration`，见 `exec/round778/001-default-param-function-expression-blocked`）
// xl:why ——两条根因：投影把那一格投成了**声明**（`lamda-parameter.xl.md` 的
// xl:why `PrintAst` 走的是「取一格当节点」，不置 `ctx.expressionPosition`），
// xl:why 而修好之后名字仍是空的（降级层 `LowerParamDefault` 没把它当命名位置）。
// xl:why 规范那一侧是 `Initializer : = AssignmentExpression` 的 NamedEvaluation：
// xl:why **名字来自被绑定的那个标识符**，所以 `a = function () {}` 给 `"a"`。
// xl:why **解构形参不给名**（那一支没有 NamedEvaluation），本用例把它当反例钉住。
// xl:end
function a(f: any = function () { return 1; }) { return f.name; }
const b = (f: any = function () { return 2; }) => f.name;
const c: any = { m(f: any = function () { return 3; }) { return f.name; } };
function d(f: any = class {}) { return f.name; }
function e(f: any = () => 4) { return f.name; }
function g(f: any = (function () { return 5; })) { return f.name; }
function h(f: any = function named() { return 6; }) { return f.name; }
function i({ q }: any = function () { return 7; }) { return q; }
console.log(a(), b(), c.m(), d(), e(), g(), h(), i());
