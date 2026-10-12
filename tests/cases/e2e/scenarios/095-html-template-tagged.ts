// xl:title 标签模板做 HTML 转义与拼接
// xl:round 371
// xl:judge stdout
// xl:end
function escapeHtml(v: unknown): string {
  const s = String(v);
  return s.split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;").split('"').join("&quot;");
}
function html(strings: TemplateStringsArray, ...values: unknown[]): string {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    out += Array.isArray(v) ? v.map(escapeHtml).join("") : escapeHtml(v);
    out += strings[i + 1];
  }
  return out;
}
const user = "<script>";
const rows = [{ n: "a&b" }, { n: "c<d" }];
const page = html`<ul>${rows.map((r) => `<li>${r.n}</li>`)}</ul>`;
console.log(page);
console.log(html`<p>${user}</p>`, html`${1 + 1}`, html`no-sub`);
console.log(page.length, page.split("<li>").length - 1);
