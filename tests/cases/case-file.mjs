// 用例文件的**文件头指令**解析（两条判据共用一份，避免两处词表漂掉）。
//
// 一条用例 = 一个 `.ts` 文件，文件头是若干行 `// xl:<键> <值>`，**以 `// xl:end` 收尾**，
// 后面才是正文。终止行是**必须的**：`exec` 里有一批用例的正文自己就带 `// xl:note` 注释
// （它们整份抄自 token 语料），没有终止行时那些注释会被读成覆盖层的指令——同名不同义。
//
// ## 词表（两套，按判据分）
//
// | 键 | 属于 | 含义 |
// | --- | --- | --- |
// | `xl:note` | token | 这条在测什么的**一句话**（`xl:title` 的旧名，等价） |
// | `xl:title` | 两套 | 同上（覆盖层的规范名） |
// | `xl:expect` | token | 产物里**必须出现**的标签，`Tag` 是「至少一个」、`Tag:N` 是「正好 N 个」 |
// | `xl:absent` | token | 产物里**一个都不许有**的标签 |
// | `xl:known-gap` | token | 这条是**已知缺口**（差额走另一条账，见 `ts-ast.mjs` 的 `knownGapCheck`） |
// | `xl:ts-invalid` | token | 故意写非法 TS（默认必须合法） |
// | `xl:bom` | token | 这份文件**显式带 BOM**（默认不许带） |
// | `xl:want` | 覆盖层 | 台账：`pass`（默认）/ `blocked` / `differ` |
// | `xl:skip` | 覆盖层 | 口径外（不进分母），值是人话 |
// | `xl:why` | 覆盖层 | `want` 不是 pass、或 `skip` 时的**根因**（人写） |
// | `xl:judge` | 覆盖层 | 裁判怎么跑：`stdout`（默认，比 stdout + 退出码） |
// | `xl:args` | 覆盖层 | 裁判的额外实参（`--experimental-transform-types` 那一档） |
// | `xl:may-fail` | 覆盖层 | 这一条本来就是「两边都非零退出」，退出码仍要对上 |
// | `xl:weight` | 覆盖层 | 这一条在覆盖度里的权重（默认 1） |
// | `xl:round` | 覆盖层 | 哪一轮收编进来的（只作历史线索，不参与判定） |
// | `xl:end` | 两套 | 头结束，后面是正文 |
//
// **没写在表里的键一律报错**：写错键名是静默的（值被忽略、用例照跑），所以当场拦。

import fs from "node:fs";

/** 指令键 → 属于哪一套（也用来判断哪些键合法）。 */
export const DIRECTIVE_OWNER = new Map([
  ["note", "token"],
  ["title", "both"],
  ["expect", "token"],
  ["absent", "token"],
  ["known-gap", "token"],
  ["ts-invalid", "token"],
  ["bom", "token"],
  ["want", "coverage"],
  ["skip", "coverage"],
  ["why", "coverage"],
  ["judge", "coverage"],
  ["args", "coverage"],
  ["may-fail", "coverage"],
  ["weight", "coverage"],
  ["round", "coverage"],
  ["end", "both"],
]);

export const DIRECTIVE_KEYS = [...DIRECTIVE_OWNER.keys()];

/**
 * 文件头指令的形状：一条一个 `{ key, value, line }`（行号从 1 起）。
 *
 * ## 头部的文法（这条规则是被真实语料逼出来的，改它之前先读这段）
 *
 * ```
 * <前导>          任意行：BOM 单独一行、样例说明那几行注释 —— 原样进正文
 * <指令块>        第一条 `// xl:<键>` 起，到 `// xl:end` / 空行 / 第一行真代码为止
 * // xl:end      覆盖层的终止行（token 语料没有；正文第一行非注释非空行即结束）
 * <正文>          一个字节都不动
 * ```
 *
 * **指令块内部允许「续行」**：`// xl:note` 的值本来就是**多行**的——
 * 正文语料里满是这样写的：
 *
 * ```
 * // xl:note `accessor` 是修饰符而不是名字：`accessor x = 1` 里 `x` 才是字段名，
 * // 产物不能出现「名字为 accessor 的成员」，也不能多出一层 `<Statement>` 包住成员。
 * // xl:expect Field
 * ```
 *
 * 第 2 行是**第 1 行那个值的续行**（不带 `xl:`），而 `xl:expect` 跟在它后面**仍然是指令**。
 * 旧解析器逐行扫全文，所以 `xl:expect` 收得到；把「非指令行」当结束的写法会当场丢掉它——
 * 实测**丢掉 92 份用例的期望**（`cases:tags` 的断言从 4768 掉到 4441）。
 *
 * **两条口径与旧解析器逐位等价**（`tmp/refactor/legacy-directives.mjs` 逐文件对拍过）：
 *   1. **键只在文件头那一段第一次出现时生效**。`xl:note` 写两遍时旧解析器是后者覆盖前者
 *      （`directives.note = value`），这里取**第一条**；92 份里 `xl:note` 的两遍都是同一句话，
 *      两种取法给出同一个值。
 *   2. **`xl:note` 的值只取第一行**（旧解析器一行一条指令）。续行进 `noteMore`，
 *      不参与判定——想读全文的调用方可以拿它。
 */
export function parseDirectives(source) {
  // **先把行尾归一成 LF**（第 685 轮实测的坑）：按 `\n` 切出来的行尾会留一个 `\r`，
  // 而 `^//\s*xl:(\S+)\s*(.*)$` 里的 `$` 在 `\r` **之前**不成立、`.` 也不吃 `\r`
  // ⇒ **整条 exec 失败、一条指令都收不到**（纯 LF 的文件正常，所以这个坑只在
  // 「盘上带 CRLF」的用例上现形：`lex-crlf` 那两份）。
  // 归一之后 `bodyStart` 的**行号**仍然对得上（只去掉了行尾那一个字符）。
  const lines = source.split("\n").map((l) => (l.endsWith("\r") ? l.slice(0, -1) : l));
  // 前导：跳过开头所有「不是指令、也不是终止行」的行（BOM / 说明注释 / 空行）。
  let start = 0;
  while (start < lines.length) {
    const line = lines[start];
    if (line.trim() === "") {
      start++;
      continue;
    }
    if (/^\/\/\s*xl:/.test(line)) break;
    start++;
  }

  const directives = [];
  const problems = [];
  let at = start;
  let terminated = false;
  let current = null;
  for (; at < lines.length; at++) {
    const line = lines[at];
    const m = /^\/\/\s*xl:(\S+)\s*(.*)$/.exec(line);
    if (m) {
      const [, key, value] = m;
      if (key === "end") {
        at++;
        terminated = true;
        break;
      }
      if (!DIRECTIVE_OWNER.has(key)) problems.push(`第 ${at + 1} 行：未知指令 xl:${key}`);
      current = { key, value: value.trim(), more: [], line: at + 1 };
      directives.push(current);
      continue;
    }
    if (line.trim() === "") {
      // 空行：**后面还有指令就继续，没有就在下一轮收尾**——两种都走这里，
      // 由「读到空行时往后看一行」决定，见下面那半段。
      let look = at + 1;
      while (look < lines.length && lines[look].trim() === "") look++;
      if (look < lines.length && /^\/\/\s*xl:/.test(lines[look])) continue;
      break;
    }
    if (/^\/\//.test(line)) {
      // 注释续行：属于上一条指令的值（旧解析器丢弃它；这里留着给人读）。
      if (current) current.more.push(line.replace(/^\/\/\s?/, "").trimEnd());
      continue;
    }
    break; // 第一行真代码：头部结束
  }
  return { directives, bodyStart: at, terminated, problems };
}

/** 一份用例文件读出来的东西：`{ source, body, directives, ...两套判据的字段 }`。 */
export function readCaseFile(filePath, category) {
  const source = fs.readFileSync(filePath, "utf8");
  const parsed = parseDirectives(source);
  const problems = [...parsed.problems];
  const lines = source.split("\n");
  const body = lines.slice(parsed.bodyStart).join("\n");
  const all = (key) => parsed.directives.filter((d) => d.key === key).map((d) => d.value);
  // **同名取最后一条**（第 685 轮）：旧解析器是 `directives.note = value`，
  // 也就是「后者覆盖前者」。语料里真有 10 份把 `xl:note` 写了两遍（一句短标题 +
  // 一段长说明），取第一条会**改变这 10 条的 note**——迁移不许改判定，所以照旧取最后一条。
  const one = (key) => all(key).at(-1);
  const has = (key) => parsed.directives.some((d) => d.key === key);

  // **落进正文的指令行只在「正文开头那段注释」里才算错位**（第 685 轮）。
  //
  // 为什么只查开头这一段：语料里有 92 份把「这条在测什么」写成**正文里的说明注释**
  // （`// xl:note …` 挂在代码后面），那是**正文**，不是指令——旧解析器逐行扫全文时
  // 它们也是一次都没生效过，语义没变。而真正的错位长另一个样子：
  // `token/declarations/decl-class-computed-field-then-template-method.ts` 把
  // 两行说明夹在 `xl:note` 与 `xl:ts-invalid` 中间，于是 `xl:ts-invalid` 静默失效
  // （旧解析器收得到它，新解析器收不到）——这一种必须报出来。
  // 两者的分界就是**位置**：错位的那一条紧跟在头部指令之后。
  const strays = [];
  for (let i = parsed.bodyStart; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") continue;
    const m = /^\/\/ xl:(\S+)/.exec(line);
    if (m) {
      // **只在「这个键头部一次都没出现过」时才算错位**：正文里把同一件事重说一遍
      // （`xl:note` 那种散文）语义没变，而 `xl:ts-invalid` / `xl:known-gap` 这种
      // **一次性开关**被隔断就是真的失效了。
      if (!has(m[1])) strays.push(i + 1);
      continue;
    }
    if (/^\/\//.test(line)) continue; // 说明注释，继续往上看
    break; // 碰到第一行真代码，止住
  }
  if (strays.length > 0) {
    problems.push(`指令行必须都在文件头（第 ${strays.slice(0, 5).join(" / ")} 行有落在正文里的 xl: 指令）——把它挪到头部指令块里`);
  }

  const directives = {
    // token 那一套
    expect: all("expect").flatMap((v) => v.split(",").map((s) => s.trim()).filter((s) => s !== "")),
    absent: all("absent").flatMap((v) => v.split(",").map((s) => s.trim()).filter((s) => s !== "")),
    note: one("note") ?? "",
    knownGap: one("known-gap") ?? "",
    tsInvalid: has("ts-invalid"),
    bom: has("bom"),
    // 覆盖层那一套
    title: one("title") ?? one("note") ?? "",
    round: Number(one("round") ?? 0) || 0,
    judge: one("judge") ?? "stdout",
    want: one("want") ?? "pass",
    skip: has("skip") ? (one("skip") === "" ? true : one("skip")) : null,
    why: one("why") ?? null,
    nodeArgs: (one("args") ?? "").split(/\s+/).filter((s) => s !== ""),
    nodeMayFail: has("may-fail"),
    weight: Number(one("weight") ?? 1) || 1,
  };

  // **两套字段的取值都要在表里**：写错的取值是静默的（当成 pass / 当成 stdout）。
  if (!["pass", "blocked", "differ"].includes(directives.want)) {
    problems.push(`xl:want 只能是 pass / blocked / differ，收到 «${directives.want}»`);
  }
  if (directives.judge !== "stdout") problems.push(`xl:judge 现在只认 stdout，收到 «${directives.judge}»`);
  if (directives.knownGap === "" && has("known-gap")) problems.push("xl:known-gap 后面要写一句话根因");
  // **终止行只对覆盖层强制**：token 用例的文件头只有 `xl:note` / `xl:expect` 那几行，
  // 判断「头到哪儿结束」本来就无歧义（正文第一行不是指令行就结束）；
  // 需要 `// xl:end` 的恰恰是覆盖层——它的正文可能**自己带 `// xl:` 注释**
  // （`exec` 里那 39 条抄自 token 语料的用例），没有终止行就会同名不同义。
  const isCoverage = ["want", "skip", "why", "judge", "args", "may-fail", "weight", "round", "title"].some((k) => has(k));
  if (isCoverage && !parsed.terminated) problems.push("覆盖层的用例文件头要以 // xl:end 收尾");

  return { source, body, directives, problems, filePath, category };
}
