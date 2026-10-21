// xl:note 声明/语句边界族修复的最小复现（一条一行；本子目录不是 ast-json 的构造枚举，只作人读回归样本）
// 覆盖：顶层 `abstract` / `declare` 与关键字之间换行 = 两条语句；`a.class` 换行裸块 = 表达式语句 + 块。
// 文件首语句 pos 含前导 trivia 由 tests/cases/token/statements/gap-sweep-*-async-01.ts 覆盖（需要真实换行）。
abstract
class A {}

declare
module "m" {}
