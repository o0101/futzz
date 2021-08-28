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

Right now I'm basically at 0.35 to 0.6 or 30% to 60% for both. So I want to double it.
(37.5% and 55.4%)

And after that I want to work on ranking.

## My recall is great

It's basically up to 0.7 or 70% (using count_all)

But my precision is only around 55%

How do I increase precision? Weed out irrelevant factors.

Maybe prune the dict for count_all factors below a certain length?
Ignore count_all factors below a certain min weight?
Prune the dict more aggressively at a higher min count?

As fas as I can tell I solved the "recall" problem. We get a great representation of matching documents.

## OK So the best results are found

{
  "minIteration": 3,
  "maxWordLength": 29,
  "prune": true,
  "countAll": true,
  "addAllAsFactors": false,
  "minCount": 1
}

Basically the method works, and these results establish that more work:

- higher min iteration
- longer word length
- counting all 

Are valuable

Given that, I think I should focus on more aggressive pruning, to see if that can push up precision.

Results are 55% and 70% for precision and recall.

## Way forward

What we really want I think is the discriminatory power of the "right" factors, and to weed out the wrong ones.

## More way forward

Focus on getting a high recall, and then whittle down those factors to only ones that give maximally relevant results. There has to be some set of factors of the query that gives the best results.

I think one way forward could be based on filtering count all based on min length,

but another could be based on something like TF-IDF, in other words, score. 

So we count all significant factors. 

And we also generate a lot of factors from the query and count all significant ones.

We probably already have the score metrics in here to do that.

## So

After exploring the parameter space, and adjusting how we prune, I found that I could get both precision and recall within 0.6 to 0.7 , with a sum of over 1.3

Pretty good. 

But right now I want to pull back to the time we got 70 recall and 50 precision, and try to work out something between my current results and that.

See if I can't get anything higher.

Then I want to push forward to the next stage, taking the best set out of this stage, and developing a better way to prune, most likely based on the score, rather than just the length.

Also I want to see if I can aggressively prune the dict periodically to remove low information, or low frequency factors that nevertheless made it through other rounds of pruning, but whose value has not borne out over time.

## So far

Good results. Max score around 1.34 now, with either 72% prec, 60% rec, or 67% prec, 67% rec.

If you think about it this means that 82% of queries, and 82% of documents have index terms that overlap in a relevant way. This is pretty solid but I would still like to get up to both 0.7 to 0.8

Let's see.

And then I wanna cut down on the index size.

And I need to solve the problem that some terms (like "nasa shuttle") fail out under some configs (like 0). It gives 1 result! WTF.

I'm gonna run a comprehensive test suite overnight with a bunch of open up parameters.

## Results

Got scope up to 140, using 5 iterations and 31 max word length


{
  "minIteration": 5,
  "maxWordLength": 31,
  "minAddAllLength": 3,
  "mainFactor": true,
  "prune": true,
  "useQ": false,
  "extend": true,
  "countAll": true,
  "addAllAsFactors": false,
  "addAllAsFactorsIntervention": true,
  "minCount": 1
}

  "avgPrecision": "68.20",
  "medianPrecision": "93.75",
  "modePrecision": "100",
  "avgRecall": "71.84",
  "medianRecall": "77.14",
  "modeRecall": "83",
  "score": "140.04"

Or with 3 iterations and 83 max word length:

{
  "minIteration": 3,
  "maxWordLength": 83,
  "minAddAllLength": 3,
  "mainFactor": true,
  "prune": true,
  "useQ": false,
  "extend": true,
  "countAll": true,
  "addAllAsFactors": false,
  "addAllAsFactorsIntervention": true,
  "minCount": 1
}

  "avgPrecision": "64.77",
  "medianPrecision": "94.85",
  "modePrecision": "100",
  "avgRecall": "70.01",
  "medianRecall": "75.00",
  "modeRecall": "75",
  "score": "134.78"


Both sets are very good

## Limitations

Won't search APL / BQN code because we remove any sequences of length 2 ore more matching /\p{S}/u which is the "Symbol" Unicode property. But there's a code flag in src/futzz.js you can switch this off with, and then it can search the APL / BQN code.
