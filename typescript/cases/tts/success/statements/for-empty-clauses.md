# 预期 token 树（逐字）：`for (;;) { }`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12
f o r   ( ; ; )   {   } ⏎
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

## [char 5] `";"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
```

## [char 6] `";"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForHeadShape  pos=0  src=[0,...)
```

## [char 7] `")"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForStatementShape  pos=0  src=[0,...)
```

## [char 8] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForStatementShape  pos=0  src=[0,...)
   └─ WrapSymbol  src=[8,9)  text=" "
```

## [char 9] `"{"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[8,9)  text=" "
   └─ BlockShape  pos=8  src=[9,10)
```

## [char 10] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[8,9)  text=" "
   └─ BlockShape  pos=8  src=[9,10)
      └─ WrapSymbol  src=[10,11)  text=" "
```

## [char 11] `"}"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ ForStatementShape  pos=0  src=[0,12)
   └─ BlockShape  pos=8  src=[9,12)
```

## [char 12] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
├─ ForStatementShape  pos=0  src=[0,12)
│  └─ BlockShape  pos=8  src=[9,12)
└─ WrapSymbol  src=[12,13)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,13)
└─ ForStatementShape  pos=0  src=[0,12)
   └─ BlockShape  pos=8  src=[9,12)
```
