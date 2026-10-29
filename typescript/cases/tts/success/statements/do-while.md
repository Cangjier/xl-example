# 预期 token 树（逐字）：`do { a; } while (b);`

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20
d o   {   a ;   }   w h i l e   ( b ) ; ⏎
```

## [char 0] `"d"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,1)  text="d"
```

## [char 1] `"o"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ Common  src=[0,2)  text="do"
```

## [char 2] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ DoStatementShape  pos=0  src=[0,...)
   └─ WrapSymbol  src=[2,3)  text=" "
```

## [char 3] `"{"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ DoStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   └─ BlockShape  pos=2  src=[3,4)
```

## [char 4] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ DoStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   └─ BlockShape  pos=2  src=[3,4)
      └─ WrapSymbol  src=[4,5)  text=" "
```

## [char 5] `"a"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ DoStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   └─ BlockShape  pos=2  src=[3,4)
      ├─ WrapSymbol  src=[4,5)  text=" "
      └─ Common  src=[5,6)  text="a"
```

## [char 6] `";"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ DoStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   └─ BlockShape  pos=2  src=[3,4)
      ├─ WrapSymbol  src=[4,5)  text=" "
      └─ ExpressionStatementShape  pos=4  src=[5,7)
         └─ IdentifierShape  pos=4  src=[5,6)  text="a"
```

## [char 7] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ DoStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   └─ BlockShape  pos=2  src=[3,4)
      ├─ WrapSymbol  src=[4,5)  text=" "
      ├─ ExpressionStatementShape  pos=4  src=[5,7)
      │  └─ IdentifierShape  pos=4  src=[5,6)  text="a"
      └─ WrapSymbol  src=[7,8)  text=" "
```

## [char 8] `"}"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ DoStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   └─ BlockShape  pos=2  src=[3,9)
      └─ ExpressionStatementShape  pos=4  src=[5,7)
         └─ IdentifierShape  pos=4  src=[5,6)  text="a"
```

## [char 9] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ DoStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ BlockShape  pos=2  src=[3,9)
   │  └─ ExpressionStatementShape  pos=4  src=[5,7)
   │     └─ IdentifierShape  pos=4  src=[5,6)  text="a"
   └─ WrapSymbol  src=[9,10)  text=" "
```

## [char 10] `"w"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ DoStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ BlockShape  pos=2  src=[3,9)
   │  └─ ExpressionStatementShape  pos=4  src=[5,7)
   │     └─ IdentifierShape  pos=4  src=[5,6)  text="a"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ Common  src=[10,11)  text="w"
```

## [char 11] `"h"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ DoStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ BlockShape  pos=2  src=[3,9)
   │  └─ ExpressionStatementShape  pos=4  src=[5,7)
   │     └─ IdentifierShape  pos=4  src=[5,6)  text="a"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ Common  src=[10,12)  text="wh"
```

## [char 12] `"i"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ DoStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ BlockShape  pos=2  src=[3,9)
   │  └─ ExpressionStatementShape  pos=4  src=[5,7)
   │     └─ IdentifierShape  pos=4  src=[5,6)  text="a"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ Common  src=[10,13)  text="whi"
```

## [char 13] `"l"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ DoStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ BlockShape  pos=2  src=[3,9)
   │  └─ ExpressionStatementShape  pos=4  src=[5,7)
   │     └─ IdentifierShape  pos=4  src=[5,6)  text="a"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ Common  src=[10,14)  text="whil"
```

## [char 14] `"e"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ DoStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ BlockShape  pos=2  src=[3,9)
   │  └─ ExpressionStatementShape  pos=4  src=[5,7)
   │     └─ IdentifierShape  pos=4  src=[5,6)  text="a"
   ├─ WrapSymbol  src=[9,10)  text=" "
   └─ Common  src=[10,15)  text="while"
```

## [char 15] `" "`

```text
SourceFileShape  pos=-  src=[0,...)
└─ DoStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ BlockShape  pos=2  src=[3,9)
   │  └─ ExpressionStatementShape  pos=4  src=[5,7)
   │     └─ IdentifierShape  pos=4  src=[5,6)  text="a"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Common  src=[10,15)  text="while"
   └─ WrapSymbol  src=[15,16)  text=" "
```

## [char 16] `"("`

```text
SourceFileShape  pos=-  src=[0,...)
└─ DoStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ BlockShape  pos=2  src=[3,9)
   │  └─ ExpressionStatementShape  pos=4  src=[5,7)
   │     └─ IdentifierShape  pos=4  src=[5,6)  text="a"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Common  src=[10,15)  text="while"
   ├─ WrapSymbol  src=[15,16)  text=" "
   └─ ConditionShape  pos=15  src=[16,17)
```

## [char 17] `"b"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ DoStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ BlockShape  pos=2  src=[3,9)
   │  └─ ExpressionStatementShape  pos=4  src=[5,7)
   │     └─ IdentifierShape  pos=4  src=[5,6)  text="a"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Common  src=[10,15)  text="while"
   ├─ WrapSymbol  src=[15,16)  text=" "
   └─ ConditionShape  pos=15  src=[16,17)
      └─ Common  src=[17,18)  text="b"
```

## [char 18] `")"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ DoStatementShape  pos=0  src=[0,...)
   ├─ WrapSymbol  src=[2,3)  text=" "
   ├─ BlockShape  pos=2  src=[3,9)
   │  └─ ExpressionStatementShape  pos=4  src=[5,7)
   │     └─ IdentifierShape  pos=4  src=[5,6)  text="a"
   ├─ WrapSymbol  src=[9,10)  text=" "
   ├─ Common  src=[10,15)  text="while"
   ├─ WrapSymbol  src=[15,16)  text=" "
   └─ IdentifierShape  pos=17  src=[17,18)  text="b"
```

## [char 19] `";"`

```text
SourceFileShape  pos=-  src=[0,...)
└─ DoStatementShape  pos=0  src=[0,20)
   ├─ BlockShape  pos=2  src=[3,9)
   │  └─ ExpressionStatementShape  pos=4  src=[5,7)
   │     └─ IdentifierShape  pos=4  src=[5,6)  text="a"
   └─ IdentifierShape  pos=17  src=[17,18)  text="b"
```

## [char 20] `"\n"`

```text
SourceFileShape  pos=-  src=[0,...)
├─ DoStatementShape  pos=0  src=[0,20)
│  ├─ BlockShape  pos=2  src=[3,9)
│  │  └─ ExpressionStatementShape  pos=4  src=[5,7)
│  │     └─ IdentifierShape  pos=4  src=[5,6)  text="a"
│  └─ IdentifierShape  pos=17  src=[17,18)  text="b"
└─ WrapSymbol  src=[20,21)  text="\n"
```

## [EOF]

```text
SourceFileShape  pos=-  src=[0,21)
└─ DoStatementShape  pos=0  src=[0,20)
   ├─ BlockShape  pos=2  src=[3,9)
   │  └─ ExpressionStatementShape  pos=4  src=[5,7)
   │     └─ IdentifierShape  pos=4  src=[5,6)  text="a"
   └─ IdentifierShape  pos=17  src=[17,18)  text="b"
```
