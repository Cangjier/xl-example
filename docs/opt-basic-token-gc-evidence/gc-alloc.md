# 分配与 GC 账本 + 分配削减 A/B（task-3 / gc-alloc）

> 对象：`xl-example`，8 份 `.d.ts`（`buffer-ab` 同语料，4,056,011 字符），Windows / Node v24.21.0。
> 全部原型只在 gitignore 的 `build-g1` / `build-g2` 副本上改 `.js`；`core/**.xl.md`、`build/`、仓库其它文件未动。
> 时间预算 ~30 分钟，实际约 60 分钟：读数都拿到了，但 g1/g2 各只做了 1 组 `buffer-ab`（repeat 11），
> 门禁只跑了 `buffer-equivalence --mode xml`（validate / ast / token-ast 等未跑）。

---

## 0. 一句话结论

**「GC 8%」≈ 53 ms/parse 的暂停，其中 92% 是 scavenge（48.8 ms）、8% 是 major（4.2 ms）；scavenge 的暂停由「存活对象复制/晋升」决定，不是由垃圾分配量决定。**
本轮把每 parse 的分配量估到 **144 MB（±25%）**，其中 Token+Data+SourceRange 三个对象占 **126 MB（87%）**；
做了两个削减原型（叶子 token 共享空 `Data`、注释 `Tmp` 改 chunk），模型上分配 **−8.1%** / **−25%**，
但实测 scavenge 次数只降 3~10%、暂停降 ~4%（在噪声内）、**墙钟 0%（−1.3% ~ −0.5%，反而略负）**。
→ **不值得写回 `.xl.md`**。要继续动 GC，得减**存活的形状树/晋升量**，而不是减 basic token 的瞬时分配。

---

## 1. 分配账本（8 份 d.ts / 每 parse 一次）

脚本：`alloc-ledger.mjs`（构造计数用「替换 `Token`/`SourceRange` 模块导出为计数子类」，字符串用包 `AppendAndSignOut` /
`AreaAnnotation.Process` / `Document.GetRaw`，Data 变更用包 `Token.Add` 等）。原始 JSON：`ledger-base.json`。

### 1.1 对象数（实测计数，不是估算）

| 项 | 数量 | 备注 |
|---|---:|---|
| 构造出的 Token（含 shape） | **622,277** | 0.153 个/字符 |
| ├ basic 叶子 token | **379,418**（61%） | WrapSymbol 141,792 / Common 119,164 / Symbol 105,248 / AreaAnnotation 10,018 / ConstString、LineAnnotation、RegexToken、Shebang、Bom 合计 ~3k |
| ├ 形状 + Bracket | **242,859**（39%） | IdentifierShape 74,571 / TypeReferenceShape 25,656 / ParameterShape 17,041 / PropertySignatureShape 14,405 / Bracket 16,764 … |
| `Data = []` 数组 | **622,277** | 每个 Token 一个，字段初始化 `Data = []` |
| SourceRange 对象 | **776,344** | token 字段初始化 622,277 + 窗口 154,067（`SyntaxContext.Process` 每 32 字符一个） |
| `SourceRange.Whole()` 调用 | 465,489 | 已按文档缓存，**分配 0 个**（只剩调用开销） |
| **parse 结束后仍存活** | **217,363** | 全是形状 token；**380k basic token 全部是「生下来就被合并掉」的年轻垃圾** |

> 保留树只有 shape 层（`root.ToXmlString()` 里没有 `<Common>`/`<AreaAnnotation>` 标签），所以「构造量」必须用
> 构造器计数，不能用树遍历（树遍历只数到 217k）。这一点也解释了为什么 basic token 的分配对 GC 是纯垃圾压力。

### 1.2 字节构成（估算，误差 ±25%）

估算假设：官方 Node 64 位未开 pointer compression，对象头 16 B、字段 8 B；空数组 32 B（elements 是共享单例）；
SourceRange 40 B；字符串 1 B/字符 + 16 B 头。逐项 × 实测对象数。

| 项 | MB/parse | 占比 | 依据 |
|---|---:|---:|---|
| Token 对象（622,277 × 120 B） | **74.7** | 52% | 基类 11 字段 + 子类字段 |
| `Data` 数组（622,277 × 32 B） | **19.9** | 14% | 空 JSArray |
| SourceRange（776,344 × 40 B） | **31.1** | 22% | 3 字段 |
| 字符串 | **18.7** | 13% | 见 1.3 |
| **合计** | **144.3** | 100% | 与 GC 频次自洽（默认 young gen 下 6.6 次 scavenge/parse） |

### 1.3 字符串分配来源（每 parse）

| 来源 | 次数 | 字符数 | 说明 |
|---|---:|---:|---|
| `BlockToken.AppendAndSignOut(s)`（含 Value 版） | 451,504 | 1,607,138 | 批量后每 run 一次；拼接前 `Temp` 已累计 423,538 字符（cons 串，短，几乎不 flatten） |
| `AreaAnnotation.Process`（每 32 字符窗口） | 82,343 | 2,377,538 | 每窗一次 `GetRaw` 切片 + 一次 `Tmp +=` |
| **`Tmp +=` 的复制量** | 82,343 | **12,047,053** | 每次 `+=` 前 `Tmp` 平均已 146 字符；下一窗的 `Tmp.endsWith("*")` 会迫使 cons 串 flatten ⇒ 每窗复制整段 |
| `Document.GetRaw` | 409,432 | 8,533,013 | 返回切片字符串（分配） |
| `Document.GetValue` | 1,532,861 | — | 单字符串；V8 有单字符缓存，估算按 0 分配 |

字符串合计 ≈ 18.7 MB/parse。**注释的 `Tmp` 复制（12 MB）是最大的一笔字符串分配**，也是原型 g2 的目标。

### 1.4 「可砍」估算与误差

| 可砍项 | 实测依据 | 省下 | 占总分配 |
|---|---|---:|---:|
| 叶子 basic token 共享空 `Data` | 379,418 个空数组 × 32 B | **11.6 MB** | **8.1%** |
| 注释 `Tmp` 改 chunk（去掉 12.0 MB 复制 + 同量 `endsWith` flatten ≈ 24 MB） | 82,343 窗 × 均长 146 | **~24 MB** | **~16%** |
| SourceRange 懒建 | **否决**：`SignIn` 次数 ≈ 构造数（每个 token 都要签入签出） | 0 | 0 |
| `Whole` 缓存 | 文档已做；465,489 次调用、0 分配 | — | — |

误差说明：字节模型 × 实测计数，**±25%**（对象真实大小依赖 V8 map/in-object 布局）；字符串部分 ±50%（是否 flatten
取决于 V8 版本的具体实现，`endsWith`/`includes` 会 flatten 是 V8 的既有行为）。**方向与量级可信，绝对值不要当精确值引用。**

---

## 2. GC 实测

脚本：`gc-observe.mjs`（`PerformanceObserver('gc')` + `v8.getHeapStatistics/getHeapSpaceStatistics`），
语料与 `buffer-ab` 相同，warmup 1 轮 + 强制 2 次 full GC 后开始。

### 2.1 基线（build，repeat 8，默认 flags）

| 读数 | 值 |
|---|---|
| 墙钟 | 683.3 ms/parse（8 份） |
| GC 次数 | **7.63 /parse**（minor 6.63 / major 1.00） |
| GC 暂停合计 | **53.0 ms/parse**（minor **48.8** + major **4.2**）= **7.54%** 墙钟 |
| 暂停 p50 / p90 / max | 6.35 / 9.91 / 16.13 ms |
| 堆（warmup 后 → 8 轮后） | used 18.6 → 236.5 MB；old_space 7.4 → 214.7 MB |

和 `docs/opt-basic-token-run-batching.md` §5 的 **GC 8.0%** 对得上。**结构上**：GC 暂停的 92% 是 scavenge、
8% 是 major；scavenge 每次 ~7.4 ms，major 每次 ~4 ms。

### 2.2 `--trace-gc` 交叉验证

- 默认 flags：`--trace-gc` 行数与 observer 一致（每轮 7~8 次，含 1 次 Mark-Compact）。
- 固定 `--max-semi-space-size=2` 后统计 scavenge 次数（3 个 build 各 1 次 parse-once）：
  build **230** / g1 **228** / g2 **221**。
- `--trace-gc-nvp` 的 `allocated=` 字段不可用于「每周期分配量」：小 semi-space 下它给出的每周期值 ~20 MB，
  与 2 MB 的 semi-space 容量矛盾（应是「本次 GC 期间累计量」口径），**本报告不采用该字段**，只采用 GC 次数/
  暂停与账本模型。

---

## 3. 原型 g1：叶子 basic token 共享空 `Data`

### 改动（只改 `build-g1/ts/**/*.js`）
- `core/syntax/token.js`：`Data = []` → 字段声明 + 构造器里 `this.constructor.SharedEmptyData === true ? Token.EmptyData : []`；
  新增 `static EmptyData = Object.freeze([])` 与 `static OwnData(token)`（copy-on-write）；
  `Add` / `AddRange` / `MoveDataTo` / `Replace` / `RemoveSelf` 全部先 `OwnData`。
- `core/syntax/block-token.js`：`Undo` 里 `this.Parent.Data.splice(...)` → `Token.OwnData(this.Parent)`。
- 9 个叶子类末尾加 `exports.X.SharedEmptyData = true`：Common / WrapSymbol / Symbol / AreaAnnotation /
  LineAnnotation / RegexToken / Shebang / Bom / ConstString。

### Data 写路径审查（为什么只对叶子生效）
- `grep` 出 build 里 **213 处** `.Data.push/splice/unshift/length= /Data=`，其中绝大多数是形状 builder 的
  `host.Data.splice(...)`、`bracket.Data`、`member.Data`、`shape.Data.push` —— 都在 **shape / Bracket** 上。
- 实测 Data 变更计数：`Add 617,768`、`AddRange 0`、`Replace 0`、`RemoveSelf 19`、`MoveDataTo 0`；
  收到 `Add` 的父类全是 shape 与 Bracket。**basic 叶子从不被 Add、也不被 builder 直接 splice**（在 4556 文件语料上没有反例）。
- 风险：这是「语料观察 + 白名单」而不是类型级保证。共享数组是 `Object.freeze([])`，万一将来有未加 COW 的直写，
  会**抛 TypeError（快速失败）**而不是静默污染；但 `Object.freeze` 只保护元素/长度，**不能**防 `token.Data = expr` 赋值。

### 等价性
`node tests/bench/buffer-equivalence.mjs --mode xml --base build --new build-g1 --quiet`
→ **PASS 4504 / FAIL 0 / ERROR 0 / 同错 52**，XML 字节 **34,109,694 = 34,109,694**（完全一致）。

### 效果
| 口径 | build | g1 | Δ |
|---|---:|---:|---:|
| 分配（模型） | 144.3 MB | 132.7 MB | **−11.6 MB / −8.1%** |
| scavenge 次数（固定 2 MB semi-space） | 230 | 228 | −0.9%（噪声） |
| GC 暂停/parse（repeat 8） | 53.0 ms（7.54%） | 79.1 ms（8.48%） | **反向**（噪声，见 §6） |
| GC 次数/parse | 7.63 | 10.25 | 反向（噪声） |
| **墙钟 A/B（repeat 11，build vs g1）** | 603.0 ms | 610.9 ms | **−1.30%**（逐文件中位之和）/ **−0.84%**（每轮合计中位） |

**结论：砍掉 8% 的分配，墙钟没有任何正收益（−0.5% ~ −1.3%，且方向为负），落在 ±2.4% 噪声带内。**

---

## 4. 原型 g2：g1 + 注释 `Tmp` 改 chunk 数组

### 改动（`build-g2` = g1 全部 + `area-annotation.js`）
- 新增 `TmpChunks`（null 表示 `Tmp` 是有效值）：`PushTmp(segment)`、`FlushTmp()`（join 一次）、`TmpEndsWithStar()`
  （只看最后一个 chunk 的末字符，不再 flatten 整段 `Tmp`）、`TrimTmpLast()`。
- `Process` 里 `Tmp += raw` / `Tmp += raw.substring(0, close)` → `PushTmp(...)`；跨窗口 `Tmp.endsWith("*")` → 末 chunk 判断；
  `Undo` → `TrimTmpLast()`；`Default` → `PushTmp(value)`；`ToXmlString` → `FlushTmp()`。

### 等价性
`--mode xml` → **PASS 4504 / FAIL 0 / ERROR 0 / 同错 52**，字节一致（同上）。

### 效果
| 口径 | build | g2 | Δ |
|---|---:|---:|---:|
| 分配（模型） | 144.3 MB | ~108.7 MB | **−35.6 MB / −25%**（g1 11.6 + 注释 24） |
| scavenge 次数（固定 2 MB semi-space） | 230 | **221** | **−3.9%** |
| GC 次数/parse（repeat 8） | 7.63（minor 6.63） | 7.38（minor 6.00） | −3.3%（minor −10%） |
| GC 暂停/parse（repeat 8） | 53.0 ms（7.54%） | **51.0 ms（7.58%）** | −2.0 ms / **−3.8%**（噪声内） |
| 其中 minor 暂停 | 48.8 ms | 48.2 ms | −1.2% |
| 暂停 p50 | 6.35 | 6.99 | +10%（噪声） |
| **墙钟 A/B（repeat 11）** | 616.3 ms | 619.2 ms | **−0.47%（逐文件中位之和）/ −0.33%（每轮合计中位）** |

**结论：模型上分配降了 25%，实测 GC 暂停只降 ~4%（噪声内）、scavenge 次数降 4~10%，墙钟 0%。**

---

## 5. 为什么「分配 −25%」转不成墙钟/暂停

1. **暂停的大头是存活对象复制，不是垃圾本身。** scavenge 每次 ~7.4 ms 的耗时来自「把本轮存活对象从 from-space
   复制到 to-space / 晋升到 old」，而 parse 过程中存活的是**正在长大的形状树**（每 parse 保留 217k 形状 token）。
   垃圾多只增加 scavenge **次数**，不增加单次暂停。
2. 本轮的削减把 scavenge 次数从 6.63 压到 6.00（−10%），暂停自然只降 ~4%，落在 ±2.4% 噪声带附近 → 测不出来。
3. 墙钟里 GC 只占 7.5%，其中 92% 是 minor；即使暂停全清零，上限也只有 **+7.5%**，而「砍 25% 分配」按比例只对应
   **~1.3%**，本来就应该在噪声里。（这正是 `docs/opt-base-v2.md`/`perf-summary.md` §3 里 O1「分配 −81% 没转成墙钟」的同一个机制：
   O1 砍的是 `Whole()` 的 1.4 M 个对象，现在 `Whole` 已缓存、分配 0，但墙钟 A/B 仍是 −1.4% ~ +0.6% 噪声级。）

---

## 6. 噪声与口径说明（读数字前必须一起读）

- **A/B 噪声带 ±2.4%**（`docs/perf-summary.md` §2、`buffer-ab` 的 A/A 对照）。g1/g2 的墙钟全部落在噪声带内，
  且符号为负；本报告据此判「无收益」，而不是判「有 −0.5% 的退化」。
- **GC 暂停的轮间跳动很大**：同一 build 在 repeat 5 与 repeat 8 两次运行里分别是 55.0 ms 与 53.0 ms，
  但单轮范围 43~84 ms；g1 的 79 ms/8.48% 很可能是轮次运气（那组运行 wall 也是最高的 715 ms）。
  **暂停只用于量级（7.5%）与构成（minor:major = 92:8），不做单次归因。**
- 墙钟基准在不同进程/进程内不同轮之间漂移 570~750 ms（buffer-ab 基线中位 616 ms，gc-observe 683 ms），
  **只能比 Δ%，不能比绝对 ms**。
- 字节模型 ±25%，字符串 ±50%（见 §1.4）。
- `--heap-prof` 采样分配剖面本次试过，但整进程只采到 7.3 MB（被 `readFileSync`/模块加载主导），
  与账本模型差一个数量级，**判定该口径不可用，未采用**（文件 `hp-*.heapprofile` 留在目录里供复核）。

---

## 7. 结论：值得写回 `.xl.md` 吗？

**不值得。**

- g1：分配 −8.1% → GC 暂停 0（噪声内）→ 墙钟 −1.3% ~ −0.8%（噪声，方向为负）。写回要动
  `token.xl.md` + 9 个 basic token 文件 + `block-token.xl.md`，并引入「哪些类可以共享」的白名单约定
  （一条**靠 review 守的契约型约束**，和 O1 的 `Whole` 共享只读视图同类风险），收益为 0。
- g2：分配 −25% → GC 暂停 −4%（噪声内）→ 墙钟 −0.5%（噪声）。收益为 0，代价是 `area-annotation.xl.md`
  的 `Tmp` 从「就是字符串」变成「字符串 + chunk 缓冲」两态，文档与不变量都要重写。
- 若将来仍要落地（例如以后 GC 份额变大、或平台换到 GC 更贵的环境），**精确落点**：
  - `core/syntax/token.xl.md`：`## field Data:Array<Token> = []` → 共享空 + `MoveDataTo/Add/AddRange/Replace/RemoveSelf` 的 COW；
  - `core/syntax/block-token.xl.md`：`## method Undo` 里 `this.Parent!.Data.splice(...)` → 先 COW；
  - 9 个文件加 `SharedEmptyData` 标记：`basic-tokens/{common,wrap-symbol,symbol,area-annotation,line-annotation,regex-token,shebang,bom}.xl.md`
    + `basic-tokens/string/const-string.xl.md`；
  - `core/syntax/basic-tokens/area-annotation.xl.md`：`field Tmp` / `Process` / `Undo` / `Default` / `ToXmlString` 改 chunk 两态。
- **要真的动 GC，方向不是「砍 basic token 的瞬时分配」，而是**：
  1. **减少每 parse 的存活形状树 / 晋升量**（每 parse 217k 形状 token 存活、约 30~40 MB 晋升 → 1 次 major + 每次
     scavenge 的复制成本）；
  2. **把 SourceRange 内联进 Token**（622k 个 SourceRange 对象 = 31 MB，占 22% 分配），这是结构改动、碰所有
     `.SourceRange.X` 访问点，风险高；
  3. basic token 的「造了又合并掉」（380k 个/parse）如果要治，只能让形状层少造 token（换实现，不是 micro-opt）。

---

## 8. 交付物

| 文件 | 内容 |
|---|---|
| `tmp/team/gc-alloc/alloc-ledger.mjs` + `ledger-base.json`（g1/g2 同名） | 账本：构造对象数、Data 变更、字符串来源、字节估算 |
| `tmp/team/gc-alloc/gc-observe.mjs` + `gc8-*.json` / `gc-*.json` | GC 次数/暂停/分布/堆（repeat 5 与 8） |
| `tmp/team/gc-alloc/trace-summary.mjs` + `nvp-*.txt` / `trace-*.txt` | `--trace-gc` / `--trace-gc-nvp` 交叉验证 |
| `tmp/team/gc-alloc/make-prototypes.cjs` | g1/g2 的全部 .js 补丁（可重放） |
| `tmp/team/gc-alloc/parse-once.cjs`、`heap-prof-summary.mjs`、`hp-*.heapprofile` | 分配剖面尝试（口径不可用，留证） |
| `build-g1/`、`build-g2/` | 两个原型 build 副本（gitignore） |

复现：

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example
node tmp/team/gc-alloc/alloc-ledger.mjs build --json tmp/team/gc-alloc/ledger-base.json
node --expose-gc tmp/team/gc-alloc/gc-observe.mjs build --repeat 8 --json tmp/team/gc-alloc/gc8-build.json
node tmp/team/gc-alloc/make-prototypes.cjs                       # 重建 build-g1 / build-g2（从现有 build 复制，见脚本内 fs.cpSync）
node tests/bench/buffer-equivalence.mjs --mode xml --base build --new build-g2 --quiet
node tests/bench/buffer-ab.mjs --base build --new build-g2 --repeat 11
```

## 9. 未完成 / 未验证项（如实列出）

- g1/g2 各只跑了 **1 组** `buffer-ab --repeat 11`（任务要求「至少 2 次运行」）；建议补跑 1 组确认符号。
- 门禁只跑了 `buffer-equivalence --mode xml`（4556 文件/34,109,694 字节全 PASS）；`validate` / `ast-json-diff` /
  `real-dts` / `token-ast` / `body-guard` 未跑（原型的结论是「不写回」，这些门禁不影响该结论）。
- `--heap-prof` 分配剖面口径失败（见 §6），字节构成仍以模型 + 计数为准。
- g2 的「注释字符串 −24 MB」是模型估算（`Tmp` 复制 12 MB + `endsWith` flatten 12 MB），未单独做字符串分配计数 A/B。
