import StrongMap from 'node-strongmap';

const MAX_ITERATION = 12;

const MAX_ENT = 0;
const MAX_TOT_ENT = 1;
const SLOW_CHANGE = 2;
const CHANGE_THRESH = 0.2;
const TERMINATE_ON = MAX_ENT;

const FOUND_NOT_FACTOR_MULT = 0.8;

const USE_COVER = true;

const zmap = new StrongMap();
zmap.name('fts');

const State = {
  dict: zmap,
  indexHistory: []
};

  export function index(text, name, useRun = false) {
    const Ent = [];
    const sortKey = useRun ? 'count' : 'runCount';

    const indexHistoryEntry = {
      docName: name, 
      terminatorCondition: TERMINATE_ON == MAX_ENT ? 'maxEntropy' : 
        TERMINATE_ON == MAX_TOT_ENT ? 'maxTotalEntropy' : 
        'unknown',
      useRunCount: useRun,
      indexStart: new Date
    };

    let dict, docStr, factors, lastEntropy = 0, maxEntropy = 0, maxFactors, totalFactorsLength = 0;

    indexingCycle: for( let i = 0; i < MAX_ITERATION; i++ ) {
      ({dict, factors, docStr} = lz(text, State.dict, name)); 
      totalFactorsLength += factors.length;
      const entropy = ent(factors, useRun ? i+1 : undefined, true, totalFactorsLength);
      const total = entropy*factors.length;
      Ent.push({entropy, total: entropy*factors.length, name});
      switch( TERMINATE_ON ) {
        case MAX_ENT: {
          if ( entropy > maxEntropy ) {
            maxFactors = factors;
            maxEntropy = entropy;
          } else {
            break indexingCycle;
          }
        } break;
        case MAX_TOT_ENT: {
          if ( total > maxEntropy ) {
            maxEntropy = total;
            maxFactors = factors;
          } else {
            break indexingCycle;
          }
        }
        case SLOW_CHANGE: {
          if ( entropy > lastEntropy ) {
            maxEntropy = total;
            maxFactors = factors;
          } else if ( (lastEntropy - entropy/lastEntropy) < CHANGE_THRESH ) {
            break indexingCycle;
          }
        }
      } 
      lastEntropy = entropy;
    }

    indexHistoryEntry.indexEndAt = new Date;

    State.indexHistory.push(indexHistoryEntry);

    console.log(name, Ent.map(({entropy, total}) => `${entropy.toFixed(2)} : ${total.toFixed(2)}`));

    return {dict, factors: maxFactors || factors};
  }

  export function query(words) {
    const {dict} = State;
    const {factors} = lz(words, dict, 'query');
    let willExit = false;

    const merge = {};
    factors.forEach(f => {
      const {name, word} = f;
      const scores = Object.fromEntries([...name.entries()].map(([_,{score}]) => {
        if ( score == null ) {
          console.log(f, name, word);
          willExit = true;
        } 
        return [_, score];
      }))
      //console.log({scores, name, word});
      mergeAdd(merge, scores);
      //console.log(JSON.stringify({word, scores}));
    });

    const results = Object.entries(merge);
    results.sort(([,countA], [,countB]) => {
      //console.log({countA, countB});
      return parseFloat(countB) - parseFloat(countA);
    });
    console.log(JSON.stringify({words, results}, null, 2));
    console.log('');
    if ( willExit ) {
      process.exit(1);
    }
  }

  export function lz(docStr = '', dict = new Map(), name = 'unknown doc') {
    const toNormalize = new Set();
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
              name: new Map([[name, {count:0}]]),
              word: nextChar,
              firstIndex: charIndex,
              count: 0,
              codeId 
            }
            toNormalize.add(data);
            dict.set(codeId, data);
            dict.set(nextChar, data);
            codeId += 1;
        }
        if ( ! dict.has(currentWord) ) {
          // save the new unseen token
            const data = {
              name: new Map([[name, {count:0}]]),
              word: currentWord,
              firstIndex: null,
              count: 0,
              codeId 
            }
            toNormalize.add(data);
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
              if ( !factor.name.has(name) ) {
                factor.name.set(name, {count: 1});
              } else {
                factor.name.get(name).count += 1;
              }
              factor.count++;

              factors.push(factor);
              toNormalize.delete(factor);
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
              name: new Map([[name, {count:0}]]),
              word: currentWord,
              firstIndex: null,
              count: 0,
              codeId 
            }
            toNormalize.add(data);
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
              toNormalize.delete(factor);

              if ( !factor.name.has(name) ) {
                factor.name.set(name, {count: 1});
              } else {
                factor.name.get(name).count += 1;
              }

              // in this case we push the last factor if any
                const suffixFactor = dict.get(suffix);
                factors.push(suffixFactor);
                toNormalize.delete(suffixFactor);

              if ( !suffixFactor.name.has(name) ) {
                suffixFactor.name.set(name, {count: 1});
              } else {
                suffixFactor.name.get(name).count += 1;
              }
            }
        } else {
          const factor = dict.get(currentWord);
          if ( factor.count == 0 ) {
            factor.firstIndex = wordFirstIndex;
          }
          if ( !factor.name.has(name) ) {
            factor.name.set(name, {count: 1});
          } else {
            factor.name.get(name).count += 1;
          }
          factor.count++;

          factors.push(factor);
          toNormalize.delete(factor);
        }

    // normalize factors
      factors.forEach(f => {
        const n = f.name.get(name);
        if ( USE_COVER ) {
          n.score = n.count*f.word.length / docStr.length;
        } else {
          n.score = n.count / factors.length;
        }
      });
      toNormalize.forEach(f => {
        const n = f.name.get(name);
        if ( USE_COVER ) {
          n.score = FOUND_NOT_FACTOR_MULT * f.word.length / docStr.length;
        } else {
          n.score = FOUND_NOT_FACTOR_MULT * 1 / factors.length;
        }
      });

    return {factors, dict, docStr};
  }

  export function ent(factors, run = 1, adjustLength = true, allFactorsLength) {
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
      let p = 0;
      if ( USE_COVER ) {
        p = Count*word.length/TotalLength;
      } else {
        if ( run > 1 ) {
          p = Count/allFactorsLength;
        } else {
          p = Count/factors.length;
        }
      }
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

  function mergeAdd(result, source) {
    for( const key of Object.keys(source) ) {
      if ( ! result[key] ) {
        result[key] = 0;
      }
      result[key] += source[key];
    }
  }
