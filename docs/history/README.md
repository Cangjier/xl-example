# docs/history

**这里的文档不是说明书**：它们记录的是某一次重构当时怎么想的、踩了哪些坑。
重构已经落地，今天读它们不会得到「现在该怎么写」，只会得到「当时为什么这么写」。

| 文件 | 是什么 |
| --- | --- |
| [print-ast-migration.md](print-ast-migration.md) | 把中央投影表搬成逐 token 的 `PrintAst`（第 181–198 轮）的结果与搬迁手册 |
| [parse-guide-design.md](parse-guide-design.md) | 解析期 guide + 单元吃字符那套设计（第 398 轮）的判据与两条铁律 |

**当前该怎么写**看这几份：[README](../../README.md)（总览与判据）、
[ts-ast.md](../ts-ast.md)（第三个出口的规格）、[ast-json.md](../ast-json.md)（第二个出口的规格——**第 1016 轮起只活在库里**，命令行那条路删了）、
[runtime-architecture.md](../runtime-architecture.md)（执行层）。
逐轮的现场在 **git 历史**里。
