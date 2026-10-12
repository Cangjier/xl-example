// xl:title 模板字面量的缩进与反引号（原样保留）
// xl:judge stdout
// xl:end

const html = `<ul>
  <li>a</li>
</ul>`;
console.log(html.split("\n").length, html.includes("  <li>"), `back \` tick`.length);
