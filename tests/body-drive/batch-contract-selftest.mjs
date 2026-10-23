// batch-contract-selftest.mjs — core/syntax/batch 契约修正（G0–G6）的**不依赖解析器**单测。
//
//   node tests/body-drive/batch-contract-selftest.mjs
//
// 直接 require 编译产物 build/ts/core/syntax/batch/*.js，用 fake host / fake rule 驱动
// ItemListEngine，不建 AST、不跑 SourceFileRunner（因此不需要任何语言侧 shape）。
// 覆盖：① 一批两 item ② End 早于 Checked ③ AtEof 空增量收口 ④ Start 跳过前导 trivia
//       ⑤ Flush raw 尾巴 ⑥ 多批续喂 cursor ⑦ Build 返回 null 的 raw 记账。
//
// 任一断言失败 → 非零退出。
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const require = createRequire(import.meta.url);

const { ItemListEngine } = require(path.join(root, "build/ts/core/syntax/batch/item-list.js"));
const { BasicTokenBatch } = require(path.join(root, "build/ts/core/syntax/batch/basic-token-batch.js"));
const { RawFallback } = require(path.join(root, "build/ts/core/syntax/batch/raw-fallback.js"));

let checks = 0;
let failures = 0;

function check(name, cond, detail) {
  checks += 1;
  if (cond) {
    console.log(`ok   ${name}`);
    return;
  }
  failures += 1;
  console.error(`FAIL ${name}${detail === undefined ? "" : ": " + detail}`);
}

function same(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

// ---- fake host / unit -------------------------------------------------------

function unit(kind, trivia) {
  return { kind, IsTriviaToken: trivia === true, SourceRange: { Start: -1, End: -1 } };
}

function blank() {
  return unit("<blank>", true);
}

function makeHost(units) {
  return {
    Data: units,
    Parent: null,
    SourceRange: { Document: null, Start: -1, End: -1 },
  };
}

function makeBatch(host, from, atEof) {
  const batch = new BasicTokenBatch();
  batch.Reset(host, from === undefined ? 0 : from, atEof === true);
  return batch;
}

function makeEngine(rule) {
  const engine = new ItemListEngine();
  engine.Rules = [rule];
  return engine;
}

// ---- fake rule --------------------------------------------------------------
// 收口判据：
//   - `;`                        → item 到 `;`（含）
//   - `END`（且 item 已有 ≥2 个代码 unit）→ item 到 `END` 之前的那个 unit；
//     `END` 本身留给下一条 item —— 正是 G3 的「End 早于 Checked」。
//   - `state.AtEof`              → item 到最后一个代码 unit（无分号语句的 EOF 收口）。
class FakeRule {
  constructor(buildNull) {
    this.name = "fake";
    this.buildNull = buildNull === true;
  }

  Classify(code) {
    return code.length > 0 ? [1] : [];
  }

  Extend(state, units, tokenIndex) {
    // 状态机只记「最后一个代码 unit」，真实规则会在这里做 S × unitKind 转移。
  }

  Analyze(state) {
    const code = state.Code;
    if (code.length === 0) {
      return;
    }
    const last = code[code.length - 1];
    if (last.kind === ";") {
      state.Complete = true;
      state.End = state.CodeAt[code.length - 1];
      return;
    }
    if (last.kind === "END" && code.length >= 2) {
      state.Complete = true;
      state.End = state.CodeAt[code.length - 2];
      return;
    }
    if (state.AtEof) {
      state.Complete = true;
      state.End = state.CodeAt[code.length - 1];
    }
  }

  Build(host, state, context) {
    if (this.buildNull) {
      return null;
    }
    return {
      kind: "item",
      code: state.Code.map((u) => u.kind),
      from: state.Start,
      Parent: null,
    };
  }

  IncludesSeparator() {
    return true;
  }
}

const context = {};

// ---- ① 一批两 item：顺序 + 右向左 splice 后的索引 + cursor --------------------

{
  const host = makeHost([blank(), unit("a"), unit(";"), blank(), unit("b"), unit(";")]);
  const batch = makeBatch(host, 0, false);
  const engine = makeEngine(new FakeRule());

  engine.Feed(host, batch, context);

  check("① 一批两 item：建出 2 个", engine.Built === 2, `Built=${engine.Built}`);
  check("① 一批两 item：Data 长度 4", host.Data.length === 4, `len=${host.Data.length}`);
  check(
    "① 一批两 item：顺序与内容",
    host.Data[1] !== undefined &&
      host.Data[1].kind === "item" &&
      same(host.Data[1].code, ["a", ";"]) &&
      host.Data[3] !== undefined &&
      host.Data[3].kind === "item" &&
      same(host.Data[3].code, ["b", ";"]),
    JSON.stringify(host.Data.map((u) => (u.kind === "item" ? u.code : u.kind))),
  );
  check("① 前导 trivia 留在原位", host.Data[0].kind === "<blank>" && host.Data[2].kind === "<blank>");
  check("① cursor 落到 splice 后的批尾", batch.Cursor === 4 && batch.To === 4, `Cursor=${batch.Cursor} To=${batch.To}`);
  check("① 状态已复位到下一条 item", engine.State.Start < 0, `Start=${engine.State.Start}`);
}

// ---- ② End 早于 Checked：不吞下一条 ------------------------------------------

{
  const host = makeHost([unit("a"), unit("b"), unit("c"), unit("END"), unit("d"), unit("e"), unit(";")]);
  const batch = makeBatch(host, 0, false);
  const engine = makeEngine(new FakeRule());

  engine.Feed(host, batch, context);

  check("② 建出 2 个 item", engine.Built === 2, `Built=${engine.Built}`);
  check("② 第一条只含 a/b/c", host.Data[0] !== undefined && same(host.Data[0].code, ["a", "b", "c"]), JSON.stringify(host.Data[0] && host.Data[0].code));
  check(
    "② END 留给第二条，不并入第一条",
    host.Data[1] !== undefined && same(host.Data[1].code, ["END", "d", "e", ";"]),
    JSON.stringify(host.Data[1] && host.Data[1].code),
  );
  check("② 没有 unit 丢失", host.Data.length === 2, `len=${host.Data.length}`);
}

// ---- ③ AtEof 空增量收口无分号 item -------------------------------------------

{
  const host = makeHost([unit("a"), unit("b")]);
  const batch = makeBatch(host, 0, false);
  const engine = makeEngine(new FakeRule());

  engine.Feed(host, batch, context);
  check("③ 未到 EOF 时保持 pending", engine.Built === 0 && engine.State.Start === 0, `Built=${engine.Built}`);

  batch.AtEof = true;
  engine.Feed(host, batch, context);

  check("③ EOF 空增量调 Analyze 收口", engine.Built === 1, `Built=${engine.Built}`);
  check("③ 无分号 item 内容完整", host.Data.length === 1 && same(host.Data[0].code, ["a", "b"]), JSON.stringify(host.Data[0] && host.Data[0].code));
  check("③ cursor 与批尾一致", batch.Cursor === 1 && batch.To === 1, `Cursor=${batch.Cursor} To=${batch.To}`);
}

// ---- ④ Start 跳过前导 trivia -------------------------------------------------

{
  const host = makeHost([blank(), blank(), unit("x"), unit(";")]);
  const batch = makeBatch(host, 0, false);
  const engine = makeEngine(new FakeRule());

  engine.Feed(host, batch, context);

  check("④ item 起点 = 首个代码 unit", host.Data[2] !== undefined && host.Data[2].kind === "item" && host.Data[2].from === 2, JSON.stringify(host.Data[2] && host.Data[2].from));
  check("④ 前导 trivia 未被 splice 掉", host.Data.length === 3 && host.Data[0].IsTriviaToken && host.Data[1].IsTriviaToken);
}

// ---- ⑤ Flush raw 尾巴 -------------------------------------------------------

{
  // ⑤a：整条都没收口 → raw = [Start, Checked)
  const host = makeHost([unit("a"), unit("b")]);
  const batch = makeBatch(host, 0, false);
  const engine = makeEngine(new FakeRule());
  const raw = new RawFallback();

  engine.Feed(host, batch, context);
  const items = engine.Flush(host, context, raw);

  check("⑤a 未收口不建 item", items.length === 0, `items=${items.length}`);
  check("⑤a raw 覆盖整段", raw.From === 0 && raw.To === 2 && raw.Reason === "incomplete", `raw=${raw.From}..${raw.To}/${raw.Reason}`);
  check("⑤a Data 未被破坏", host.Data.length === 2 && host.Data[0].kind === "a", `len=${host.Data.length}`);
}

{
  // ⑤b：item 已建，后面还有未收口尾巴 → raw = 尾巴（splice 后坐标）
  const host = makeHost([unit("a"), unit(";"), unit("c"), unit("d")]);
  const batch = makeBatch(host, 0, false);
  const engine = makeEngine(new FakeRule());
  const raw = new RawFallback();

  engine.Feed(host, batch, context);
  const items = engine.Flush(host, context, raw);

  check("⑤b Feed 建出第一条", engine.Built === 1, `Built=${engine.Built}`);
  check("⑤b Flush 不再重复建", items.length === 0, `items=${items.length}`);
  check(
    "⑤b raw 只覆盖尾巴 c/d",
    raw.IsArmed() && host.Data[raw.From] !== undefined && host.Data[raw.From].kind === "c" && raw.To - raw.From === 2,
    `raw=${raw.From}..${raw.To}`,
  );
}

// ---- ⑥ 多批续喂：cursor 不得回退到 From --------------------------------------

{
  const host = makeHost([unit("a"), unit("b")]);
  const batch = makeBatch(host, 0, false);
  const engine = makeEngine(new FakeRule());

  engine.Feed(host, batch, context);
  check("⑥ 第一批后 cursor=2", batch.Cursor === 2 && engine.State.Code.length === 2, `Cursor=${batch.Cursor} Code=${engine.State.Code.length}`);

  host.Data.push(unit("c"), unit(";"));
  batch.To = host.Data.length;
  batch.AtEof = false;
  batch.Recompute();
  engine.Feed(host, batch, context);

  check("⑥ 续喂不重复 a/b", engine.Built === 1 && host.Data.length === 1 && same(host.Data[0].code, ["a", "b", "c", ";"]), JSON.stringify(host.Data[0] && host.Data[0].code));
  check("⑥ 只建一次 item", engine.Built === 1, `Built=${engine.Built}`);
}

// ---- ⑦ Build 返回 null：记账为 raw，不吞、不崩 -------------------------------

{
  const host = makeHost([unit("a"), unit(";")]);
  const batch = makeBatch(host, 0, false);
  const engine = makeEngine(new FakeRule(true));
  const raw = new RawFallback();

  engine.Feed(host, batch, context);
  check("⑦ 建不出不计数", engine.Built === 0, `Built=${engine.Built}`);
  check("⑦ 原始 unit 留在 Data", host.Data.length === 2, `len=${host.Data.length}`);

  engine.Flush(host, context, raw);
  check("⑦ Flush 报 build-null", raw.From === 0 && raw.To === 2 && raw.Reason === "build-null", `raw=${raw.From}..${raw.To}/${raw.Reason}`);
}

// ---- summary ----------------------------------------------------------------

console.log("");
console.log(`batch-contract-selftest: ${checks - failures}/${checks} passed, ${failures} failed`);
if (failures > 0) {
  process.exitCode = 1;
}
