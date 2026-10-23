// 缓存键改造（O5a）的单价探针：分别量「旧口径」与「新口径」下一次 `PossibleShapeCache.GetState`
// 的完整成本，以及路径上的每一段（取键 / 取状态）。
//
//   node tests/bench/slot-micro.mjs --build build        # 改造后
//   node tests/bench/slot-micro.mjs --build build-base   # 改造前
//
// 两个 build 目录都是同一套源码编出来的 `build/ts` 树（build-base 是基座快照），
// 所以两个口径可以在同一台机器、同一进程形状下对照；两侧各自只量自己那条路。
//
// 口径：`time()` 先热身 200k 次，再跑 n 次取 `ns/op`；每行一个 `sink` 计数，防止被优化掉。
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");

const argv = process.argv.slice(2);
const buildIdx = argv.indexOf("--build");
const buildDir = path.resolve(root, buildIdx >= 0 ? argv[buildIdx + 1] : "build");
const buildTs = path.join(buildDir, "ts");

const { PossibleShapeCache } = require(path.join(buildTs, "core", "syntax", "possible-shape-cache.js"));
const { PossibleShape } = require(path.join(buildTs, "core", "syntax", "possible-shape.js"));

class SamplePossibleShape extends PossibleShape {}
const instance = new SamplePossibleShape();
const N = 2_000_000;

const time = (label, fn, n = N) => {
  for (let i = 0; i < Math.min(n, 200000); i++) fn(i);
  let warmSink = 0;
  for (let i = 0; i < Math.min(n, 200000); i++) warmSink += fn(i) ? 1 : 0;
  const start = process.hrtime.bigint();
  let sink = 0;
  for (let i = 0; i < n; i++) sink += fn(i) ? 1 : 0;
  const ns = Number(process.hrtime.bigint() - start) / n;
  return { label, nsPerOp: +ns.toFixed(2), sink, warmSink };
};

const hasSlotApi = typeof PossibleShape.SlotOf === "function" && typeof instance.Slot === "function";
const rows = [];
rows.push(time("this.constructor.name（键的旧来源）", () => instance.constructor.name.length > 0));

const cache = new PossibleShapeCache();
if (hasSlotApi) {
  const slot = PossibleShape.SlotOf(SamplePossibleShape);
  cache.SetState(slot, { At: 0 });
  rows.push(time("PossibleShape.SlotOf(类)（键的新来源，Map<类,int> 命中）", () => PossibleShape.SlotOf(SamplePossibleShape)));
  rows.push(time("PossibleShape.SlotOf(this.constructor)（形状里的实际形态）", () => PossibleShape.SlotOf(instance.constructor)));
  rows.push(time("this.Slot()（形状调的入口）", () => instance.Slot()));
  rows.push(time("cache.GetState(槽位)（数组下标读，已命中）", () => cache.GetState(slot) !== null));
  rows.push(time("cache.GetState(this.Slot())（完整一次取状态）", () => cache.GetState(instance.Slot()) !== null));
  rows.push(time("cache.GetState(this.constructor.name)（旧完整口径，新实现下查不到）", () => cache.GetState(instance.constructor.name) !== null));
} else {
  const name = instance.constructor.name;
  cache.SetState(name, { At: 0 });
  rows.push(time("cache.GetState(name)（Map<string,any> 哈希查找，已命中）", () => cache.GetState(name) !== null));
  rows.push(time("cache.GetState(this.constructor.name)（旧完整一次取状态）", () => cache.GetState(instance.constructor.name) !== null));
}

console.log(
  JSON.stringify(
    {
      build: path.relative(root, buildDir),
      api: hasSlotApi ? "slot" : "name",
      node: process.version,
      rows,
    },
    null,
    2,
  ),
);
