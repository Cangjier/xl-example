// xl:title 默认实参里的**函数表达式**：那一格被投成声明，整份文件进不来（账）
// xl:round 778
// xl:judge stdout
// xl:want blocked
// xl:why **量出来的形状**（第 778 轮普查当场红的那一行）：形参默认值位置的函数表达式
// xl:why `function (f: any = function () { return 16; }) { return f.name; }` 整份文件进不来
// xl:why （`unimplemented: expression FunctionDeclaration`）；Node 给 `"f"`。
// xl:why **分界不是「函数表达式」**：`const f = function () {}`、`(function () {})()` 那个 IIFE
// xl:why 与**当实参**的那一格都是好的（同目录 `r778a-01` 的 01…19 行钉着那一半）。
// xl:why 差的只是**形参默认值**这一格——那一支选分支时没置「表达式位」标记，
// xl:why 于是 `Function` 投成了声明（与第 775 轮那一族同一个病灶：**标记只看那一格自己**，
// xl:why 置宽了体里的声明也会被带偏）。
// xl:why **为什么不顺手收**：要先在投影层把「默认值位」那一格找出来再置标记，
// xl:why 而这一格今天连一条用例都没有——先如实登记，不猜。
// xl:end
// 第 802 轮改名（原 `exec/round778/r778g-01`）：`xl:want` / `xl:why` 与正文一字未动。
function withDefault(f: any = function () { return 16; }) { return f.name; }
console.log(withDefault());
