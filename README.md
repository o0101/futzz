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

## Quality

The quality is around 86% of what I want for this. I'm very happy. It's very good so far. 

## Index size

Compressed index on 42M of English ASCII text is around 280 Mb (2.4 Gb expanded).
With a bit of other processing this can probably get down to 210Mb. 

So basically an index is 5 - 7 times as large as the text.

This is not terrible. It's a good multiple for a good quality FTS search system like mine.

## Pruning!

Pruning is a revelation. And a revolution. All I do is prune out all entries that are not counted, and results are still very good and index bytes size is much smaller. O(N). Awesome.

## Target precision and recall

I want to get both between 0.7 and 0.8 or 70% and 80%

Right now I'm basically at 0.3 to 0.4 or 30% to 40% for both. So I want to double it.

And after that I want to work on ranking.
