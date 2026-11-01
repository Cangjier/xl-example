# tts 用例查看器

浏览 `typescript/cases/tts` 下全部用例的本地网页工具：一个窗口里看 `case.ts`、`case.ast`，
并按 `case.md` 的逐字符 token 树自动回放。

```bash
npm run tts:view            # → http://127.0.0.1:7799/
npm run tts:view -- --port 8080
node typescript/tools/cases-viewer/server.mjs --help
```

零依赖：只用 Node 内置模块 + 仓库里已有的 `typescript` 依赖，前端是三个静态文件（无构建）。

## 界面

| 区域 | 内容 |
| --- | --- |
| 左侧栏 | 466 个用例；按路径分组，可全文搜索（源码也算），按 success / todo / 有无 `case.md` / 有无 `case.ast` / 类别筛选 |
| 总览 | 覆盖率统计、按类别分布、有 `case.md` 的用例清单、快捷键说明 |
| 逐字回放 | 源码逐字符高亮 + 磁带式字符条 + 当前这一步的树（相对上一步新增的行标绿） |
| case.ts | 全文，带行号，可复制 |
| case.ast | `ts-ast-line` 快照；与当前输出一致/过期会直接标出来，过期时可以一键看「重算结果」；有 `case.infer` 时每行末尾接上它的 `created at` / `llm determined` 注记 |
| case.md | `case.md` 原文；标题和目录都能跳到回放对应步，还能用解析器逐步复核夹具是否过期 |
| 对拍 | 单个用例跑 `run.mjs`；顶部「全部对拍」跑一次 `--all --list`，结果标回左侧列表 |

快捷键：`空格` 播放/暂停，`←` `→` 单步，`Home` `End` 首尾，`/` 搜索。
回放状态写进 URL（`#/case/success%2Fstatements%2Fbreak@7`），可以直接分享/刷新恢复；
带 `@N` 的链接打开后**停在第 N 步**、不自动播放——「自动播放」只作用于从列表点开的用例。

## 逐字从哪来

- 有 `case.md`：**严格按快照回放**（徽章写「来自 case.md」），标题旁可复核它是否与解析器当前输出一致。
- 没有 `case.md`：用 `build/ts` 逐字符推进**实时算出来**（徽章写「解析器实时生成」），不写盘；
  状态栏会显示 `build/ts` 是否可用。想落成快照，点「生成 case.md」——它调用
  `typescript/tools/gen-case-docs.mjs` 的同一条路径，写回 `.md` 和 `.ast`（会覆盖同名文件，git 可回退）。
- `todo/` 里有些用例解析器会抛错，这时回放区会显示错误位置，源码和 AST 仍然能看。

`.ast` 缺失时按 `ts-ast-line` 现场计算；存在但与当前输出不一致时，徽章会标「过期」，
`case.ast` 页给出差异入口——这和 `run.mjs` 的 `stale-ast` 检查是同一件事。

## 改完用例不用重启

所有数据都是按请求现读的：用例清单、`.ts` / `.ast` / `.infer` / `.md` 每次重新读盘；
`build/ts` 派生的东西（逐字 token 树、`created at`）走 `typescript/tools/fresh-build.mjs`
的**子进程通道**——每次起一个新的 node 读磁盘上的当前实现。所以改完形状重新构建之后，
**刷新页面就是最新的**，不需要重启这个服务（以前它把 `build/ts` 的模块 require 在进程里，
重建之后只有重启才能换掉，这一点已修）。

左栏底部会显示 `build/ts` 的构建时间（`build/ts` 里最新那个文件的 mtime）：它变了，就说明
这次刷新看到的是新构建的产物。`/api/index` 里的 `build.stamp` 是整棵 `build/ts` 的指纹，
`build.newestMtime` 是那个时间，给外部脚本判断「构建变了」用。

## case.infer

`<名字>.infer` 与 `.ts` 并列，位置写在行末上下文的 `【字符:N】` 里：字符是该格上的字符
（空格写 `␣`、换行写 `⏎`、EOF 写 `␃`），N 是字符号。
`// "…【␣:5】…"` 表示两个位置相同；`// "…【1:8】…" -> llm "…【␣:5】…"` 表示 LLM 判定的位置不同。
`【1:8】` 是 shape token 建出这颗形状的那一格（`ShapeToken.CreatedAt` / 修订位置，没有就整行写 `?`），
箭头后的 `【␣:5】` 是 LLM 按语法逻辑判定的「最早能确定」位置；上下文是标记位置前后各至少 5 个字符。
开头是用 `ts` 围栏包住的用例源码与逐字编号。

存在时：左侧列表多一个蓝点、标题多一个 `case.infer` 徽章、`case.ast` 页按节点身份
（`kind + pos + src 起点`）把注记接到对应行末，并在每行右侧给出 **llm determined vs created at** 的结论——

| 标记 | 含义 |
| --- | --- |
| `✓` | 模型判定格 = shape token 创建格 |
| `late +N` | 模型判得比实际创建晚 N 格 |
| `early -N` | 模型判得比实际创建早 N 格 |
| `?` | `llm determined` 还是 `?`，没判定 |
| `created ?` | shape token 还没记 `CreatedAt`，无法对拍 |
| `never` | 树里始终没有这个节点 |
| `未增量` | `CreatedAt` 比 `CreatedRevisionAt` 晚：这颗形状没有在「能确定」的那一格增量建出来 |

`未增量` 是解析器侧的警告，与 LLM 判定无关：`CreatedRevisionAt` 记的是 end 时才拿得到的「本该建在这一格」
的位置，`CreatedAt` 是实际建出形状的格。`created at > revision` 就说明增量创建没有做到这一格；页头会
给出 `未增量 N` 的计数，行末也有单独的标记。头部 `TypeParameter` 现在在 `<` 那一格就建出来，所以不再产生
这条修订。

实际值由 `build/ts` 现算（`typescript/tools/shape-actual.mjs`，和 `case-infer --check` 共用同一份身份规则与
TS 区间别名表）。页头写「infer 注记 N 个，一致 M」，上方通知条给出 `late/early/unfilled/created ?/never` 的计数；
没有 `build/ts` 时只显示注记、不显示结论。没有 `.infer` 时界面与以前完全一样。

## 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/index` | 用例清单（含源码，供前端搜索）、统计、类别树、`tts.md` / `index.md` 全文 |
| GET | `/api/case?id=` | 单个用例：源码、AST（夹具 + 重算）、`case.infer` 全文、`case.md` 与逐字步骤 |
| GET | `/api/steps?id=` | 只从 `build/ts` 实时推进（用来复核 `case.md`） |
| POST | `/api/check` | `{ id }`，跑单个用例的 `run.mjs` |
| POST | `/api/check-all` | 跑 `run.mjs --all --list`，返回通过/失败清单 |
| POST | `/api/write-docs` | `{ id }`，生成并写入 `.md` / `.ast`（唯一会改仓库的接口） |

只读接口都不写盘；服务默认只监听 `127.0.0.1`，用例 id 必须存在才会被读取，不接受任意路径。

## 文件

```
typescript/tools/cases-viewer/
  server.mjs        零依赖 HTTP 服务 + 用例扫描 + 实时生成
  md-steps.mjs      case.md → 步骤序列
  public/index.html
  public/style.css
  public/app.js     回放、树着色、Markdown、路由
```

`typescript/tools/gen-case-docs.mjs` 顺手改成了可被 import：命令行行为不变，作为模块引用时只导出
`traceSteps` / `renderMarkdown`，不再执行 CLI。
