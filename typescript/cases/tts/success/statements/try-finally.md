# 预期 token 树（逐字）：`try { a; } finally { b; }`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25
t r y   {   a ;   }   f i n a l l y   {   b ;   } ⏎
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

## [char 11] `"f"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TryStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[3,4)  text=" "
   ├─ BlockShape  pos=3  src=[4,10)
   │  └─ ExpressionStatementShape  pos=5  src=[6,8)
   │     └─ IdentifierShape  pos=5  src=[6,7)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ Common  src=[11,12)  text="f"
```

## [char 12] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TryStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[3,4)  text=" "
   ├─ BlockShape  pos=3  src=[4,10)
   │  └─ ExpressionStatementShape  pos=5  src=[6,8)
   │     └─ IdentifierShape  pos=5  src=[6,7)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ Common  src=[11,13)  text="fi"
```

## [char 13] `"n"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TryStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[3,4)  text=" "
   ├─ BlockShape  pos=3  src=[4,10)
   │  └─ ExpressionStatementShape  pos=5  src=[6,8)
   │     └─ IdentifierShape  pos=5  src=[6,7)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ Common  src=[11,14)  text="fin"
```

## [char 14] `"a"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TryStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[3,4)  text=" "
   ├─ BlockShape  pos=3  src=[4,10)
   │  └─ ExpressionStatementShape  pos=5  src=[6,8)
   │     └─ IdentifierShape  pos=5  src=[6,7)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ Common  src=[11,15)  text="fina"
```

## [char 15] `"l"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TryStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[3,4)  text=" "
   ├─ BlockShape  pos=3  src=[4,10)
   │  └─ ExpressionStatementShape  pos=5  src=[6,8)
   │     └─ IdentifierShape  pos=5  src=[6,7)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ Common  src=[11,16)  text="final"
```

## [char 16] `"l"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TryStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[3,4)  text=" "
   ├─ BlockShape  pos=3  src=[4,10)
   │  └─ ExpressionStatementShape  pos=5  src=[6,8)
   │     └─ IdentifierShape  pos=5  src=[6,7)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ Common  src=[11,17)  text="finall"
```

## [char 17] `"y"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TryStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[3,4)  text=" "
   ├─ BlockShape  pos=3  src=[4,10)
   │  └─ ExpressionStatementShape  pos=5  src=[6,8)
   │     └─ IdentifierShape  pos=5  src=[6,7)  text="a"
   ├─ WrapSymbol  src=[10,11)  text=" "
   └─ Common  src=[11,18)  text="finally"
```

## [char 18] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TryStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[3,4)  text=" "
   ├─ BlockShape  pos=3  src=[4,10)
   │  └─ ExpressionStatementShape  pos=5  src=[6,8)
   │     └─ IdentifierShape  pos=5  src=[6,7)  text="a"
   └─ WrapSymbol  src=[18,19)  text=" "
```

## [char 19] `"{"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TryStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[3,4)  text=" "
   ├─ BlockShape  pos=3  src=[4,10)
   │  └─ ExpressionStatementShape  pos=5  src=[6,8)
   │     └─ IdentifierShape  pos=5  src=[6,7)  text="a"
   ├─ WrapSymbol  src=[18,19)  text=" "
   └─ BlockShape  pos=18  src=[19,20)
```

## [char 20] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TryStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[3,4)  text=" "
   ├─ BlockShape  pos=3  src=[4,10)
   │  └─ ExpressionStatementShape  pos=5  src=[6,8)
   │     └─ IdentifierShape  pos=5  src=[6,7)  text="a"
   ├─ WrapSymbol  src=[18,19)  text=" "
   └─ BlockShape  pos=18  src=[19,20)
      └─ WrapSymbol  src=[20,21)  text=" "
```

## [char 21] `"b"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TryStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[3,4)  text=" "
   ├─ BlockShape  pos=3  src=[4,10)
   │  └─ ExpressionStatementShape  pos=5  src=[6,8)
   │     └─ IdentifierShape  pos=5  src=[6,7)  text="a"
   ├─ WrapSymbol  src=[18,19)  text=" "
   └─ BlockShape  pos=18  src=[19,20)
      ├─ WrapSymbol  src=[20,21)  text=" "
      └─ Common  src=[21,22)  text="b"
```

## [char 22] `";"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TryStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[3,4)  text=" "
   ├─ BlockShape  pos=3  src=[4,10)
   │  └─ ExpressionStatementShape  pos=5  src=[6,8)
   │     └─ IdentifierShape  pos=5  src=[6,7)  text="a"
   ├─ WrapSymbol  src=[18,19)  text=" "
   └─ BlockShape  pos=18  src=[19,20)
      ├─ WrapSymbol  src=[20,21)  text=" "
      └─ ExpressionStatementShape  pos=20  src=[21,23)
         └─ IdentifierShape  pos=20  src=[21,22)  text="b"
```

## [char 23] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TryStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[3,4)  text=" "
   ├─ BlockShape  pos=3  src=[4,10)
   │  └─ ExpressionStatementShape  pos=5  src=[6,8)
   │     └─ IdentifierShape  pos=5  src=[6,7)  text="a"
   ├─ WrapSymbol  src=[18,19)  text=" "
   └─ BlockShape  pos=18  src=[19,20)
      ├─ WrapSymbol  src=[20,21)  text=" "
      ├─ ExpressionStatementShape  pos=20  src=[21,23)
      │  └─ IdentifierShape  pos=20  src=[21,22)  text="b"
      └─ WrapSymbol  src=[23,24)  text=" "
```

## [char 24] `"}"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ TryStatementShape  pos=0  src=[0,25)
   ├─ BlockShape  pos=3  src=[4,10)
   │  └─ ExpressionStatementShape  pos=5  src=[6,8)
   │     └─ IdentifierShape  pos=5  src=[6,7)  text="a"
   └─ BlockShape  pos=18  src=[19,25)
      └─ ExpressionStatementShape  pos=20  src=[21,23)
         └─ IdentifierShape  pos=20  src=[21,22)  text="b"
```

## [char 25] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
├─ TryStatementShape  pos=0  src=[0,25)
│  ├─ BlockShape  pos=3  src=[4,10)
│  │  └─ ExpressionStatementShape  pos=5  src=[6,8)
│  │     └─ IdentifierShape  pos=5  src=[6,7)  text="a"
│  └─ BlockShape  pos=18  src=[19,25)
│     └─ ExpressionStatementShape  pos=20  src=[21,23)
│        └─ IdentifierShape  pos=20  src=[21,22)  text="b"
└─ WrapSymbol  src=[25,26)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,26)
└─ TryStatementShape  pos=0  src=[0,25)
   ├─ BlockShape  pos=3  src=[4,10)
   │  └─ ExpressionStatementShape  pos=5  src=[6,8)
   │     └─ IdentifierShape  pos=5  src=[6,7)  text="a"
   └─ BlockShape  pos=18  src=[19,25)
      └─ ExpressionStatementShape  pos=20  src=[21,23)
         └─ IdentifierShape  pos=20  src=[21,22)  text="b"
```
