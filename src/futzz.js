import {BigMap} from 'big-associative';
//import StrongMap from './node-strongmap-fast/index.js';

const GEOAVG = 1;
const WAVG = 2;
const AVG = 3;
const NORMAL = 4;
const NORMAL_RANKED = 5;
const SCORE_METHOD = 5;

const MIN_ITERATION = 2;
const MAX_ITERATION = 12;

const USE_COVER = false;
const USE_RUN = true;

const MAX_ENT = 0;
const MAX_TOT_ENT = 1;
const SLOW_CHANGE = 2;
const TERMINATE_ON = MAX_ENT;

const MIN_COUNT = 1;
const CHANGE_THRESH = 0.95;
const SMULT = 1 << 32;

const MAX_WORD_LENGTH = 11;

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

const FOUND_NOT_FACTOR_MULT = 0.75;

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
    const sortKey = USE_RUN ? COUNT : RUN_COUNT;

    //console.log({USE_RUN});

    const indexHistoryEntry = {
      docName: name, 
      terminatorCondition: TERMINATE_ON == MAX_ENT ? 'maxEntropy' : 
        TERMINATE_ON == MAX_TOT_ENT ? 'maxTotalEntropy' : 
        'unknown',
      useRunCount: USE_RUN,
      indexStart: new Date
    };

    let dict, docStr, factors, lastEntropy = 0, maxEntropy = 0, maxFactors;

    let Dict = State.dict;

    // this will prune and clear entries to factors
    //dict = new Map([...State.dict.entries()]);
    //Dict = dict;

    indexingCycle: for( let i = 0; i < MAX_ITERATION; i++ ) {
      ({dict, factors, docStr} = lz(text, Dict, name)); 
      State.totalFactorsLength += factors.length;
      const entropy = ent(factors, USE_RUN ? i+2 : undefined, true, State.totalFactorsLength);
      const total = entropy*factors.length;
      Ent.push({entropy, total: entropy*factors.length, name});
      switch( TERMINATE_ON ) {
        case MAX_ENT: {
          if ( entropy > maxEntropy ) {
            maxFactors = factors;
            maxEntropy = entropy;
          } else if ( i >= MIN_ITERATION ) {
            break indexingCycle;
          }
        } break;
        case MAX_TOT_ENT: {
          if ( total > maxEntropy ) {
            maxEntropy = total;
            maxFactors = factors;
          } else if ( i >= MIN_ITERATION ) {
            break indexingCycle;
          }
        }
        case SLOW_CHANGE: {
          if ( entropy > lastEntropy ) {
            maxEntropy = total;
            maxFactors = factors;
          } else if ( (lastEntropy - entropy)/lastEntropy < CHANGE_THRESH && i >= MIN_ITERATION ) {
            break indexingCycle;
          }
        }
      } 
      lastEntropy = entropy;
    }

    indexHistoryEntry.indexEndAt = new Date;

    State.indexHistory.push(indexHistoryEntry);

    //console.log(name, Ent.map(({entropy, total}) => `${entropy.toFixed(2)} : ${total.toFixed(2)}`));

    // this will prune entries to factors
    /**
    let i = State.dict.size/2;
    factors.forEach(f => {
      f[CODE_ID] = i;
      if ( State.dict.has(f[WORD]) ) {
        // do nothing
      } else {
        i++;
        State.dict.set(f[WORD], f);
        State.dict.set(f[CODE_ID], f);
      }
    });
    **/

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

    words = ` ${words} ${words} `;
    const {factors} = lz(words, dict, 'query', {idempotent:true, addAllAsFactors:false});
    //console.log({factors});
    let willExit = false;

    let score = 0;

    const merge = {};
    // result set does not really work
    //const resultSet = new Set(Object.keys(factors[0][NAME]));
    //resultSet.delete(State.names.get("query")+'');

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

    //results = [...results.filter(([doc]) => resultSet.has(doc)), ...results.slice(0,2)];

    //console.log({resultSet});

    if ( willExit ) {
      process.exit(1);
    }

    // replace the document name id with the actual name (and filter out the query "result")
    results = results.map(([doc,score]) => [State.names.get(doc), score]);

    //results = [...(new Set(results.map(([doc,score]) => doc))).keys()].map(doc => [doc]);

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

    return results; //.slice(0,5);
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

    // idempotent in this function means 
    // provide a factorization but don't change the dict
    if ( opts.idempotent ) {
      reverse = [];
    }

    // a tiny bit of preProcessing

    docStr = docStr.replace(/\p{P}+/gu, '');     // unicode replace all punctuation
    docStr = docStr.replace(/\p{Z}+/gu, ' ');     // unicode replace all separators
    docStr = docStr.replace(/[\n\r]+/gu, ' ');     // unicode replace all separators
    docStr = docStr.trim().toLocaleLowerCase();

    factors.docStr = docStr;

    State.totalDocLength += docStr.length;

    // this is how simple lz is, isn't it beautiful? :)

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
        if ( ! dict.has(currentWord) || currentWord.length > MAX_WORD_LENGTH ) {
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
              toNormalize.delete(factor);
            }

          // update the state
            wordFirstIndex = charIndex;
            currentWord = suffix;
        } else if ( opts.addAllAsFactors ) {
          const data = JSON.parse(JSON.stringify(dict.get(currentWord)));
          if ( data[COUNT] == MIN_COUNT ) {
            data[FIRST_INDEX] = wordFirstIndex;
          }
          if ( !data[NAME][name] ) {
            data[NAME][name] = {[COUNT]: MIN_COUNT};
          } else {
            data[NAME][name][COUNT] += 1;
          }
          data[COUNT]++;
          factors.push(data);
          toNormalize.add(data);
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
              toNormalize.delete(factor);

              if ( !factor[NAME][name] ) {
                factor[NAME][name] = {[COUNT]: MIN_COUNT };
              } else {
                factor[NAME][name][COUNT] += 1;
              }

              // in this case we push the last factor if any
                const suffixFactor = dict.get(suffix);
                factors.push(suffixFactor);
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
          toNormalize.delete(factor);
        }

    // normalize factors
        factors.forEach(f => {
          const n = f[NAME][name];
          if ( ! n ) {
            console.log(f, name);
          }
          switch( SCORE_METHOD ) {
            case GEOAVG:
              n[SCORE] = Math.sqrt(n[COUNT]*f[WORD].length / docStr.length);
              n[SCORE] *= Math.sqrt(n[COUNT] / factors.length);
              break;
            case AVG:
              n[SCORE] = 0.5*(n[COUNT]*f[WORD].length / docStr.length);
              n[SCORE] += 0.5*(n[COUNT] / factors.length);
              break;
            case WAVG:
              n[SCORE] = 0.2*(n[COUNT]*f[WORD].length / docStr.length);
              n[SCORE] += 0.8*(n[COUNT] / factors.length);
              break;
            case NORMAL_RANKED:
              // something like TF IDF
              if ( USE_COVER ) {
                n[SCORE] = (n[COUNT]*f[WORD].length / docStr.length);
                n[SCORE] /= f[COUNT]*f[WORD].length/State.totalDocLength;
                n[SCORE] *= SMULT;
              } else {
                n[SCORE] = (n[COUNT] / factors.length);
                n[SCORE] /= f[COUNT]/State.totalFactorsLength;
                n[SCORE] *= SMULT;
              }
              break;
            default:
            case NORMAL:
              if ( USE_COVER ) {
                n[SCORE] = n[COUNT]*f[WORD].length / docStr.length;
                n[SCORE] *= SMULT;
              } else {
                n[SCORE] = n[COUNT] / factors.length;
                n[SCORE] *= SMULT;
              }
              break;
          }
        });
        toNormalize.forEach(f => {
          const n = f[NAME][name];
          switch( SCORE_METHOD ) {
            case GEOAVG:
              n[SCORE] = Math.sqrt(FOUND_NOT_FACTOR_MULT*f[WORD].length / docStr.length);
              n[SCORE] *= Math.sqrt(FOUND_NOT_FACTOR_MULT/ factors.length);
              break;
            case WAVG:
              n[SCORE] = 0.2*(FOUND_NOT_FACTOR_MULT*f[WORD].length / docStr.length);
              n[SCORE] += 0.8*(FOUND_NOT_FACTOR_MULT/ factors.length);
              break;
            case AVG:
              n[SCORE] = 0.5*(FOUND_NOT_FACTOR_MULT*f[WORD].length / docStr.length);
              n[SCORE] += 0.5*(FOUND_NOT_FACTOR_MULT/ factors.length);
              break;
            case NORMAL_RANKED:
              // something like TF IDF
              if ( USE_COVER ) {
                n[SCORE] = (FOUND_NOT_FACTOR_MULT*f[WORD].length / docStr.length);
                n[SCORE] /= f[COUNT]*f[WORD].length/State.totalDocLength;
                n[SCORE] *= SMULT;
              } else {
                n[SCORE] = (FOUND_NOT_FACTOR_MULT / factors.length);
                n[SCORE] /= f[COUNT]/State.totalFactorsLength;
                n[SCORE] *= SMULT;
              }
              break;
            default:
            case NORMAL:
              if ( USE_COVER ) {
                n[SCORE] = FOUND_NOT_FACTOR_MULT * f[WORD].length / docStr.length;
                n[SCORE] *= SMULT;
              } else {
                n[SCORE] = FOUND_NOT_FACTOR_MULT * 1 / factors.length;
                n[SCORE] *= SMULT;
              }
              break;
          }
        });

    if ( opts.idempotent ) {
      reverse.forEach(({[WORD]:word,[CODE_ID]:codeId}) => {
        dict.delete(codeId);
        dict.delete(word);
      });
    }
    return {factors, dict, docStr};
  }

  export function ent(factors, run = 1, adjustLength = true, allFactorsLength) {
    let TotalLength = 0;
    let Ent = 0;

    run = run || 1;

    //console.log({run,adjustLength,allFactorsLength});
    
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

    if ( adjustLength ) {
      TotalLength *= run;
    }

    for( const {[RUN_COUNT]:runCount,[COUNT]:count,[WORD]:word} of dict.values() ) {
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

  function intersectionAdd(resultSet, keys) {
    keys = new Set(keys);
    for ( const key of resultSet.keys() ) {
      if ( ! keys.has(key) ) {
        resultSet.delete(key);
      }
    }
    return resultSet;
  }
