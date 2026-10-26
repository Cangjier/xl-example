# 预期示例
以下预期示例是一个样本，不一定完全正确，但符合大致预期。

# 预期 token 树（逐字）：`let x = 2*3+1`

只有一个 `Data`，没有 `Raw`。basic token 直接挂到**当前正在等它的 shape** 的 `Data` 下
（char 5–9 是 `VariableDeclarationShape`；char 10 的 `Common("3")` 进 `BinaryExpressionShape(*)`；
char 12 的 `Common("1")` 进 `BinaryExpressionShape(+)`）；被 shape 消费时**原位替换/移入**；
收口时把剩余的 basic token（空格、`=`）清掉。

- `pos`：AST 起点（含前导 trivia）；`src=[start,end)`：代码区间（半开）；`未封`：该刻终点还没封口。
- `text`：`EscapedText` / `Text`；`op`：运算符 token 文本（由 `src` 切片）。
- `let` 单独关闭时仍可能是 `let = 1`，所以 char 3/4 只有 raw 单元；`x` 关闭（char 5）才确定语句族。

```text
0 1 2 3 4 5 6 7 8 9 10 11 12
l e t   x   =   2 * 3  +  1
```

## [char 0] `"l"`

```text
SourceFileShape  pos=-  src=[0,未封)
└─ Common  src=[0,1)  text="l"
```

## [char 1] `"e"`

```text
SourceFileShape  pos=-  src=[0,未封)
└─ Common  src=[0,2)  text="le"
```

## [char 2] `"t"`

```text
SourceFileShape  pos=-  src=[0,未封)
└─ Common  src=[0,3)  text="let"
```

## [char 3] `" "`

```text
SourceFileShape  pos=-  src=[0,未封)
├─ Common  src=[0,3)  text="let"
└─ WrapSymbol  src=[3,4)  text=" "
```

## [char 4] `"x"`

```text
SourceFileShape  pos=-  src=[0,未封)
├─ Common  src=[0,3)  text="let"
├─ WrapSymbol  src=[3,4)  text=" "
└─ Common  src=[4,5)  text="x"
```

## [char 5] `" "`（x 关闭 → 语句族确定）

```text
SourceFileShape  pos=-  src=[0,未封)
└─ VariableStatementShape  pos=0  src=[0,未封)
   └─ VariableDeclarationListShape  pos=0  src=[0,未封)
      └─ VariableDeclarationShape  pos=3  src=[4,未封)
         ├─ IdentifierShape  pos=3  src=[4,5)  text="x"
         └─ WrapSymbol  src=[5,6)  text=" "
```

## [char 6] `"="`

```text
SourceFileShape  pos=-  src=[0,未封)
└─ VariableStatementShape  pos=0  src=[0,未封)
   └─ VariableDeclarationListShape  pos=0  src=[0,未封)
      └─ VariableDeclarationShape  pos=3  src=[4,未封)
         ├─ IdentifierShape  pos=3  src=[4,5)  text="x"
         ├─ WrapSymbol  src=[5,6)  text=" "
         └─ Symbol  src=[6,7)  text="="
```

## [char 7] `" "`

```text
SourceFileShape  pos=-  src=[0,未封)
└─ VariableStatementShape  pos=0  src=[0,未封)
   └─ VariableDeclarationListShape  pos=0  src=[0,未封)
      └─ VariableDeclarationShape  pos=3  src=[4,未封)
         ├─ IdentifierShape  pos=3  src=[4,5)  text="x"
         ├─ WrapSymbol  src=[5,6)  text=" "
         ├─ Symbol  src=[6,7)  text="="
         └─ WrapSymbol  src=[7,8)  text=" "
```

## [char 8] `"2"`

```text
SourceFileShape  pos=-  src=[0,未封)
└─ VariableStatementShape  pos=0  src=[0,未封)
   └─ VariableDeclarationListShape  pos=0  src=[0,未封)
      └─ VariableDeclarationShape  pos=3  src=[4,未封)
         ├─ IdentifierShape  pos=3  src=[4,5)  text="x"
         ├─ WrapSymbol  src=[5,6)  text=" "
         ├─ Symbol  src=[6,7)  text="="
         ├─ WrapSymbol  src=[7,8)  text=" "
         └─ Common  src=[8,9)  text="2"
```

## [char 9] `"*"`（2 关闭 → Common 原位换成 NumericLiteral）

```text
SourceFileShape  pos=-  src=[0,未封)
└─ VariableStatementShape  pos=0  src=[0,未封)
   └─ VariableDeclarationListShape  pos=0  src=[0,未封)
      └─ VariableDeclarationShape  pos=3  src=[4,未封)
         ├─ IdentifierShape  pos=3  src=[4,5)  text="x"
         ├─ WrapSymbol  src=[5,6)  text=" "
         ├─ Symbol  src=[6,7)  text="="
         ├─ WrapSymbol  src=[7,8)  text=" "
         ├─ NumericLiteralShape  pos=7  src=[8,9)  text="2"
         └─ Symbol  src=[9,10)  text="*"
```

## [char 10] `"3"`（* 关闭 → BinaryExpressionShape(*) 原位替换 2 的位置）

```text
SourceFileShape  pos=-  src=[0,未封)
└─ VariableStatementShape  pos=0  src=[0,未封)
   └─ VariableDeclarationListShape  pos=0  src=[0,未封)
      └─ VariableDeclarationShape  pos=3  src=[4,未封)
         ├─ IdentifierShape  pos=3  src=[4,5)  text="x"
         ├─ WrapSymbol  src=[5,6)  text=" "
         ├─ Symbol  src=[6,7)  text="="
         ├─ WrapSymbol  src=[7,8)  text=" "
         └─ BinaryExpressionShape  pos=7  src=[8,未封)
            ├─ NumericLiteralShape  pos=7  src=[8,9)  text="2"
            ├─ AsteriskTokenShape  pos=9  src=[9,10)  op="*"
            └─ Common  src=[10,11)  text="3"
```

## [char 11] `"+"`（3 关闭 → 原位换成 NumericLiteral；Binary(*) 的右边界 = 3 的 end，当场封 [8,11)）

```text
SourceFileShape  pos=-  src=[0,未封)
└─ VariableStatementShape  pos=0  src=[0,未封)
   └─ VariableDeclarationListShape  pos=0  src=[0,未封)
      └─ VariableDeclarationShape  pos=3  src=[4,未封)
         ├─ IdentifierShape  pos=3  src=[4,5)  text="x"
         ├─ WrapSymbol  src=[5,6)  text=" "
         ├─ Symbol  src=[6,7)  text="="
         ├─ WrapSymbol  src=[7,8)  text=" "
         ├─ BinaryExpressionShape  pos=7  src=[8,11)   ← 3 关闭即封口
         │  ├─ NumericLiteralShape  pos=7  src=[8,9)  text="2"
         │  ├─ AsteriskTokenShape  pos=9  src=[9,10)  op="*"
         │  └─ NumericLiteralShape  pos=10  src=[10,11)  text="3"
         └─ Symbol  src=[11,12)  text="+"
```

## [char 12] `"1"`（+ 关闭 → BinaryExpressionShape(+) 原位替换 Binary(*) 的位置）

```text
SourceFileShape  pos=-  src=[0,未封)
└─ VariableStatementShape  pos=0  src=[0,未封)
   └─ VariableDeclarationListShape  pos=0  src=[0,未封)
      └─ VariableDeclarationShape  pos=3  src=[4,未封)
         ├─ IdentifierShape  pos=3  src=[4,5)  text="x"
         ├─ WrapSymbol  src=[5,6)  text=" "
         ├─ Symbol  src=[6,7)  text="="
         ├─ WrapSymbol  src=[7,8)  text=" "
         └─ BinaryExpressionShape  pos=7  src=[8,未封)
            ├─ BinaryExpressionShape  pos=7  src=[8,11)
            │  ├─ NumericLiteralShape  pos=7  src=[8,9)  text="2"
            │  ├─ AsteriskTokenShape  pos=9  src=[9,10)  op="*"
            │  └─ NumericLiteralShape  pos=10  src=[10,11)  text="3"
            ├─ PlusTokenShape  pos=11  src=[11,12)  op="+"
            └─ Common  src=[12,13)  text="1"
```

## [EOF]（`Common("1")` 原位换成 NumericLiteral；清掉剩余 basic token，只封区间）

```text
SourceFileShape  pos=-  src=[0,13)
└─ VariableStatementShape  pos=0  src=[0,13)
   └─ VariableDeclarationListShape  pos=0  src=[0,13)
      └─ VariableDeclarationShape  pos=3  src=[4,13)
         ├─ IdentifierShape  pos=3  src=[4,5)  text="x"
         └─ BinaryExpressionShape  pos=7  src=[8,13)
            ├─ BinaryExpressionShape  pos=7  src=[8,11)
            │  ├─ NumericLiteralShape  pos=7  src=[8,9)  text="2"
            │  ├─ AsteriskTokenShape  pos=9  src=[9,10)  op="*"
            │  └─ NumericLiteralShape  pos=10  src=[10,11)  text="3"
            ├─ PlusTokenShape  pos=11  src=[11,12)  op="+"
            └─ NumericLiteralShape  pos=12  src=[12,13)  text="1"
```
