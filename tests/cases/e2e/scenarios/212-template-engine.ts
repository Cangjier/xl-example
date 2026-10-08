// xl:title 端到端：迷你模板引擎（占位符 / 条件段 / 转义 / 未定义变量）
// xl:round 7
// xl:judge stdout
// xl:want blocked
// xl:why 同上：模板引擎里的正则替换。**必做**
// xl:end

function render(tpl: string, data: Record<string, any>): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const withEach = tpl.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_m, key: string, body: string) => {
    const list = data[key];
    if (!Array.isArray(list)) return "";
    return list.map((item) => body.replace(/\{\{(\.|\w+)\}\}/g, (_x, f: string) => esc(String(f === "." ? item : item[f] ?? "")))).join("");
  });
  return withEach.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => esc(String(data[key] ?? "")));
}
const tpl = "Hi {{name}}!{{#items}}[{{.}}]{{/items}}{{#missing}}X{{/missing}} n={{n}}";
console.log(render(tpl, { name: "<b>", items: [1, "a&b"], n: 0 }));
console.log(render("{{a}}{{a}}", { a: "z" }), render("{{nope}}", {}));
