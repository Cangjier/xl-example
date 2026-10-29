# 预期 token 树（逐字）：`for (v of xs) { }`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17
f o r   ( v   o f   x s )   {   } ⏎
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

## [char 5] `"v"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   └─ Common  src=[5,6)  text="v"
```

## [char 6] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=5  src=[5,6)  text="v"
   └─ WrapSymbol  src=[6,7)  text=" "
```

## [char 7] `"o"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=5  src=[5,6)  text="v"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ Common  src=[7,8)  text="o"
```

## [char 8] `"f"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=5  src=[5,6)  text="v"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ Common  src=[7,9)  text="of"
```

## [char 9] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=5  src=[5,6)  text="v"
   └─ WrapSymbol  src=[9,10)  text=" "
```

## [char 10] `"x"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=5  src=[5,6)  text="v"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ Common  src=[10,11)  text="x"
```

## [char 11] `"s"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=5  src=[5,6)  text="v"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ Common  src=[10,12)  text="xs"
```

## [char 12] `")"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForOfStatementShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=5  src=[5,6)  text="v"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ IdentifierShape  pos=9  src=[10,12)  text="xs"
```

## [char 13] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForOfStatementShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=5  src=[5,6)  text="v"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ IdentifierShape  pos=9  src=[10,12)  text="xs"
   └─ WrapSymbol  src=[13,14)  text=" "
```

## [char 14] `"{"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForOfStatementShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=5  src=[5,6)  text="v"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ IdentifierShape  pos=9  src=[10,12)  text="xs"
   ├─ WrapSymbol  src=[13,14)  text=" "
   └─ BlockShape  pos=13  src=[14,15)
```

## [char 15] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForOfStatementShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=5  src=[5,6)  text="v"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ IdentifierShape  pos=9  src=[10,12)  text="xs"
   ├─ WrapSymbol  src=[13,14)  text=" "
   └─ BlockShape  pos=13  src=[14,15)
      └─ WrapSymbol  src=[15,16)  text=" "
```

## [char 16] `"}"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForOfStatementShape  pos=0  src=[0,17)
   ├─ IdentifierShape  pos=5  src=[5,6)  text="v"
   ├─ IdentifierShape  pos=9  src=[10,12)  text="xs"
   └─ BlockShape  pos=13  src=[14,17)
```

## [char 17] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
├─ ForOfStatementShape  pos=0  src=[0,17)
│  ├─ IdentifierShape  pos=5  src=[5,6)  text="v"
│  ├─ IdentifierShape  pos=9  src=[10,12)  text="xs"
│  └─ BlockShape  pos=13  src=[14,17)
└─ WrapSymbol  src=[17,18)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,18)
└─ ForOfStatementShape  pos=0  src=[0,17)
   ├─ IdentifierShape  pos=5  src=[5,6)  text="v"
   ├─ IdentifierShape  pos=9  src=[10,12)  text="xs"
   └─ BlockShape  pos=13  src=[14,17)
```
