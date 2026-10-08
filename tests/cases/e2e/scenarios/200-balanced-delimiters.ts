// xl:title 端到端：括号配对检查（栈 + 位置报告 + 字符串里的括号跳过）
// xl:round 7
// xl:judge stdout
// xl:end

const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
function check(s: string): string {
  const stack: Array<{ c: string; at: number }> = [];
  let inStr = false;
  let quote = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) { if (c === "\\") i++; else if (c === quote) inStr = false; continue; }
    if (c === '"' || c === "'") { inStr = true; quote = c; continue; }
    if ("([{".includes(c)) { stack.push({ c, at: i }); continue; }
    if (")]}".includes(c)) {
      const top = stack.pop();
      if (!top) return "unexpected " + c + " at " + i;
      if (top.c !== pairs[c]) return "mismatch " + c + " at " + i + " vs " + top.c + " at " + top.at;
    }
  }
  return stack.length === 0 ? "ok" : "unclosed " + stack[stack.length - 1].c + " at " + stack[stack.length - 1].at;
}
for (const s of ["(a[b]{c})", "((a)", "([)]", '"("', ")", "x(y", "a\"'"]) console.log(JSON.stringify(s) + " -> " + check(s));
