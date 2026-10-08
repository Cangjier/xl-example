// xl:title 小型状态机：把算式切成 token 并求值
// xl:round 8
// xl:judge stdout
// xl:end

function tokens(input) {
  const out = [];
  let i = 0;
  while (i < input.length) {
    const c = input[i];
    if (c === " ") { i++; continue; }
    if (c >= "0" && c <= "9") { let j = i; while (j < input.length && input[j] >= "0" && input[j] <= "9") j++; out.push({ kind: "num", text: input.slice(i, j) }); i = j; continue; }
    out.push({ kind: "op", text: c });
    i++;
  }
  return out;
}
function evaluate(input) {
  const list = tokens(input);
  const stack = [];
  let acc = Number(list[0].text);
  for (let i = 1; i < list.length; i += 2) {
    const op = list[i].text;
    const n = Number(list[i + 1].text);
    if (op === "+") acc += n; else if (op === "-") acc -= n; else if (op === "*") acc *= n; else throw new Error("bad op " + op);
  }
  void stack;
  return acc;
}
console.log(evaluate("1 + 2 * 3 - 4"), tokens("12+3").length);
