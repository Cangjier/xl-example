// 把 case.md（逐字符 token 树快照）解析成播放器要的步骤序列。
//
// case.md 的形状由 typescript/tools/gen-case-docs.mjs 的 renderMarkdown 决定：
//
//   # 预期 token 树（逐字）：`while (a) { break; }`
//
//   ```text
//   0 1 2 3 ...
//   w h i l e ...
//   ```
//
//   ## [char 0] `"w"`
//
//   ```text
//   SourceFileShape  pos=-  src=[0,...)
//   └─ Common  src=[0,1)  text="w"
//   ```
//
//   ...
//   ## [EOF]
//
// 这里不假设标题里的引号一定是合法 JSON：一个反引号字符会让标题变成
// `## [char 3] `"`"``，JSON.parse 失败时退回原始字面量。

const HEADING = /^## \[(char\s+(\d+)|EOF)\](?:\s+`([\s\S]*)`)?\s*$/;

function decodeQuoted(raw) {
  if (raw === undefined) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/**
 * @param {string} markdown case.md 的全文
 * @returns {{ title: string, steps: Array<{ label: string, index: number|null, quoted: string|null, tree: string }> }}
 */
export function parseStepsFromMarkdown(markdown) {
  const lines = String(markdown ?? "").split(/\r?\n/);
  const steps = [];
  let title = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (title === "" && /^# /.test(line)) {
      title = line.slice(2).trim();
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading === null) {
      continue;
    }

    const label = heading[1] === "EOF" ? "EOF" : `char ${heading[2]}`;
    const index = heading[2] === undefined ? null : Number(heading[2]);
    const quoted = decodeQuoted(heading[3]);

    // 标题之后、（下一个标题之前的）第一个围栏代码块就是这一步的树。
    let cursor = i + 1;
    while (cursor < lines.length && !/^```/.test(lines[cursor]) && !/^## /.test(lines[cursor])) {
      cursor++;
    }

    let tree = "";
    if (cursor < lines.length && /^```/.test(lines[cursor])) {
      cursor++;
      const body = [];
      while (cursor < lines.length && !/^```\s*$/.test(lines[cursor])) {
        body.push(lines[cursor]);
        cursor++;
      }
      tree = body.join("\n");
    }

    steps.push({ label, index, quoted, tree });
    i = cursor;
  }

  return { title, steps };
}
