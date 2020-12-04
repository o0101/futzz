import {BigMap} from 'big-associative';
//import StrongMap from './node-strongmap-fast/index.js';

// config
  const NORMAL = 4;
  const SCORE_METHOD = 4;

  const MAX_ENT = 0;
  const TERMINATE_ON = MAX_ENT;

  const MIN_ITERATION = 2;
  const MAX_ITERATION = 12;

  const COUNT_ALL = false;
  const PRUNE = true;
  const MAX_WORD_LENGTH_1 = 18;

  const MIN_COUNT = 1;
  const FOUND_NOT_FACTOR_MULT = 0.75;
  const SMULT = 1 << 32;

// serialize keys
  const WORD = 'w';
  const NAME = 'n';
  const COUNT = 'c';
  const SCORE = 's';
  const FIRST_INDEX = 'x';
  const CODE_ID = 'i';
  const RUN_COUNT = 'r';

const QUERY_PLACE_SCORE = [
  10, 
  5,
  3,
  1.618
];

//const zmap = new StrongMap();
//zmap.name('fts');

let nameId = 0;

export const State = {
  dict: new BigMap(),
  names: new BigMap(),
  // dict: zmap, 
  indexHistory: [],
  totalDocLength: 0,
  totalFactorsLength: 0
};

  export function index(text, name) {
    const Ent = [];
    const sortKey = RUN_COUNT;

    const indexHistoryEntry = {
      docName: name, 
      terminatorCondition: TERMINATE_ON == MAX_ENT ? 'maxEntropy' : 
        TERMINATE_ON == MAX_TOT_ENT ? 'maxTotalEntropy' : 
        'unknown',
      indexStart: new Date
    };

    let dict, docStr, factors, lastEntropy = 0, maxEntropy = 0, maxFactors;

    let Dict = State.dict;

    indexingCycle: for( let i = 0; i < MAX_ITERATION; i++ ) {
      ({dict, factors, docStr} = lz(text, Dict, name)); 
      State.totalFactorsLength += factors.length;
      const entropy = ent(factors);
      const total = entropy*factors.length;
      Ent.push({entropy, total: entropy*factors.length, name});
      switch( TERMINATE_ON ) {
        default:
        case MAX_ENT: {
          if ( entropy > maxEntropy ) {
            maxFactors = factors;
            maxEntropy = entropy;
          } else if ( i >= MIN_ITERATION ) {
            break indexingCycle;
          }
        } break;
      } 
      lastEntropy = entropy;
    }

    indexHistoryEntry.indexEndAt = new Date;

    State.indexHistory.push(indexHistoryEntry);

    return {dict, factors: maxFactors || factors};
  }

  export function query(words, right_answers = []) {
    if ( right_answers.length > QUERY_PLACE_SCORE.length ) {
      throw new TypeError(
        `As we only score ${QUERY_PLACE_SCORE.length} answer slots, ` +
        `there can only be ${QUERY_PLACE_SCORE.length} right answers.`
      );
    }
    const Answers = new Set(right_answers);
    const {dict} = State;

    words = `${words} ${words} ${words}`;
    const {factors} = lz(words, dict, 'query', {idempotent:true});
    let willExit = false;

    let score = 0;

    const merge = {};

    factors.forEach(f => {
      const {[NAME]:name, [WORD]:word} = f;
      // discard the count information and just keep the scores per document name
      const scores = Object.fromEntries([...Object.entries(name)].map(([_,{[SCORE]:score}]) => {
        if ( score == null ) {
          console.log(f, name, word);
          willExit = true;
        } 
        return [_, score];
      }))
      //console.log({scores, name, word});
      // and add these to the summed scores per document for the other factors
      mergeAdd(merge, scores);
      // result set does not really work
      //const docs = Object.keys(name);
      //intersectionAdd(resultSet, docs);
      //console.log(JSON.stringify({word, scores}));
    });

    let results = Object.entries(merge);

    results = results.filter(([doc]) => State.names.get(doc) !== "query");

    // sort the documents by the summed score
    results.sort(([,countA], [,countB]) => {
      //console.log({countA, countB});
      return parseFloat(countB) - parseFloat(countA);
    });

    if ( willExit ) {
      process.exit(1);
    }

    // replace the document name id with the actual name (and filter out the query "result")
    results = results.map(([doc,score]) => [State.names.get(doc), score]);

    if ( right_answers.length ) {
      if ( results.length ) {
        console.log(JSON.stringify({words, results}, null, 2));

        /**
        results.forEach(([doc], i) => {
          const placeScores = doc == right_answers[i];
          if ( i < QUERY_PLACE_SCORE.length && placeScores ) {
            score += QUERY_PLACE_SCORE[i];
            if ( i === 0 ) {
              score += 100;
            }
          } else if ( Answers.has(doc) ) {
            if ( i >= QUERY_PLACE_SCORE.length ) {
              score += 1;
            } else {
              score += QUERY_PLACE_SCORE[i]/(right_answers.indexOf(doc)+1);
            }
          } else {
            score -= 2;
          }
        });
        **/

        let Sum;
        const recall = results.reduce(
          (sum, [doc]) => Sum = Answers.has(doc) ? sum + 1 : sum, 0
        )/Answers.size;

        const precision = Sum/results.length;

        score = recall + precision;
        console.log({score: recall + precision});

        console.log('');
      }
      
      return score;
    }

    return results; 
  }

  export function lz(docStr = '', dict = new Map(), name = 'unknown doc', opts = {}) {
    if ( State.names.has(name) ) {
      name = State.names.get(name);
    } else {
      State.names.set(name, nameId);
      State.names.set(nameId+'', name);
      name = nameId + '';
      nameId += 1;
    }
    const toNormalize = new Set();
    const factors = [];
    let codeId = dict.size/2;
    let wordFirstIndex = -1;
    let charIndex = 0;
    let currentWord = '';
    let reverse;
    let prune;

    if ( PRUNE ) {
      prune = new Set();
    }

    // idempotent in this function means 
    // provide a factorization but don't change the dict
    if ( opts.idempotent ) {
      reverse = [];
    }

    // a tiny bit of preProcessing

    docStr = docStr.replace(/\p{P}+/gu, '');     // unicode replace all punctuation
    docStr = docStr.replace(/\p{Z}+/gu, ' ');     // unicode replace all separators
    docStr = docStr.replace(/[\n\r]+/gu, '  ');     // unicode replace all separators
    docStr = docStr.trim();
    docStr = docStr.toLocaleLowerCase();

    factors.docStr = docStr;

    State.totalDocLength += docStr.length;

      for ( const nextChar of docStr ) {
        if ( ! dict.has(nextChar) ) {
          const data = {
            [NAME]: {
              [name]: {[COUNT]: MIN_COUNT}
            }, 
            [WORD]: nextChar,
            [FIRST_INDEX]: charIndex,
            [COUNT]: MIN_COUNT,
            [CODE_ID]: codeId 
          }
          PRUNE && prune.add(data);
          toNormalize.add(data);
          dict.set(codeId, data);
          dict.set(nextChar, data);
          if ( opts.idempotent ) {
            reverse.push(data);
          }
          codeId += 1;
          if ( codeId%100 == 0) {
            //console.log(codeId);
          }
        }
        if ( ! dict.has(currentWord) || currentWord.length >= MAX_WORD_LENGTH_1 ) {
          // save the new unseen token
            const data = {
              [NAME]: {
                [name]: {[COUNT]: MIN_COUNT}
              }, 
              [WORD]: currentWord,
              [FIRST_INDEX]: null,
              [COUNT]: MIN_COUNT,
              [CODE_ID]: codeId 
            }
            PRUNE && prune.add(data);
            toNormalize.add(data);
            dict.set(codeId, data);
            dict.set(currentWord, data);
            if ( opts.idempotent ) {
              reverse.push(data);
            }
            codeId += 1;
            if ( codeId%100 == 0) {
              //console.log(codeId);
            }

          // get the factor 
            let suffix = '';
            if ( currentWord.length ) {
              const lastWord = currentWord.slice(0,-1);
              suffix = currentWord.slice(-1);
              const factor = dict.get(lastWord);

              if ( factor[COUNT] == 1 ) {
                factor[FIRST_INDEX] = wordFirstIndex;
              }
              if ( !factor[NAME][name] ) {
                factor[NAME][name] = {[COUNT]: MIN_COUNT+1};
              } else {
                factor[NAME][name][COUNT] += 1;
              }
              factor[COUNT]++;

              factors.push(factor);
              PRUNE && prune.delete(factor);
              toNormalize.delete(factor);
            }

          // update the state
            wordFirstIndex = charIndex;
            currentWord = suffix;
        } else if ( COUNT_ALL ) {
          const data = dict.get(currentWord);
          if ( !data[NAME][name] ) {
            data[NAME][name] = {[COUNT]: MIN_COUNT+1};
          } else {
            data[NAME][name][COUNT]++;
          }
          data[COUNT]++;
          toNormalize.add(data);
          PRUNE && prune.delete(data);
        }

        currentWord += nextChar;
        charIndex += 1;
      }

      // empty any state into the dictionary and factors list
        if ( ! dict.has(currentWord) ) {
          // save the new unseen token
            const data = {
              [NAME]: {
                [name]: {[COUNT]: MIN_COUNT}
              }, 
              [WORD]: currentWord,
              [FIRST_INDEX]: null,
              [COUNT]: MIN_COUNT,
              [CODE_ID]: codeId 
            }
            PRUNE && prune.add(data);
            toNormalize.add(data);
            dict.set(codeId, data);
            dict.set(currentWord, data);
            if ( opts.idempotent ) {
              reverse.push(data);
            }
            codeId += 1;
            if ( codeId%100 == 0) {
              //console.log(codeId);
            }

          // get the factor 
            let suffix = '';
            if ( currentWord.length ) {
              const lastWord = currentWord.slice(0,-1);
              suffix = currentWord.slice(-1);
              const factor = dict.get(lastWord);

              if ( factor[COUNT] == MIN_COUNT ) {
                factor[FIRST_INDEX] = wordFirstIndex;
              }
              factor[COUNT]++;

              factors.push(factor);
              PRUNE && prune.delete(factor);
              toNormalize.delete(factor);

              if ( !factor[NAME][name] ) {
                factor[NAME][name] = {[COUNT]: MIN_COUNT };
              } else {
                factor[NAME][name][COUNT] += 1;
              }

              // in this case we push the last factor if any
                const suffixFactor = dict.get(suffix);
                factors.push(suffixFactor);
                PRUNE && prune.delete(suffixFactor);
                toNormalize.delete(suffixFactor);

                if ( !suffixFactor[NAME][name] ) {
                  suffixFactor[NAME][name] = {[COUNT]: MIN_COUNT};
                } else {
                  suffixFactor[NAME][name][COUNT] += 1;
                }
            }
        } else {
          const factor = dict.get(currentWord);
          if ( factor[COUNT] == MIN_COUNT ) {
            factor[FIRST_INDEX] = wordFirstIndex;
          }
          if ( !factor[NAME][name] ) {
            factor[NAME][name] = {[COUNT]: MIN_COUNT };
          } else {
            factor[NAME][name][COUNT] += 1;
          }
          factor[COUNT]++;

          factors.push(factor);
          PRUNE && prune.delete(factor);
          toNormalize.delete(factor);
        }

    // normalize factors
        factors.forEach(f => {
          const n = f[NAME][name];
          if ( ! n ) {
            console.log(f, name);
          }
          switch( SCORE_METHOD ) {
            default:
            case NORMAL:
              n[SCORE] = n[COUNT] / factors.length;
              n[SCORE] *= SMULT;
              //n[SCORE] *= -Math.log(Object.keys(f[NAME]).length/State.names.size);
              break;
          }
        });
        toNormalize.forEach(f => {
          const n = f[NAME][name];
          switch( SCORE_METHOD ) {
            default:
            case NORMAL:
              n[SCORE] = FOUND_NOT_FACTOR_MULT * 1 / factors.length;
              n[SCORE] *= SMULT;
              break;
          }
        });
        PRUNE && prune.forEach(f => (dict.delete(f[WORD]), dict.delete(f[CODE_ID])));
        //PRUNE && console.log({canPrune: prune.size});

    if ( opts.idempotent ) {
      reverse.forEach(({[WORD]:word,[CODE_ID]:codeId}) => {
        dict.delete(codeId);
        dict.delete(word);
      });
    }

    return {factors, dict, docStr};
  }

  export function ent(factors) {
    let TotalLength = 0;
    let Ent = 0;

    const dict = new Map(); 

    for( const f of factors ) {
      if ( !dict.has(f[WORD]) ) {
        dict.set(f[WORD], f);
        dict.set(f[CODE_ID], f);
        f[RUN_COUNT] = MIN_COUNT;
      }
      f[RUN_COUNT] += 1;
      TotalLength += f[WORD].length;
    }

    for( const {[RUN_COUNT]:runCount,[COUNT]:count,[WORD]:word} of dict.values() ) {
      const Count = runCount;
      const p = Count/factors.length;
      const ent = -p*Math.log2(p);
      Ent += ent;
    }

    const check = factors.docStr.length == TotalLength;

    console.assert(check, factors.docStr.length, TotalLength);

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

