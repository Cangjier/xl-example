# dependencies
```xl
import { AstNode, NodeKind, ListOf, TextOf } from "./lowering.xl.md"
```

# namespace cangjie

**作用域与捕获**：哪些变量必须离开「帧的槽」、搬进**环境记录**。

**为什么必须有环境**：槽是**帧**的，帧一返回就没了。内层函数如果引用了外层变量，
它的寿命比那个帧长——值必须搬到一个**自己活得久**的地方。那个地方就是环境记录
（`runtime/heap.xl.md` 的 `HeapEnv`，引擎侧的 `EnvNew`/`EnvGet`/`EnvSet` 早有判据跑过）。

**这一层的两条规则，都是「保守但正确」：**

1. **判定捕获：保守。** 一个变量要不要进环境，看**内层函数体里出现过同名的标识符**
   就进。不做重名消解、不做精确的活跃性分析——**多捕一个只是多一格，少捕一个是错值**。
   这一条值得写下来：精确分析省下的那点内存，换不来一次静默的错值。
2. **深度：按「谁开过环境」数。** 引擎的 `EnvGet`/`EnvSet` 用 `depth` 走父链
   （`runtime/ir.xl.md`）。一个函数**开了**环境，它就是一个层级；没开的不算层级
   （它的 `frame.Env` 直接就是闭包带进来的那一份）。于是
   `depth = 从里往外数，目标环境排第几`——**链尾是当前帧的环境，深度 0**。

**为什么每个「含有内层函数」的函数都要开一个环境，哪怕它自己一个变量也不捕获**：
环境值是**靠槽往下传的**（闭包的环境参数是一个 `Value`）。中间那一层如果不开环境，
它手上就没有「环境」这个值可以交给更内层的闭包——于是内层拿不到祖父的环境。
开一个**空格子的环境**（`EnvNew B=0`）就把这一环接上了，代价是一个空对象。

**为什么遍历不认 `kind`**：投影的约定是「子节点挂在命名字段上、数组就是序列」
（`lowering.xl.md` 文首），所以遍历只要认这个约定就够。
**枚举每一种 `SyntaxKind` 的子字段**会在投影加一个节点时悄悄漏掉整棵子树——
而漏掉的后果是**少捕一个变量**，也就是上面说的错值。认约定，不认名单。

**这一轮还没做**（各自都有明确的下一步）：`var` 的提升（函数内 `var` 提到函数顶）、
`let` 的 TDZ、`for` 每次迭代新建绑定、`catch` 参数的块作用域。

# class Access

**一个名字怎么访问**：在槽里，还是在某个环境格里。

两种可能的形状合成一个类型，调用方因此不必写两条分支——**而且它把「是哪种」
变成编译期就必须回答的问题**（`InEnv` 为假时 `Depth`/`Cell` 无意义，
这一点由两个工厂函数保证）。

## field InEnv:bool = false

假 = 在槽里（`Slot` 有效）；真 = 在环境里（`Depth` 与 `Cell` 有效）。

## field Slot:int = -1

槽号（`InEnv` 为假时有效）。

## field Depth:int = 0

环境深度（0 = 当前帧的环境）。

## field Cell:int = 0

环境里的第几格。

## static method Local:(slot:int)=>Access

在槽里。

```ts
const result = new Access();
result.Slot = slot;
return result;
```

## static method Captured:(depth:int, cell:int)=>Access

在环境里。

```ts
const result = new Access();
result.InEnv = true;
result.Depth = depth;
result.Cell = cell;
return result;
```

# class EnvScope

**一个环境记录里放了什么**：名字 → 格号，加上「这个环境的值在谁的哪一格里」
（往内层传的时候要用它）。

## field Names:Array<string> = []

这一层环境放了哪些名字。

## field Cells:Array<int> = []

每个名字占第几格。

## field Slot:int = -1

**这个环境的值在拥有者帧的哪一格**（闭包的环境参数就是从这一格取的）。

## constructor:(slot:int)=>void

记下这个环境的值在拥有者帧的哪一格。

```ts
this.Slot = slot;
```

## method Declare:(name:string, cell:int)=>void

把一对名字 / 格号记进来。

```ts
this.Names.push(name);
this.Cells.push(cell);
```

## method Resolve:(name:string)=>int

这一层环境里有没有这个名字；`-1` 表示没有。

```ts
for (let i = this.Names.length - 1; i >= 0; i--) {
  if (this.Names[i] === name) return this.Cells[i];
}
return -1;
```

# class EnvRef

**一次环境命中**：深度 + 格号。

## field Depth:int = 0

深度（0 = 当前帧的环境）。

## field Cell:int = 0

格号。

## constructor:(depth:int, cell:int)=>void

记一次命中。

```ts
this.Depth = depth;
this.Cell = cell;
```

# class EnvChain

**从外到里的一条环境链**：链尾是当前帧的环境。

**它是可拷贝的**，而且**必须拷贝**：内层函数体是在外层函数降级**完之后**才降级的
（指令必须连续，见 `lowering.xl.md` 的 `PendingFunction`），那时候外层的链早就退栈了。
所以每个排队函数在**登记的那一刻**把链抄一份带走——链里的 `EnvScope` 那时已经定型，
抄一层壳就够（**浅拷贝是对的，深拷贝是浪费**：拷贝之后没有人再改它们）。

## field Scopes:Array<EnvScope> = []

从外到里的环境层（链尾是当前帧的环境）。

## method Clone:()=>EnvChain

抄一份（只抄壳）。

```ts
const result = new EnvChain();
for (let i = 0; i < this.Scopes.length; i++) {
  result.Scopes.push(this.Scopes[i]);
}
return result;
```

## method Push:(scope:EnvScope)=>void

往链尾加一层（降级一个函数体时，先给它开环境、再 `Push`）。

```ts
this.Scopes.push(scope);
```

## method Last:()=>EnvScope | null

链尾（当前帧的环境）；空链给 `null`。

```ts
if (this.Scopes.length === 0) return null;
return this.Scopes[this.Scopes.length - 1];
```

## method Pop:()=>void

退掉链尾那一层（降级完一个函数体、或者退出一段「每轮新环境」的循环时）。

**它必须与 `Push` 成对**：链尾就是「当前帧的环境」，多留一层会让后面所有深度整体偏一位。

```ts
if (this.Scopes.length > 0) this.Scopes.pop();
```

## method Depth:()=>int

链长（也就是层数）。

```ts
return this.Scopes.length;
```

## method Resolve:(name:string)=>EnvRef | null

从里往外找；`null` 表示这条链上没有。

**深度是「从链尾数」**：链尾（当前帧的环境）深度 0，往外一层深度 1。

```ts
for (let i = this.Scopes.length - 1; i >= 0; i--) {
  const cell = this.Scopes[i].Resolve(name);
  if (cell >= 0) return new EnvRef(this.Scopes.length - 1 - i, cell);
}
return null;
```

# method WalkChildren:(node:AstNode, visit:(child:AstNode)=>void)=>void

**认约定、不认名单**的遍历：把每个「长得像节点」的字段交给 `visit`。

判定「像节点」只有一条：**是个对象，而且有一个字符串 `kind`**。
数组按序列走；`pos` / `end` 是数字、`kind` 是字符串，都不满足，自然不进去。

```ts
const keys = Object.keys(node);
for (let i = 0; i < keys.length; i++) {
  const value = node[keys[i]];
  if (value === null || value === undefined) continue;
  if (typeof value !== "object") continue;
  if (Array.isArray(value)) {
    const items = value as AstNode[];
    for (let j = 0; j < items.length; j++) {
      const item = items[j];
      if (item !== null && item !== undefined && typeof item["kind"] === "string") {
        visit(item);
      }
    }
    continue;
  }
  if (typeof (value as AstNode)["kind"] === "string") {
    visit(value as AstNode);
  }
}
```

# method IsFunctionNode:(node:AstNode)=>bool

这三种节点**自带一层作用域**（`this`/参数/名的归属都在它们里面）。

```ts
const kind = NodeKind(node);
return kind === "FunctionDeclaration" || kind === "FunctionExpression"
  || kind === "ArrowFunction";
```

# method CollectFunctionNames:(body:AstNode, out:Array<string>)=>void

**这一层函数声明的名字**（内层函数体不再进去——它们属于内层）。

它就是「提升」将来要用的那张名单，也是判定「这一层有没有内层函数」的根据。

```ts
WalkChildren(body, (child) => {
  if (NodeKind(child) === "FunctionDeclaration") {
    const name = child["name"];
    if (name !== undefined && name !== null && typeof name === "object") {
      out.push(TextOf(name as AstNode));
    }
    return;
  }
  if (IsFunctionNode(child)) return;
  CollectFunctionNames(child, out);
});
```

# method CollectDeclaredNames:(body:AstNode, out:Array<string>)=>void

**这一层声明出来的名字**：变量、函数、参数（内层函数体不进去）。

「名字出现在 `name` 字段上」这件事在投影里对 `VariableDeclaration` / `FunctionDeclaration` /
`Parameter` 是一致的——所以这里仍然只认三种 `kind` 加一条字段约定，
**而不是枚举每一种可能带 `name` 的节点**（枚举漏一个就是少一个声明，
后果是「以为是捕获、其实是本层变量」这种反过来的错）。

```ts
const kind = NodeKind(body);
if (kind === "VariableDeclaration" || kind === "FunctionDeclaration" || kind === "Parameter"
  || kind === "ClassDeclaration") {
  const name = body["name"];
  if (name !== undefined && name !== null && typeof name === "object") {
    CollectPatternNames(name as AstNode, out);
  }
}
if (IsFunctionNode(body)) return;
WalkChildren(body, (child) => {
  CollectDeclaredNames(child, out);
});
```

# method CollectInsideFunctions:(body:AstNode, inside:int, out:Array<string>)=>void

**内层函数体里出现过的所有标识符**。

`inside` 是「已经进了几层函数」：这一层函数自己的语句（`inside === 0`）不算捕获，
只有进了内层函数才算——**这正是「捕获」的定义**。

**保守之处**：内层函数自己声明的名字也会被收进来。那只会让外层多开一格，
而「少开一格」的后果是内层的读写到别处去——**两害相权，取多**。

```ts
const kind = NodeKind(body);
const next = IsFunctionNode(body) ? inside + 1 : inside;
if (kind === "Identifier" && inside > 0) {
  out.push(TextOf(body));
}
// **`for..in` 隐含用到全局名 `Object`**（它落成 `Object.keys` + 迭代协议）：
// 源码里没有 `Object` 这个标识符，可**内层函数真的会去读外层的它**——
// 不在这里记一笔，外层就不会为它留格子，内层跑到那儿才报「未知名字」。
if (kind === "ForInStatement" && inside > 0) {
  out.push("Object");
}
// **带 `extends` 的类，基类名一律算捕获**（保守，多留一格无害）：
// 子类构造函数里的 `super(...)` 要**从环境上读到父类构造函数**，
// 而 `super` 在投影里是一个 `SuperKeyword`——**不是标识符**，捕获分析看不见它。
if (kind === "ClassDeclaration" || kind === "ClassExpression") {
  const heritage = body["heritageClauses"];
  if (heritage !== undefined && heritage !== null) {
    const clauses = heritage as Array<AstNode>;
    if (clauses.length > 0) {
      const types = clauses[0]["types"] as Array<AstNode>;
      const base = types[0]["expression"] as AstNode;
      if (base !== undefined && base !== null && NodeKind(base) === "Identifier") {
        out.push(TextOf(base));
      }
    }
  }
}
WalkChildren(body, (child) => {
  CollectInsideFunctions(child, next, out);
});
```

# method CollectHoistedVars:(body:AstNode, out:Array<string>)=>void

**这一层函数作用域里的 `var` 名字**：含嵌套块里的，**不进内层函数**。

`var` 与 `let` 的区别就在这一条：`var` 属于**函数**，`let` 属于**块**。
所以判定必须看**声明列表自己的 `flags`**（`"Var"` / `"Let"` / `"Const"`），
而不是看它出现在哪一层——**位置决定不了它的作用域，声明方式才决定**。

```ts
const kind = NodeKind(body);
if (IsFunctionNode(body)) return;
if (kind === "VariableStatement") {
  const rawList = body["declarationList"];
  if (rawList !== undefined && rawList !== null && typeof rawList === "object") {
    const list = rawList as AstNode;
    if (list["flags"] === "Var") {
      const rawDeclarations = list["declarations"];
      if (rawDeclarations !== undefined && rawDeclarations !== null) {
        const declarations = rawDeclarations as AstNode[];
        for (let i = 0; i < declarations.length; i++) {
          const rawName = declarations[i]["name"];
          if (rawName !== undefined && rawName !== null && typeof rawName === "object") {
            const name = rawName as AstNode;
            if (NodeKind(name) === "Identifier") out.push(TextOf(name));
          }
        }
      }
    }
  }
}
WalkChildren(body, (child) => {
  CollectHoistedVars(child, out);
});
```

# method HasNestedFunction:(body:AstNode, inside:int)=>bool

**这一层里面有没有函数值**（声明 / 表达式 / 箭头 / 方法，全都算）。

**为什么不能只看函数声明**：`const f = () => 1;` 里没有一条 `FunctionDeclaration`，
但它一样需要环境——**闭包的环境是靠槽往下传的**，这一层不开环境，
闭包就只能从祖先帧的槽号里读一个**属于别人的格子**（判据报的是
`new_closure needs an environment or undefined`，而真正错的是这一层的环境根本没开）。

```ts
if (inside > 0) return true;
const kind = NodeKind(body);
const next = IsFunctionNode(body) ? inside + 1 : inside;
let found = false;
WalkChildren(body, (child) => {
  if (HasNestedFunction(child, next)) found = true;
});
return found;
```

# method CollectPatternNames:(pattern:AstNode, out:Array<string>)=>void

**一个绑定模式里的名字**（`{a, b: c}` / `[x, , y]`，可以嵌套）。

**为什么收集器必须看进去**：`const {a} = o; function f() { return a; }` 里
`a` 是要**捕获**的——收集器只认 `Identifier` 的话，`a` 就不在声明名单里，
于是「本层变量」被当成「未知名字」，报的是一句与现场无关的话。

```ts
const kind = NodeKind(pattern);
if (kind === "Identifier") {
  out.push(TextOf(pattern));
  return;
}
if (kind === "ObjectBindingPattern" || kind === "ArrayBindingPattern") {
  const elements = pattern["elements"];
  if (elements === undefined || elements === null) return;
  const items = elements as AstNode[];
  for (let i = 0; i < items.length; i++) {
    CollectPatternNames(items[i], out);
  }
  return;
}
if (kind === "BindingElement") {
  const name = pattern["name"];
  if (name !== undefined && name !== null && typeof name === "object") {
    CollectPatternNames(name as AstNode, out);
  }
  return;
}
// 其余（默认值 / 剩余参数）不在这里处理：降级层会为它们报错
```

# method HasArrowFunction:(body:AstNode)=>bool

**这一层里面有没有箭头函数**——**不进别的函数**。

**「不进别的函数」是这条判据的全部要点**：箭头挂在谁身上是**那一层**的事；
一个普通函数（声明 / 表达式 / 方法）有它自己的 `this`，它里面的箭头归它管。
少了这一条，**每一层含函数值的函数都会建一个 `this` 格**，而嵌套函数会从
外层那个格读到**外层那个接收者**（判据报的是 `no environment in this frame`，
以及「方法里的 `this.v` 读成了 0」——**看起来像两处错，其实是这一条**）。

```ts
let found = false;
WalkChildren(body, (child) => {
  if (NodeKind(child) === "ArrowFunction") {
    found = true;
    return;
  }
  if (IsFunctionNode(child)) return;
  if (HasArrowFunction(child)) found = true;
});
return found;
```

# method Contains:(items:Array<string>, name:string)=>bool

```ts
for (let i = 0; i < items.length; i++) {
  if (items[i] === name) return true;
}
return false;
```

# method CapturedNames:(body:AstNode, declared:Array<string>)=>Array<string>

**要搬进环境的那些名字**：本层声明的名字 ∩ 内层函数体里出现过的标识符。

顺序跟着 `declared`——于是同一份源码每次降级得到的格号都一样（**确定性**）。

```ts
const referenced: string[] = [];
CollectInsideFunctions(body, 0, referenced);
const result: string[] = [];
for (let i = 0; i < declared.length; i++) {
  if (Contains(referenced, declared[i]) && !Contains(result, declared[i])) {
    result.push(declared[i]);
  }
}
return result;
```
