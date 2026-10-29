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
| case.ast | `ts-ast-line` 快照；与当前输出一致/过期会直接标出来，过期时可以一键看「重算结果」 |
| case.md | `case.md` 原文；标题和目录都能跳到回放对应步，还能用解析器逐步复核夹具是否过期 |
| 对拍 | 单个用例跑 `run.mjs`；顶部「全部对拍」跑一次 `--all --list`，结果标回左侧列表 |

快捷键：`空格` 播放/暂停，`←` `→` 单步，`Home` `End` 首尾，`/` 搜索。
回放状态写进 URL（`#/case/success%2Fstatements%2Fbreak@7`），可以直接分享/刷新恢复。

## 逐字从哪来

- 有 `case.md`：**严格按快照回放**（徽章写「来自 case.md」），标题旁可复核它是否与解析器当前输出一致。
- 没有 `case.md`：用 `build/ts` 逐字符推进**实时算出来**（徽章写「解析器实时生成」），不写盘；
  状态栏会显示 `build/ts` 是否可用。想落成快照，点「生成 case.md」——它调用
  `typescript/tools/gen-case-docs.mjs` 的同一条路径，写回 `.md` 和 `.ast`（会覆盖同名文件，git 可回退）。
- `todo/` 里有些用例解析器会抛错，这时回放区会显示错误位置，源码和 AST 仍然能看。

`.ast` 缺失时按 `ts-ast-line` 现场计算；存在但与当前输出不一致时，徽章会标「过期」，
`case.ast` 页给出差异入口——这和 `run.mjs` 的 `stale-ast` 检查是同一件事。

## 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/index` | 用例清单（含源码，供前端搜索）、统计、类别树、`tts.md` / `index.md` 全文 |
| GET | `/api/case?id=` | 单个用例：源码、AST（夹具 + 重算）、`case.md` 与逐字步骤 |
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
