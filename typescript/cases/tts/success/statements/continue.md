# 预期 token 树（逐字）：`while (a) { continue; }`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23
w h i l e   ( a )   {   c o n t i n u e ;   } ⏎
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

## [char 12] `"c"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[5,6)  text=" "
   ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ BlockShape  pos=9  src=[10,11)
      ├─ WrapSymbol  src=[11,12)  text=" "
      └─ Common  src=[12,13)  text="c"
```

## [char 13] `"o"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[5,6)  text=" "
   ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ BlockShape  pos=9  src=[10,11)
      ├─ WrapSymbol  src=[11,12)  text=" "
      └─ Common  src=[12,14)  text="co"
```

## [char 14] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[5,6)  text=" "
   ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ BlockShape  pos=9  src=[10,11)
      ├─ WrapSymbol  src=[11,12)  text=" "
      └─ Common  src=[12,15)  text="con"
```

## [char 15] `"t"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[5,6)  text=" "
   ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ BlockShape  pos=9  src=[10,11)
      ├─ WrapSymbol  src=[11,12)  text=" "
      └─ Common  src=[12,16)  text="cont"
```

## [char 16] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[5,6)  text=" "
   ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ BlockShape  pos=9  src=[10,11)
      ├─ WrapSymbol  src=[11,12)  text=" "
      └─ Common  src=[12,17)  text="conti"
```

## [char 17] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[5,6)  text=" "
   ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ BlockShape  pos=9  src=[10,11)
      ├─ WrapSymbol  src=[11,12)  text=" "
      └─ Common  src=[12,18)  text="contin"
```

## [char 18] `"u"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[5,6)  text=" "
   ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ BlockShape  pos=9  src=[10,11)
      ├─ WrapSymbol  src=[11,12)  text=" "
      └─ Common  src=[12,19)  text="continu"
```

## [char 19] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[5,6)  text=" "
   ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ BlockShape  pos=9  src=[10,11)
      ├─ WrapSymbol  src=[11,12)  text=" "
      └─ Common  src=[12,20)  text="continue"
```

## [char 20] `";"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[5,6)  text=" "
   ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ BlockShape  pos=9  src=[10,11)
      ├─ WrapSymbol  src=[11,12)  text=" "
      └─ ContinueStatementShape  pos=11  src=[12,21)
```

## [char 21] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[5,6)  text=" "
   ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ BlockShape  pos=9  src=[10,11)
      ├─ WrapSymbol  src=[11,12)  text=" "
      ├─ ContinueStatementShape  pos=11  src=[12,21)
      └─ WrapSymbol  src=[21,22)  text=" "
```

## [char 22] `"}"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ WhileStatementShape  pos=0  src=[0,23)
   ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
   └─ BlockShape  pos=9  src=[10,23)
      └─ ContinueStatementShape  pos=11  src=[12,21)
```

## [char 23] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
├─ WhileStatementShape  pos=0  src=[0,23)
│  ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
│  └─ BlockShape  pos=9  src=[10,23)
│     └─ ContinueStatementShape  pos=11  src=[12,21)
└─ WrapSymbol  src=[23,24)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,24)
└─ WhileStatementShape  pos=0  src=[0,23)
   ├─ IdentifierShape  pos=7  src=[7,8)  text="a"
   └─ BlockShape  pos=9  src=[10,23)
      └─ ContinueStatementShape  pos=11  src=[12,21)
```
