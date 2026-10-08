// xl:title 标签模板与 `String.raw`：`raw` / 插值 / 空插值
// xl:round 767
// xl:judge stdout
// xl:note 标签函数的第一个实参是**字符串数组**（`strings.length === 插值数 + 1`），
// xl:note `strings.raw` 给的是**未处理转义**的原文（`\n` 是两格），而 `strings[i]` 是处理过的。
// xl:note `String.raw` 就是「取 `raw` 再拼接」——两种调用形状一起钉：
// xl:note 模板标签那一档，以及 `String.raw({ raw: [...] }, ...)` 那种**普通调用**。
// xl:end
function tag(strings: TemplateStringsArray, ...values: any[]): string {
  return strings.raw.join("|") + "//" + values.join(",") + "//" + strings.length;
}
console.log("01", tag`a${1}b${2}c`);
console.log("02", tag`x\ny`);
console.log("03", String.raw`a\nb${1}`);
console.log("04", String.raw({ raw: ["a", "b"] }, 1));
console.log("05", tag`${"only"}`);
console.log("06", `plain ${1 + 1} \u0041`);
