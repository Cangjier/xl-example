# catalog guide 与 shape token：设计

**实现见 [token_next/README.md](README.md)**：那一页记着「设计没写死、实现必须选一种」的那些缝
各自选了哪一档，以及探针实测逼出来的三处改动。

> **这一版实现收缩过了（按用户口径「先仅保留 token、source、document」），并且一个声明一页**：
> 整棵树现在只剩 `Token`（契约是 `IToken`，`Template` / `SyntaxContext` 各自成页）与 `Source` / `Document`
> 五个类型，加上两个模块级函数，落成 `token_next/core/` 下的七页——
> `token.xl.md` / `i-token.xl.md` / `template.xl.md` / `syntax-context.xl.md` / `source.xl.md` /
> `document.xl.md` / `common-util.xl.md`（后两页分别是 `Document` 与 `EscapeXmlText` + `FormatInto`）。
>
> ⇒ **本页以下都是设计意图，不是现状**：§1 树上的八格、§3 的 C1~C6、§3.1 的收敛、§4 的 create/converge、
> §5 的三种失败，在实现里**都还没有落地**（形状层、词法层、收敛机制这一轮全删了）。
> 留着这一页是因为它是那几页规范的**依据**——`Token` 上的 `MountedUnit` / `NotifyClosed` / `Finish` /
> `TakeLeading` / `InProduct` 这些钩子，每一个都指向本页的某一条。
> 现状与边界的完整清单在 [README.md](README.md)。

## 1. token 的树

```
Token
 ├─ CommonToken            通用字符块（名字、数字、字面量文本）
 ├─ SymbolToken            符号块
 ├─ Bracket                配对符号
 ├─ CommentToken           注释
 ├─ WrapToken              软换行
 ├─ StringToken            完整字符串支持（由模板配置，见 §2）
 ├─ RegexToken             正则支持
 └─ LanguageToken
      ├─ LanguageCatalogGuideToken → LanguageCatalogGuideTokens
      └─ LanguageShapeToken        → LanguageShapeTokens
```
---

## 2. branch


## 3. catalog guide

**状态**是一格可能形状池；**输入**是它自己 data 里积压的已关闭 token；**输出**是收敛成唯一形状。

| # | 契约 | 内容 |
| --- | --- | --- |
| **C1** | 挂载在树里 | 它是一个真实单元，`MountedUnit` 指在它身上，字符经它转给子单元 |
| **C2** | 池的初始值由**挂它的那个** shape 声明 | 挂载方声明"我的下面可能有哪些子形状" |
| **C3** | 只读自己那一部分 | 只有它自己的 data 与它自己的状态；不看未读到的字符 |
| **C4** | 收敛是纯的 | 不改树、不建单元、不关闭别人 |
| **C5** | 池单调不增 | 初始池取最保守的完全集合 |
| **C6** | 不进产物 | 它不产生产物节点，且这一点必须显式声明 |


### 3.1 收敛形状函数

```
converge(guide,可能形状池) -> 可能形状池
```

| 项 | 是什么 |
| --- | --- |
| 输入 | guide 自己 data 里积压的那些已关闭 token，当前可能形状池 |
| 输出 | 修改后，缩小（或不变）之后的池 |

- **关闭** 只是一个**触发信号**。
- **它不是识别器，是排除器**；识别是排除到只剩一个之后的副产品。单调性因此是构造出来的。

---

## 4. 生命周期

- create     由shape token构造时创建并自动挂载
- converge   basic token 关闭 → 触发一次收敛 ：basic token关闭时通过parent往上找到catalog guide token
- resolve    池 == 1 → 建出那个形状的 token
- exit       当所在Shape Token结束时，MoveDataTo Parent(Shape token) → RemoveSelf

---

## 5. 失败与收敛失败

三种，不许混：

| 情形 | 含义 | 行为 |
| --- | --- | --- |
| **池 = 0** | 某个事件把**最后一个**可能形状也排除了 | **设计缺陷**：收敛表那一格**划多了**。报错带证据：哪一次关闭、那个 token 是什么、清空前池里有什么 |
| **构造结束仍 > 1** | 池太宽，或缺一条判别事件 | 需要"构造结束"事件（外层 shape 关闭 / 输入结束）才能判 |
| **池 = 1 但是错的** | 收敛把事件序列接受成了错的形状 | 形式化上**不可判定**。承认它存在，只由**逐字节等价**兜底 |

---
