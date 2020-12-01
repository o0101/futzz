# futzz

A polyglot (language-agnostic) full text search system based on the lempel ziv factoring of a document.

## progress

PoC works. And it's really fucking good.

## Rough estimate

At the high end, people's big archives will take 8 billion factors of full text search. Compressed, this type of file (to store the dictionary / index) will take 168Gb approximately.

But this FTS will be able to hold around 10 million documents. And the FTS component will be much larger than the archive itself (~8 terrabytes)

Yeah, this scales.
