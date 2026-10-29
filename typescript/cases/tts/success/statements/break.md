# 预期 token 树（逐字）：`while (a) { break; }`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20
w h i l e   ( a )   {   b r e a k ;   } ⏎
```

## [char 0] `"w"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,1)  text="w"
```

## [char 1] `"h"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,2)  text="wh"
```

## [char 2] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,3)  text="whi"
```

## [char 3] `"l"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,4)  text="whil"
```

## [char 4] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,5)  text="while"
```

## [char 5] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,...)
   └─ WrapSymbol  src=[5,6)  text=" "
```

## [char 6] `"("`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[5,6)  text=" "
   └─ ConditionShape  pos=5  src=[6,7)
```

## [char 7] `"a"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[5,6)  text=" "
   └─ ConditionShape  pos=5  src=[6,7)
      └─ Common  src=[7,8)  text="a"
```

## [char 8] `")"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[5,6)  text=" "
   └─ IdentifierShape  pos=7  src=[7,8)  text="a"
```

## [char 9] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[5,6)  text=" "
   ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
   └─ WrapSymbol  src=[9,10)  text=" "
```

## [char 10] `"{"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[5,6)  text=" "
   ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ BlockShape  pos=9  src=[10,11)
```

## [char 11] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[5,6)  text=" "
   ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ BlockShape  pos=9  src=[10,11)
      └─ WrapSymbol  src=[11,12)  text=" "
```

## [char 12] `"b"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[5,6)  text=" "
   ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ BlockShape  pos=9  src=[10,11)
      ├─ WrapSymbol  src=[11,12)  text=" "
      └─ Common  src=[12,13)  text="b"
```

## [char 13] `"r"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[5,6)  text=" "
   ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ BlockShape  pos=9  src=[10,11)
      ├─ WrapSymbol  src=[11,12)  text=" "
      └─ Common  src=[12,14)  text="br"
```

## [char 14] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[5,6)  text=" "
   ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ BlockShape  pos=9  src=[10,11)
      ├─ WrapSymbol  src=[11,12)  text=" "
      └─ Common  src=[12,15)  text="bre"
```

## [char 15] `"a"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[5,6)  text=" "
   ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ BlockShape  pos=9  src=[10,11)
      ├─ WrapSymbol  src=[11,12)  text=" "
      └─ Common  src=[12,16)  text="brea"
```

## [char 16] `"k"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[5,6)  text=" "
   ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ BlockShape  pos=9  src=[10,11)
      ├─ WrapSymbol  src=[11,12)  text=" "
      └─ Common  src=[12,17)  text="break"
```

## [char 17] `";"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[5,6)  text=" "
   ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ BlockShape  pos=9  src=[10,11)
      ├─ WrapSymbol  src=[11,12)  text=" "
      └─ BreakStatementShape  pos=11  src=[12,18)
```

## [char 18] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[5,6)  text=" "
   ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ BlockShape  pos=9  src=[10,11)
      ├─ WrapSymbol  src=[11,12)  text=" "
      ├─ BreakStatementShape  pos=11  src=[12,18)
      └─ WrapSymbol  src=[18,19)  text=" "
```

## [char 19] `"}"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,20)
   ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
   └─ BlockShape  pos=9  src=[10,20)
      └─ BreakStatementShape  pos=11  src=[12,18)
```

## [char 20] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
├─ WhileStatementShape  pos=0  src=[0,20)
│  ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
│  └─ BlockShape  pos=9  src=[10,20)
│     └─ BreakStatementShape  pos=11  src=[12,18)
└─ WrapSymbol  src=[20,21)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,21)
└─ WhileStatementShape  pos=0  src=[0,20)
   ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
   └─ BlockShape  pos=9  src=[10,20)
      └─ BreakStatementShape  pos=11  src=[12,18)
```
