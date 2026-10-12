// xl:note 第 1241 轮的守卫用例（口径 1.1）：**每一个「装语句的体」都必须在
// `text-common-util.xl.md` 的 `IsStatementList` 白名单里**，否则体里那些「名字 + 冒号」
// 就不是标签、裸块也会被当成对象字面量。
//
// 这一份钉的是第 1236 轮登记的那一格（`if` / `else` 的体）连同同一片探针量出的第二次
// （`static` 块）：两处都是 `IsStatementList` 漏登记、`IsLabeledStatement` 判否，
// 于是体里那条 `b: 1` 被一条 `ExpressionStatement` 整段装走。
//
// **分界线是「一行写完 + 末尾没有分号」**：带分号或换行的同一形状会先在解析期收一条
// `Statement` 壳（壳在白名单里）⇒ 碰巧对。所以这一份里的每一行都写成一行、末尾不带分号。
//
// 对照档（`while` / `for` / 函数体的体）一直就是对的，一起写进来当反向哨兵：
// 少了它们，「只修 `if` 那一格」与「白名单整体对」这两种状态分不开。
// xl:round 1241
// xl:end
declare const a: any, b: any, g: any;

if (a) { } else { b: 1 }
if (a) { b: 1 }
if (a) { } else if (b) { b: 1 }
class C { static { b: 1 } }
class D { static { g() } }
while (a) { b: 1 }
for (;;) { b: 1 }
function f() { b: 1 }
