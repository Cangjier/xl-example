# 预期 token 树（逐字）：`try { a; } catch { b; }`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23
t r y   {   a ;   }   c a t c h   {   b ;   } ⏎
```

## [char 0] `"t"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,1)  text="t"
```

## [char 1] `"r"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,2)  text="tr"
```

## [char 2] `"y"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,3)  text="try"
```

## [char 3] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TryStatementShape  pos=0  src=[0,...)
   └─ WrapSymbol  src=[3,4)  text=" "
```

## [char 4] `"{"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TryStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[3,4)  text=" "
   └─ BlockShape  pos=3  src=[4,5)
```

## [char 5] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TryStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[3,4)  text=" "
   └─ BlockShape  pos=3  src=[4,5)
      └─ WrapSymbol  src=[5,6)  text=" "
```

## [char 6] `"a"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TryStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[3,4)  text=" "
   └─ BlockShape  pos=3  src=[4,5)
      ├─ WrapSymbol  src=[5,6)  text=" "
      └─ Common  src=[6,7)  text="a"
```

## [char 7] `";"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TryStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[3,4)  text=" "
   └─ BlockShape  pos=3  src=[4,5)
      ├─ WrapSymbol  src=[5,6)  text=" "
      └─ ExpressionStatementShape  pos=5  src=[6,8)
         └─ IdentifierShape  pos=5  src=[6,7)  text="a"
```

## [char 8] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TryStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[3,4)  text=" "
   └─ BlockShape  pos=3  src=[4,5)
      ├─ WrapSymbol  src=[5,6)  text=" "
      ├─ ExpressionStatementShape  pos=5  src=[6,8)
      │  └─ IdentifierShape  pos=5  src=[6,7)  text="a"
      └─ WrapSymbol  src=[8,9)  text=" "
```

## [char 9] `"}"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TryStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[3,4)  text=" "
   └─ BlockShape  pos=3  src=[4,10)
      └─ ExpressionStatementShape  pos=5  src=[6,8)
         └─ IdentifierShape  pos=5  src=[6,7)  text="a"
```

## [char 10] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TryStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[3,4)  text=" "
   ├─ BlockShape  pos=3  src=[4,10)
   │  └─ ExpressionStatementShape  pos=5  src=[6,8)
   │     └─ IdentifierShape  pos=5  src=[6,7)  text="a"
   └─ WrapSymbol  src=[10,11)  text=" "
```

## [char 11] `"c"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TryStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[3,4)  text=" "
   ├─ BlockShape  pos=3  src=[4,10)
   │  └─ ExpressionStatementShape  pos=5  src=[6,8)
   │     └─ IdentifierShape  pos=5  src=[6,7)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ Common  src=[11,12)  text="c"
```

## [char 12] `"a"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TryStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[3,4)  text=" "
   ├─ BlockShape  pos=3  src=[4,10)
   │  └─ ExpressionStatementShape  pos=5  src=[6,8)
   │     └─ IdentifierShape  pos=5  src=[6,7)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ Common  src=[11,13)  text="ca"
```

## [char 13] `"t"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TryStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[3,4)  text=" "
   ├─ BlockShape  pos=3  src=[4,10)
   │  └─ ExpressionStatementShape  pos=5  src=[6,8)
   │     └─ IdentifierShape  pos=5  src=[6,7)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ Common  src=[11,14)  text="cat"
```

## [char 14] `"c"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TryStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[3,4)  text=" "
   ├─ BlockShape  pos=3  src=[4,10)
   │  └─ ExpressionStatementShape  pos=5  src=[6,8)
   │     └─ IdentifierShape  pos=5  src=[6,7)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ Common  src=[11,15)  text="catc"
```

## [char 15] `"h"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TryStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[3,4)  text=" "
   ├─ BlockShape  pos=3  src=[4,10)
   │  └─ ExpressionStatementShape  pos=5  src=[6,8)
   │     └─ IdentifierShape  pos=5  src=[6,7)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ Common  src=[11,16)  text="catch"
```

## [char 16] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TryStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[3,4)  text=" "
   ├─ BlockShape  pos=3  src=[4,10)
   │  └─ ExpressionStatementShape  pos=5  src=[6,8)
   │     └─ IdentifierShape  pos=5  src=[6,7)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CatchClauseShape  pos=10  src=[11,...)
      └─ WrapSymbol  src=[16,17)  text=" "
```

## [char 17] `"{"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TryStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[3,4)  text=" "
   ├─ BlockShape  pos=3  src=[4,10)
   │  └─ ExpressionStatementShape  pos=5  src=[6,8)
   │     └─ IdentifierShape  pos=5  src=[6,7)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CatchClauseShape  pos=10  src=[11,...)
      ├─ WrapSymbol  src=[16,17)  text=" "
      └─ BlockShape  pos=16  src=[17,18)
```

## [char 18] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TryStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[3,4)  text=" "
   ├─ BlockShape  pos=3  src=[4,10)
   │  └─ ExpressionStatementShape  pos=5  src=[6,8)
   │     └─ IdentifierShape  pos=5  src=[6,7)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CatchClauseShape  pos=10  src=[11,...)
      ├─ WrapSymbol  src=[16,17)  text=" "
      └─ BlockShape  pos=16  src=[17,18)
         └─ WrapSymbol  src=[18,19)  text=" "
```

## [char 19] `"b"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TryStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[3,4)  text=" "
   ├─ BlockShape  pos=3  src=[4,10)
   │  └─ ExpressionStatementShape  pos=5  src=[6,8)
   │     └─ IdentifierShape  pos=5  src=[6,7)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CatchClauseShape  pos=10  src=[11,...)
      ├─ WrapSymbol  src=[16,17)  text=" "
      └─ BlockShape  pos=16  src=[17,18)
         ├─ WrapSymbol  src=[18,19)  text=" "
         └─ Common  src=[19,20)  text="b"
```

## [char 20] `";"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TryStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[3,4)  text=" "
   ├─ BlockShape  pos=3  src=[4,10)
   │  └─ ExpressionStatementShape  pos=5  src=[6,8)
   │     └─ IdentifierShape  pos=5  src=[6,7)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CatchClauseShape  pos=10  src=[11,...)
      ├─ WrapSymbol  src=[16,17)  text=" "
      └─ BlockShape  pos=16  src=[17,18)
         ├─ WrapSymbol  src=[18,19)  text=" "
         └─ ExpressionStatementShape  pos=18  src=[19,21)
            └─ IdentifierShape  pos=18  src=[19,20)  text="b"
```

## [char 21] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TryStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[3,4)  text=" "
   ├─ BlockShape  pos=3  src=[4,10)
   │  └─ ExpressionStatementShape  pos=5  src=[6,8)
   │     └─ IdentifierShape  pos=5  src=[6,7)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ CatchClauseShape  pos=10  src=[11,...)
      ├─ WrapSymbol  src=[16,17)  text=" "
      └─ BlockShape  pos=16  src=[17,18)
         ├─ WrapSymbol  src=[18,19)  text=" "
         ├─ ExpressionStatementShape  pos=18  src=[19,21)
         │  └─ IdentifierShape  pos=18  src=[19,20)  text="b"
         └─ WrapSymbol  src=[21,22)  text=" "
```

## [char 22] `"}"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TryStatementShape  pos=0  src=[0,23)
   ├─ BlockShape  pos=3  src=[4,10)
   │  └─ ExpressionStatementShape  pos=5  src=[6,8)
   │     └─ IdentifierShape  pos=5  src=[6,7)  text="a"
   └─ CatchClauseShape  pos=10  src=[11,23)
      └─ BlockShape  pos=16  src=[17,23)
         └─ ExpressionStatementShape  pos=18  src=[19,21)
            └─ IdentifierShape  pos=18  src=[19,20)  text="b"
```

## [char 23] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
├─ TryStatementShape  pos=0  src=[0,23)
│  ├─ BlockShape  pos=3  src=[4,10)
│  │  └─ ExpressionStatementShape  pos=5  src=[6,8)
│  │     └─ IdentifierShape  pos=5  src=[6,7)  text="a"
│  └─ CatchClauseShape  pos=10  src=[11,23)
│     └─ BlockShape  pos=16  src=[17,23)
│        └─ ExpressionStatementShape  pos=18  src=[19,21)
│           └─ IdentifierShape  pos=18  src=[19,20)  text="b"
└─ WrapSymbol  src=[23,24)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,24)
└─ TryStatementShape  pos=0  src=[0,23)
   ├─ BlockShape  pos=3  src=[4,10)
   │  └─ ExpressionStatementShape  pos=5  src=[6,8)
   │     └─ IdentifierShape  pos=5  src=[6,7)  text="a"
   └─ CatchClauseShape  pos=10  src=[11,23)
      └─ BlockShape  pos=16  src=[17,23)
         └─ ExpressionStatementShape  pos=18  src=[19,21)
            └─ IdentifierShape  pos=18  src=[19,20)  text="b"
```
