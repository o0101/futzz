# futzz

A polyglot (language-agnostic) full text search system based on the lempel ziv factoring of a document.

## progress

PoC works. And it's really fucking good.

## Rough estimate

At the high end, people's big archives will take 8 billion factors of full text search. Compressed, this type of file (to store the dictionary / index) will take 168Gb approximately.

But this FTS will be able to hold around 10 million documents. And the FTS component will be much larger than the archive itself (~8 terrabytes)

Yeah, this scales.

## Good results

The algorithm gives good results. The first result is often highly relevant and the best answer to the query, more than half the time. And when it's not the best result and other relevant results are in the top results.

## So far

We have good algorithm with good results and it runs fast. Super fast searches and relatively fast indexing. But the issue is the algorithm takes lots of memory. And quality is not great it seems, but there's more we can do. I think the validity of LZ as a language agnostic stemming and tokenizing step has been established. Now just the details have to be worked out.
