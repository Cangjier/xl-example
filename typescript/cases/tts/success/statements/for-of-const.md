# 预期 token 树（逐字）：`for (const v of xs) { }`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23
f o r   ( c o n s t   v   o f   x s )   {   } ⏎
```

## [char 0] `"f"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,1)  text="f"
```

## [char 1] `"o"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,2)  text="fo"
```

## [char 2] `"r"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,3)  text="for"
```

## [char 3] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   └─ WrapSymbol  src=[3,4)  text=" "
```

## [char 4] `"("`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
```

## [char 5] `"c"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   └─ Common  src=[5,6)  text="c"
```

## [char 6] `"o"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   └─ Common  src=[5,7)  text="co"
```

## [char 7] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   └─ Common  src=[5,8)  text="con"
```

## [char 8] `"s"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   └─ Common  src=[5,9)  text="cons"
```

## [char 9] `"t"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   └─ Common  src=[5,10)  text="const"
```

## [char 10] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ Common  src=[5,10)  text="const"
   └─ WrapSymbol  src=[10,11)  text=" "
```

## [char 11] `"v"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ Common  src=[5,10)  text="const"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ Common  src=[11,12)  text="v"
```

## [char 12] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ VariableDeclarationListShape  pos=5  src=[5,12)
   │  └─ VariableDeclarationShape  pos=10  src=[11,12)
   │     └─ IdentifierShape  pos=10  src=[11,12)  text="v"
   └─ WrapSymbol  src=[12,13)  text=" "
```

## [char 13] `"o"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ VariableDeclarationListShape  pos=5  src=[5,12)
   │  └─ VariableDeclarationShape  pos=10  src=[11,12)
   │     └─ IdentifierShape  pos=10  src=[11,12)  text="v"
   ├─ WrapSymbol  src=[12,13)  text=" "
   └─ Common  src=[13,14)  text="o"
```

## [char 14] `"f"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ VariableDeclarationListShape  pos=5  src=[5,12)
   │  └─ VariableDeclarationShape  pos=10  src=[11,12)
   │     └─ IdentifierShape  pos=10  src=[11,12)  text="v"
   ├─ WrapSymbol  src=[12,13)  text=" "
   └─ Common  src=[13,15)  text="of"
```

## [char 15] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ VariableDeclarationListShape  pos=5  src=[5,12)
   │  └─ VariableDeclarationShape  pos=10  src=[11,12)
   │     └─ IdentifierShape  pos=10  src=[11,12)  text="v"
   └─ WrapSymbol  src=[15,16)  text=" "
```

## [char 16] `"x"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ VariableDeclarationListShape  pos=5  src=[5,12)
   │  └─ VariableDeclarationShape  pos=10  src=[11,12)
   │     └─ IdentifierShape  pos=10  src=[11,12)  text="v"
   ├─ WrapSymbol  src=[15,16)  text=" "
   └─ Common  src=[16,17)  text="x"
```

## [char 17] `"s"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ VariableDeclarationListShape  pos=5  src=[5,12)
   │  └─ VariableDeclarationShape  pos=10  src=[11,12)
   │     └─ IdentifierShape  pos=10  src=[11,12)  text="v"
   ├─ WrapSymbol  src=[15,16)  text=" "
   └─ Common  src=[16,18)  text="xs"
```

## [char 18] `")"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForOfStatementShape  pos=0  src=[0,...)
   ├─ VariableDeclarationListShape  pos=5  src=[5,12)
   │  └─ VariableDeclarationShape  pos=10  src=[11,12)
   │     └─ IdentifierShape  pos=10  src=[11,12)  text="v"
   ├─ WrapSymbol  src=[15,16)  text=" "
   └─ IdentifierShape  pos=15  src=[16,18)  text="xs"
```

## [char 19] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForOfStatementShape  pos=0  src=[0,...)
   ├─ VariableDeclarationListShape  pos=5  src=[5,12)
   │  └─ VariableDeclarationShape  pos=10  src=[11,12)
   │     └─ IdentifierShape  pos=10  src=[11,12)  text="v"
   ├─ WrapSymbol  src=[15,16)  text=" "
   ├─ IdentifierShape  pos=15  src=[16,18)  text="xs"
   └─ WrapSymbol  src=[19,20)  text=" "
```

## [char 20] `"{"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForOfStatementShape  pos=0  src=[0,...)
   ├─ VariableDeclarationListShape  pos=5  src=[5,12)
   │  └─ VariableDeclarationShape  pos=10  src=[11,12)
   │     └─ IdentifierShape  pos=10  src=[11,12)  text="v"
   ├─ WrapSymbol  src=[15,16)  text=" "
   ├─ IdentifierShape  pos=15  src=[16,18)  text="xs"
   ├─ WrapSymbol  src=[19,20)  text=" "
   └─ BlockShape  pos=19  src=[20,21)
```

## [char 21] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForOfStatementShape  pos=0  src=[0,...)
   ├─ VariableDeclarationListShape  pos=5  src=[5,12)
   │  └─ VariableDeclarationShape  pos=10  src=[11,12)
   │     └─ IdentifierShape  pos=10  src=[11,12)  text="v"
   ├─ WrapSymbol  src=[15,16)  text=" "
   ├─ IdentifierShape  pos=15  src=[16,18)  text="xs"
   ├─ WrapSymbol  src=[19,20)  text=" "
   └─ BlockShape  pos=19  src=[20,21)
      └─ WrapSymbol  src=[21,22)  text=" "
```

## [char 22] `"}"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForOfStatementShape  pos=0  src=[0,23)
   ├─ VariableDeclarationListShape  pos=5  src=[5,12)
   │  └─ VariableDeclarationShape  pos=10  src=[11,12)
   │     └─ IdentifierShape  pos=10  src=[11,12)  text="v"
   ├─ IdentifierShape  pos=15  src=[16,18)  text="xs"
   └─ BlockShape  pos=19  src=[20,23)
```

## [char 23] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
├─ ForOfStatementShape  pos=0  src=[0,23)
│  ├─ VariableDeclarationListShape  pos=5  src=[5,12)
│  │  └─ VariableDeclarationShape  pos=10  src=[11,12)
│  │     └─ IdentifierShape  pos=10  src=[11,12)  text="v"
│  ├─ IdentifierShape  pos=15  src=[16,18)  text="xs"
│  └─ BlockShape  pos=19  src=[20,23)
└─ WrapSymbol  src=[23,24)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,24)
└─ ForOfStatementShape  pos=0  src=[0,23)
   ├─ VariableDeclarationListShape  pos=5  src=[5,12)
   │  └─ VariableDeclarationShape  pos=10  src=[11,12)
   │     └─ IdentifierShape  pos=10  src=[11,12)  text="v"
   ├─ IdentifierShape  pos=15  src=[16,18)  text="xs"
   └─ BlockShape  pos=19  src=[20,23)
```
