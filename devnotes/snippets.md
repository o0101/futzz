# snippets

Or how to show a "preview" given a query and an indexed document search result.

## Boy this sounds like an interview question

You have k sets of indexes into a text, each i in k is associate with a query factor that matches to the text, your task is to come up with the a set, Snippet, of maximum order p, of (at most) k indexes, such that adjacent indexes, sm, sn, ( m < n ) in Snippet, represent adjacent i, j in k, (or at least i < j) and such that sp - s0 is minimized, and sn - sm is minimized.

In other words, to get all the factors in the snippet as close together as possible, and as many as possible. 

### Approaches

If we keep an index for each occurrence of each factor, it will be massive but let's not worry about that now (there's likely an optimization for later), but say we have that, what do we do? First, convert each (factor, index) pair (of k factors) into a massive list, and sort by index. 

Then find k (or less) items that are in order, and hopefully if we do this the right way, then we can also minimize the distance between these. 


