// xl:title `Symbol.match` 那一族五个名字在不在（协议本身仍是待做项）
// xl:round 690
// xl:judge stdout
// xl:why **名字与协议是两件事**：`Symbol.match` / `replace` / `search` / `split` / `matchAll`
//       在 JS 里**永远存在**（`typeof` 给 `"symbol"`），而用到它们的那几个方法
//       （`String.prototype.match` 那一族）与 `RegExp` 本身**仍是待做项**。
//       少了名字，`class C { [Symbol.match](s) { … } }` 当场报
//       「`set_hidden` 的键不是字符串也不是符号」——那句话离现场很远。
// xl:end
const names: string[] = ["match", "replace", "search", "split", "matchAll"];
for (const n of names) console.log(n, String(typeof (Symbol as any)[n]));
console.log(String(Symbol.match), Symbol.split === Symbol.split);
