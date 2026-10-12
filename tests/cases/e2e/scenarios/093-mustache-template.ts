// xl:title 极简模板引擎：变量、点路径、循环、条件
// xl:round 371
// xl:judge stdout
// xl:end
type Ctx = Record<string, unknown>;
function lookup(ctx: Ctx, path: string): unknown {
  let cur: unknown = ctx;
  for (const part of path.split(".")) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Ctx)[part];
  }
  return cur;
}
function render(tpl: string, ctx: Ctx): string {
  let out = "";
  let i = 0;
  while (i < tpl.length) {
    const open = tpl.indexOf("{{", i);
    if (open < 0) { out += tpl.slice(i); break; }
    out += tpl.slice(i, open);
    const close = tpl.indexOf("}}", open);
    const expr = tpl.slice(open + 2, close).trim();
    i = close + 2;
    if (expr.startsWith("#each ")) {
      const list = lookup(ctx, expr.slice(6)) as unknown[];
      const end = tpl.indexOf("{{/each}}", i);
      const body = tpl.slice(i, end);
      for (const item of list) {
        if (typeof item === "object" && item !== null) out += render(body, item as Ctx);
      }
      i = end + 9;
      continue;
    }
    if (expr.startsWith("#if ")) {
      const val = lookup(ctx, expr.slice(4));
      const end = tpl.indexOf("{{/if}}", i);
      if (val) out += render(tpl.slice(i, end), ctx);
      i = end + 7;
      continue;
    }
    const val = lookup(ctx, expr);
    out += val === undefined || val === null ? "" : String(val);
  }
  return out;
}
const tpl = "Hello {{user.name}}! {{#if admin}}[admin]{{/if}}\n{{#each items}}- {{label}}: {{qty}}\n{{/each}}Total: {{total}}";
console.log(render(tpl, {
  user: { name: "Ann" },
  admin: true,
  total: 7,
  items: [{ label: "pen", qty: 2 }, { label: "ink", qty: 5 }],
}));
console.log(render("{{missing}}|{{a.b.c}}|{{#if none}}x{{/if}}", { a: {} }));
