export function lz(docStr = '', dict = new Map(), name = 'unknown doc') {
  const factors = [];
  let codeId = dict.size/2;
  let wordFirstIndex = -1;
  let charIndex = 0;
  let currentWord = '';

  // a tiny bit of preProcessing

  docStr = docStr.replace(/\p{P}+/gu, '');     // unicode replace all punctuation
  docStr = docStr.replace(/\p{Z}+/gu, ' ');     // unicode replace all separators
  docStr = docStr.trim().toLocaleLowerCase();

  factors.docStr = docStr;

  // this is how simple lz is, isn't it beautiful? :)

    for ( const nextChar of docStr ) {
      if ( ! dict.has(nextChar) ) {
          const data = {
            name,
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
            name, 
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

export function ent(factors, run = 1, adjustLength = false) {
  let TotalLength = 0;
  let Ent = 0;

  run = run || 1;
  
  const dict = new Map(); 

  for( const f of factors ) {
    if ( !dict.has(f.word) ) {
      dict.set(f.word, f);
      f.runCount = 0;
    }
    f.runCount += 1;
    TotalLength += f.word.length;
  }

  if ( adjustLength ) {
    TotalLength *= run;
  }

  for( const {runCount,count,word} of dict.values() ) {
    let Count = runCount;
    if ( run > 1 ) {
      Count = count; 
    }
    const p = Count*word.length/TotalLength;
    const ent = -p*Math.log2(p);
    Ent += ent;
  }

  let check;

  if ( adjustLength ) {
    check = factors.docStr.length*run == TotalLength;
  } else {
    check = factors.docStr.length == TotalLength;
  }

  console.assert(check, factors.docStr.length*run, TotalLength);

  return Ent;
}
