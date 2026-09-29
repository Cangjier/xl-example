# xl-example

Cangjie 语法层的 xl 移植：`*.xl.md` 是唯一的事实来源。

## 构建链路

```
*.xl.md  --xl build-->  dist/**/*.ts  --tsc-->  build/**/*.js  --node-->  运行
```

```bash
npm install          # 只需要 @types/node 与 typescript
xl build             # 规范 → dist/**/*.ts（增量；无改动时 skipped）
npm run compile      # dist/**/*.ts → build/**/*.js（tsc，strict）
node build/cjcli.js samples/hello.cj
```

`npm run build` 就是上面前两步的串联（`xl build && tsc`）。

生成物：`dist/` 下 106 个 `.ts`、`build/` 下 106 个 `.js`。两者都在 `.gitignore` 里。

## cjcli

`cjcli.xl.md` → `dist/cjcli.ts` → `build/cjcli.js`。

**产物是自执行的**：`cjcli.xl.md` 末尾的 `# statement` 段把 `Main(process.argv.slice(2))` 原样写进产物，
所以 `node build/cjcli.js` 直接就是命令行工具——没有加载器、没有包装进程、没有第三方运行时。

```
cjcli <文件>              解析源文件，XML 打到标准输出
cjcli <文件> -o <文件>    解析后写入指定文件
cjcli                    从标准输入读源码
cjcli -h, --help         打印本说明
cjcli -v, --version      打印版本
```

退出码：`0` 成功；`1` 表示用法错误 / 读不到文件 / 解析抛错。

```bash
node build/cjcli.js samples/hello.cj
echo "let x = 1" | node build/cjcli.js
node build/cjcli.js samples/hello.cj -o out.xml
```

## 为什么还留了一个 `bin/cjcli.js`

整条链路上 xl 表达不了的只有 **shebang** 一行：

- `# statement` 能把执行语句写进产物，但插不进 shebang——产物前三行永远是 xl 的产物头，
  而 `tsc` 只认**文件第 1 行**的 `#!`（放别处直接 `error TS18026: '#!' can only be used at the start of a file`，
  而且 tsc 会把那行编译成 `!/usr/bin / env;` 这种垃圾）。
- `package.json` 的 `bin` 需要第 1 行是可执行解释器行，所以它只能落在 `bin/cjcli.js`：

  ```js
  #!/usr/bin/env node
  require("../build/cjcli.js");
  ```

  它不含任何逻辑——启动、参数解析、解析流程全部在 xl 产物里。

不需要 shebang 的话（例如只用 `node build/cjcli.js`），把 `bin` 直接指到 `build/cjcli.js` 也行。

## Linux/macOS 上的 `npm link`

`bin/cjcli.js` 依赖 shebang，检出时必须保持 LF；仓库根的 `.gitattributes` 已经用
`* text=auto eol=lf` 钉死。若出现 `bad interpreter`，先检查该文件是不是被转成了 CRLF。

## 已知问题（移植本体，不是入口引入的）

产物里的布尔属性没有引号：`<String IsSupportInterpolation=False …>`，
所以输出的 XML **不是**良构 XML（`False` 后面缺少 `'` 或 `"`，.NET 的 `XmlDocument.Load` 会在这里报错）。
原 C# 侧就是这个名字与这个形状，规范按「与基准逐字节一致」移植，入口只负责原样输出。
要修得改模板里属性值的拼装。
