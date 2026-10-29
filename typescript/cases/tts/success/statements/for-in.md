# 预期 token 树（逐字）：`for (k in o) { }`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16
f o r   ( k   i n   o )   {   } ⏎
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

## [char 5] `"k"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   └─ Common  src=[5,6)  text="k"
```

## [char 6] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=5  src=[5,6)  text="k"
   └─ WrapSymbol  src=[6,7)  text=" "
```

## [char 7] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=5  src=[5,6)  text="k"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ Common  src=[7,8)  text="i"
```

## [char 8] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=5  src=[5,6)  text="k"
   ├─ WrapSymbol  src=[6,7)  text=" "
   └─ Common  src=[7,9)  text="in"
```

## [char 9] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=5  src=[5,6)  text="k"
   └─ WrapSymbol  src=[9,10)  text=" "
```

## [char 10] `"o"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=5  src=[5,6)  text="k"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ Common  src=[10,11)  text="o"
```

## [char 11] `")"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForInStatementShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=5  src=[5,6)  text="k"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ IdentifierShape  pos=9  src=[10,11)  text="o"
```

## [char 12] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForInStatementShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=5  src=[5,6)  text="k"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ IdentifierShape  pos=9  src=[10,11)  text="o"
   └─ WrapSymbol  src=[12,13)  text=" "
```

## [char 13] `"{"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForInStatementShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=5  src=[5,6)  text="k"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ IdentifierShape  pos=9  src=[10,11)  text="o"
   ├─ WrapSymbol  src=[12,13)  text=" "
   └─ BlockShape  pos=12  src=[13,14)
```

## [char 14] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForInStatementShape  pos=0  src=[0,...)
   ├─ IdentifierShape  pos=5  src=[5,6)  text="k"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ IdentifierShape  pos=9  src=[10,11)  text="o"
   ├─ WrapSymbol  src=[12,13)  text=" "
   └─ BlockShape  pos=12  src=[13,14)
      └─ WrapSymbol  src=[14,15)  text=" "
```

## [char 15] `"}"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForInStatementShape  pos=0  src=[0,16)
   ├─ IdentifierShape  pos=5  src=[5,6)  text="k"
   ├─ IdentifierShape  pos=9  src=[10,11)  text="o"
   └─ BlockShape  pos=12  src=[13,16)
```

## [char 16] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
├─ ForInStatementShape  pos=0  src=[0,16)
│  ├─ IdentifierShape  pos=5  src=[5,6)  text="k"
│  ├─ IdentifierShape  pos=9  src=[10,11)  text="o"
│  └─ BlockShape  pos=12  src=[13,16)
└─ WrapSymbol  src=[16,17)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,17)
└─ ForInStatementShape  pos=0  src=[0,16)
   ├─ IdentifierShape  pos=5  src=[5,6)  text="k"
   ├─ IdentifierShape  pos=9  src=[10,11)  text="o"
   └─ BlockShape  pos=12  src=[13,16)
```
