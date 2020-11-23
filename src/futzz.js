export function lz(docStr = '', dict = new Map()) {
  const factors = [];
  let codeId = dict.size/2;
  let wordFirstIndex = -1;
  let charIndex = 0;
  let currentWord = '';

  // a tiny bit of preProcessing

  docStr = docStr.trim();
  docStr = docStr.replace(/\n+/g, '\n');      // multiple new lines to 1
  docStr = docStr.replace(/[^\S\r\n]+/g, ' '); // multiple whitespace to 1 space

  factors.docStr = docStr;

  // this is how simple lz is, isn't it beautiful? :)

    for ( const nextChar of docStr ) {
      if ( ! dict.has(nextChar) ) {
          const data = {
            word: nextChar,
            firstIndex: charIndex,
            count: 0,
            codeId 
          }
          dict.set(codeId, data);
          dict.set(nextChar, data);
          codeId += 1;
      }
      if ( ! dict.has(currentWord) ) {
        // save the new unseen token
          const data = {
            word: currentWord,
            firstIndex: null,
            count: 0,
            codeId 
          }
          dict.set(codeId, data);
          dict.set(currentWord, data);
          codeId += 1;

        // get the factor 
          let suffix = '';
          if ( currentWord.length ) {
            const lastWord = currentWord.slice(0,-1);
            suffix = currentWord.slice(-1);
            const factor = dict.get(lastWord);

            if ( factor.count == 0 ) {
              factor.firstIndex = wordFirstIndex;
            }
            factor.count++;

            factors.push(factor);
          }

        // update the state
          wordFirstIndex = charIndex;
          currentWord = suffix;
      }

      currentWord += nextChar;
      charIndex += 1;
    }

    // empty any state into the dictionary and factors list
      if ( ! dict.has(currentWord) ) {
        // save the new unseen token
          const data = {
            word: currentWord,
            firstIndex: null,
            count: 0,
            codeId 
          }
          dict.set(codeId, data);
          dict.set(currentWord, data);
          codeId += 1;

        // get the factor 
          let suffix = '';
          if ( currentWord.length ) {
            const lastWord = currentWord.slice(0,-1);
            suffix = currentWord.slice(-1);
            const factor = dict.get(lastWord);

            if ( factor.count == 0 ) {
              factor.firstIndex = wordFirstIndex;
            }
            factor.count++;

            factors.push(factor);

            // in this case we push the last factor if any
              const suffixFactor = dict.get(suffix);
              factors.push(suffixFactor);
          }
      } else {
        const factor = dict.get(currentWord);
        if ( factor.count == 0 ) {
          factor.firstIndex = wordFirstIndex;
        }
        factor.count++;

        factors.push(factor);
      }

  return {factors, dict};
}

export function ent(factors) {
  let TotalLength = 0;
  let Ent = 0;
  
  const dict = new Map(); 

  for( const f of factors ) {
    if ( !dict.has(f.word) ) {
      dict.set(f.word, f);
      f.runCount = 0;
    }
    f.runCount += 1;
    TotalLength += f.word.length;
  }

  for( const {runCount,word} of dict.values() ) {
    const p = runCount*word.length/TotalLength;
    const ent = -p*Math.log2(p);
    Ent += ent;
  }

  const check = factors.docStr.length == TotalLength;
  console.assert(check, factors.docStr.length, TotalLength);

  return Ent;
}
