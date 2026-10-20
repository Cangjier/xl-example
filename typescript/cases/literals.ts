// literals 用例集：字面量的「非语句首」出现位置，补 string / number / regex 三张用例集之外的测量口径。
// 三张字面量用例集（string.ts / number.ts / regex.ts）只把字面量放在语句首（`1;` `/a/;` `"s";`），
// 这里补它在语句可解析的其它位置上的投影：赋值右值、调用实参、数组字面量元素、对象字面量属性值。
// 一行一个用例；行内 \n 由 ast-json.mjs 还原成真实换行；注释必须独立成行。
// 对拍口径：TS 侧 ts.createSourceFile 的 AST；本仓侧 SourceFileRunner.Parse 的形状树。
// 快照：node typescript/cases/ast-json.mjs literals && node typescript/cases/ast-json-diff.mjs literals
//
// 覆盖范围：
//   L1 赋值右值：数字（含进制 / 分隔符 / 指数 / 前导点 / 尾点）、bigint、字符串、模板、正则；
//   L2 调用实参：单个字面量、两个字面量并列、空串、空模板、带 flags 的正则；
//   L3 数组字面量的元素（借调用实参进入，避开语句首 `[`）：数字 / bigint / 字符串 / 正则 / 模板；
//   L4 对象字面量的属性值（借括号或调用实参进入，避开语句首 `{`）：同上。
//
// 暂缓（不写进本用例集）：
//   jsx-text / jsx-text-all-white-spaces   <- .ts 口径里没有 JSX 文本节点，无从测量（见 docs/coverage-members.md）
//   语句首的字面量本身                   <- 已在 string.ts / number.ts / regex.ts 全覆盖，不重复造
//   正则 / 数组 / 对象字面量在语句首       <- `/a/;` 归 regex.ts；`[1];` `({a:1});` 归 members.ts 与语句家族
//   八进制转义 `\1` `\07` / 非法 `\x` / 非法 `\u` <- ts 会报诊断，string.ts 只收无诊断写法

// ===== base 1：赋值右值 =====
x = 1;
x = 1.5;
x = 0x1f;
x = 0b101;
x = 0o17;
x = 1e3;
x = 1.;
x = 1_000;
x = 12345678901234567890;
x = 1n;
x = 0x1fn;
x = "s";
x = "";
x = 's';
x = "a\\b";
x = `t`;
x = ``;
x = /a/;
x = /a/gi;
// + trivia
x /* c */ = 1n;
x = /* c */ /a/;
x = /* c */ `t`;
x = 1_000n; // c

// ===== base 2：调用实参 =====
f(1);
f(1.5);
f(0x1f);
f(1n);
f(1_000n);
f("s");
f("");
f(`t`);
f(``);
f(/a/);
f(/a/gi);
f(1, 1n);
f("s", "t");
f(/a/, /b/);
f(0x1f, 1n);
// + trivia
f(/* c */ 1n);
f(1n /* c */);
f(1 /* c */, 1n);

// ===== base 3：数组字面量的元素（借调用实参进入）=====
f([1, 2]);
f([1.5, 0x1f]);
f([1n, 2n]);
f(["s"]);
f([""]);
f([`t`]);
f([/a/, /b/]);
f([1, 1n, "s", /a/]);
f([]);
// + trivia
f([/* c */ 1]);
f([1, /* c */ 1n]);

// ===== base 4：对象字面量的属性值（借括号 / 调用实参进入）=====
({ a: 1 });
({ a: 1.5 });
({ a: 0x1f });
({ a: 1n });
({ a: 1_000n });
({ a: "s" });
({ a: "" });
({ a: `t` });
({ a: `` });
({ a: /a/ });
({ a: /a/gi });
({ a: 1, b: 1n });
({ a: "s", b: /a/ });
({ a: 0x1f, b: `t` });
({ a: 1, b: 1n, c: "s", d: /a/ });
// + trivia
({ a: /* c */ 1n });
({ a: 1n /* c */ });
({ /* c */ a: /a/ });
