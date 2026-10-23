# dependencies
```xl
import { Token } from "../token.xl.md"
```

# namespace cangjie

shadow 比较器（U1 裁决的唯一低成本证据）：同一份语料分别用 legacy 与 batch 两条路径解析，
比较**形状序列**、**XML digest** 与**形状数**。只用于测试/对拍构建，绝不进入性能测量路径。

# class ShadowSnapshot

## field Shapes:string = ""

形状序列：按树先序把每个 token 的运行时类型名串起来。

## field Count:int = 0

形状数（token 总数）。

## field Xml:string = ""

整棵树的 XML。

## field Digest:int = 0

XML 的整型摘要（与 `Shapes` 一起判断等价）。

# class ShadowCompare

## field Checks:int = 0

已比较次数。

## field Differences:int = 0

差异次数；成功对拍必须为 `0`。

## field Reports:Array<string> = []

差异说明（逐条可读，写进 HANDOFF）。

## static method Snapshot:(root:Token)=>ShadowSnapshot

取一份快照（不改树、不写文件）。

```ts
const snapshot = new ShadowSnapshot();
const names: string[] = [];
ShadowCompare.Collect(root, names);
snapshot.Shapes = names.join(",");
snapshot.Count = names.length;
snapshot.Xml = root.ToXmlString();
snapshot.Digest = ShadowCompare.Digest(snapshot.Xml);
return snapshot;
```

## static method Collect:(token:Token, names:Array<string>)=>void

按树先序收集类型名。

```ts
names.push(token.constructor.name);
for (const child of token.Data) {
  ShadowCompare.Collect(child, names);
}
```

## static method Digest:(text:string)=>int

稳定整型摘要（跨进程同结果；只用于对拍，不作为安全哈希）。

```ts
let hash = 0;
for (let i = 0; i < text.length; i++) {
  hash = (hash * 31 + text.charCodeAt(i)) | 0;
}
return hash;
```

## method Compare:(label:string, legacy:ShadowSnapshot, batch:ShadowSnapshot)=>bool

比较两份快照；完全一致返回 `true`。

```ts
this.Checks = this.Checks + 1;
if (legacy.Count === batch.Count && legacy.Digest === batch.Digest && legacy.Shapes === batch.Shapes) {
  return true;
}
this.Differences = this.Differences + 1;
this.Reports.push(`${label}: count ${legacy.Count} -> ${batch.Count}, digest ${legacy.Digest} -> ${batch.Digest}`);
return false;
```

## method Reset:()=>void

清空计数与报告。

```ts
this.Checks = 0;
this.Differences = 0;
this.Reports = [];
```
