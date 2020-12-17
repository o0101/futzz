import fs from 'fs';
import path from 'path';
import {BigSet,BigMap} from 'big-associative';
//import StrongMap from './node-strongmap-fast/index.js';

const OP = (process.argv[7] ? process.argv[7] : process.argv[6] ) || '.';

console.log(path.resolve(OP));

const CONFIG = JSON.parse(fs.readFileSync(path.resolve(OP,'config.json')).toString());
console.log(CONFIG);

const MIN_ITERATION = CONFIG.minIteration;
const MAX_ITERATION = 12;

const REP_SYMBOLS = true;
const AAAF = CONFIG.addAllAsFactors;
const AAFI = CONFIG.addAllAsFactorsIntervention;
const AAFI_MIN_RESULT_LENGTH = 5;
const AAFI_THRESH_LENGTH = 50;
const MINIMA_O_ADD_LENGTH = 3;
const COUNT_ALL = CONFIG.countAll;
const PRUNE = CONFIG.prune;
const EXTEND = CONFIG.extend;
const USE_Q_INDEX = CONFIG.useQ;
const MIN_ADD_ALL_LENGTH = CONFIG.minAddAllLength || 1;
const MAX_WORD_LENGTH_1 = CONFIG.maxWordLength || Infinity;
const MAIN_FACTOR = CONFIG.mainFactor;

const MIN_COUNT = CONFIG.minCount;
const FOUND_NOT_FACTOR_MULT = 0.75;
const SMULT = 1 << 48;

// serialize keys
  const WORD = 0;
  const COUNT = 1;
  const NAME = 2;
  const RUN_COUNT = 3;
  const FIRST_INDEX = 4;
  const NCOUNT = 0;
  const SCORE = 1;

let nameId = 0;

export const State = {
  dict: new BigMap(),
  names: new BigMap(),
};

  export function index(text, name, opts) {
    const Factors = [];
    const Ent = [];
    const sortKey = RUN_COUNT;

    let dict, docStr, factors, lastEntropy = 0, maxEntropy = 0, maxFactors;

    let Dict = State.dict;

    let prune;

    if ( PRUNE ) {
      prune = new BigSet();
    }

    indexingCycle: for( let i = 0; i < MAX_ITERATION; i++ ) {
      ({dict, factors, docStr} = lz(text, Dict, name, opts, prune)); 
      Factors.concat(factors);
      const entropy = ent(factors, opts);
      const total = entropy*factors.length;
      Ent.push({entropy, total: entropy*factors.length, name});
      if ( entropy > maxEntropy ) {
        maxFactors = factors;
        maxEntropy = entropy;
      } else if ( i >= MIN_ITERATION ) {
        break indexingCycle;
      }
      lastEntropy = entropy;
    }

    prune && prune.forEach(f => dict.delete(f[WORD]));

    return {dict, factors: maxFactors || factors, Factors};
  }

  export function query(words, right_answers = [], opts = {}) {
    const oWords = words;
    const Answers = new Set(right_answers);
    const {dict} = State;
    let factors, mainFactor, Factors;

    words = simplify(words);

    if ( MAIN_FACTOR ) {
      mainFactor = dict.get(words);
      if ( mainFactor ) {
        mainFactor[COUNT]++;
      }
    }

    words = EXTEND ? `${words} ${words} ${words}` : words;

    if ( USE_Q_INDEX ) { 
      ({Factors} = lz(words, dict, 'query', {
        idempotent:true,
        addAllAsFactors: AAAF || opts.addAllAsFactors,
        minAddLength: opts.minAddLength
      }));
    }

    ({factors} = lz(words, dict, 'query', {
      idempotent:true,
      addAllAsFactors: AAAF || opts.addAllAsFactors,
      minAddLength: opts.minAddLength
    }));


    if ( Factors ) {
      factors.push(...Factors);
    }

    //console.log(JSON.stringify({factors,Factors,mainFactor},null,2));

    if ( MAIN_FACTOR && mainFactor ) {
      factors.push(mainFactor);
    }

    let willExit = false;

    let score = 0;

    const merge = {};

    factors = dedup(factors);

    factors.forEach(f => {
      const {[NAME]:docCounts, [WORD]:word} = f;
      // discard the count information and just keep the scores per document name
      const scores = Object.fromEntries([...Object.entries(docCounts)].map(([docId,[,score]]) => {
        if ( score == null ) {
          console.log(f, docId, word);
          willExit = true;
        } 
        return [docId, score];
      }))
      // and add these to the summed scores per document for the other factors
      mergeAdd(merge, scores);
    });

    let results = dedup(Object.entries(merge), 0);

    results = results.filter(([doc]) => State.names.get(doc) !== "query");

    // sort the documents by the summed score
    results.sort(([,countA], [,countB]) => {
      return parseFloat(countB) - parseFloat(countA);
    });

    if ( willExit ) {
      process.exit(1);
    }

    // replace the document name id with the actual name (and filter out the query "result")
    results = results.map(([doc,score]) => [State.names.get(doc), score]);

    if ( right_answers.length ) {
      if ( results.length ) {
        //console.log(JSON.stringify({words, results}, null, 2));

        let Sum;
        const recall = results.reduce(
          (sum, [doc]) => Sum = Answers.has(doc) ? sum + 1 : sum, 0
        )/Answers.size;

        const precision = Sum/results.length;

        score = recall + precision;
        //console.log({score: recall + precision});

        //console.log('');
      }
      
      return score;
    }

    if ( AAFI && (
        results.length <= AAFI_MIN_RESULT_LENGTH || 
        (opts.runStart && opts.resultsLength < AAFI_THRESH_LENGTH) 
    )) {
      const newOpts = JSON.parse(JSON.stringify(opts));
      //console.log("Again?", results, newOpts);
      newOpts.addAllAsFactors = true;
      newOpts.runStart = true;
      newOpts.resultsLength = (newOpts.resultsLength || 0) + results.length;
      if ( ! newOpts.minAddLength ) {
        newOpts.minAddLength = oWords.length - 1;
      } else {
        newOpts.minAddLength--;
      }
      if ( newOpts.minAddLength >= MINIMA_O_ADD_LENGTH ) {
        //console.log("Again", results, newOpts, oWords);
        const {results:Results, factors: Factors} = query(oWords, right_answers, newOpts);
        results.push(...Results);
        if ( Factors ) {
          factors.push(...Factors);
        }
      } 
    }

    results = dedup(results, 0);
    factors = dedup(factors);

    if ( opts.factors ) {
      return {results, factors};
    } else {
      return {results};
    }
  }

  export function lz(docStr = '', dict = new Map(), name = 'unknown doc', opts = {}, prune) {
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

    docStr = simplify(docStr);

    factors.docStrLength = docStr.length;

      for ( const nextChar of docStr ) {
        if ( ! dict.has(nextChar) ) {
          const data = Array(4);
          data[WORD] = nextChar;
          data[COUNT] = MIN_COUNT;
          data[NAME] = {
            [name]: [MIN_COUNT, 0]
          };
          data[FIRST_INDEX] = charIndex;
          prune && prune.add(data);
          toNormalize.add(data);
          dict.set(nextChar, data);
          if ( opts.idempotent ) {
            reverse.push(data);
          }
        }
        if ( ! dict.has(currentWord) || currentWord.length >= MAX_WORD_LENGTH_1 ) {
          // save the new unseen token
            let data;
            if ( dict.has(currentWord) ) {
              data = dict.get(currentWord);
            } else {
              data = Array(3);
              data[WORD] = currentWord;
              data[COUNT] = MIN_COUNT;
              data[NAME] = {
                [name]: [MIN_COUNT, 0]
              };

              prune && prune.add(data);
              toNormalize.add(data);

              dict.set(currentWord, data);
              if ( opts.idempotent ) {
                reverse.push(data);
              }
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
                factor[NAME][name] = [MIN_COUNT+1, 0];
              } else {
                factor[NAME][name][NCOUNT] += 1;
              }
              factor[COUNT]++;

              factors.push(factor);
              prune && prune.delete(factor);
              toNormalize.delete(factor);
            }

          // update the state
            wordFirstIndex = charIndex;
            currentWord = suffix;
        } else if ( (COUNT_ALL || opts.addAllAsFactors) && currentWord.length >= Math.max(opts.minAddLength || 1, MIN_ADD_ALL_LENGTH) ) {
          // we could add a [SCORE] to data and check it here 
          // and if it's above some thresh we could use count that
          const data = dict.get(currentWord);
          if ( !data[NAME][name] ) {
            data[NAME][name] = [MIN_COUNT+1, 0]
          } else {
            data[NAME][name][NCOUNT]++;
          }
          data[COUNT]++;
          toNormalize.add(data);
          prune && prune.delete(data);
          if ( opts.addAllAsFactors ) {
            factors.push(data);
          }
        }

        currentWord += nextChar;
        charIndex += 1;
      }

      // empty any state into the dictionary and factors list
        if ( ! dict.has(currentWord) ) {
          // save the new unseen token
            const data = Array(3);
            data[WORD] = currentWord;
            data[COUNT] = MIN_COUNT;
            data[NAME] = {
              [name]: [MIN_COUNT, 0]
            };
            prune && prune.add(data);
            toNormalize.add(data);
            dict.set(currentWord, data);
            if ( opts.idempotent ) {
              reverse.push(data);
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
              prune && prune.delete(factor);
              toNormalize.delete(factor);

              if ( !factor[NAME][name] ) {
                factor[NAME][name] = [MIN_COUNT, 0];
              } else {
                factor[NAME][name][NCOUNT] += 1;
              }

              // in this case we push the last factor if any
                const suffixFactor = dict.get(suffix);
                factors.push(suffixFactor);
                prune && prune.delete(suffixFactor);
                toNormalize.delete(suffixFactor);

                if ( !suffixFactor[NAME][name] ) {
                  suffixFactor[NAME][name] = [MIN_COUNT, 0];
                } else {
                  suffixFactor[NAME][name][NCOUNT] += 1;
                }
            }
        } else {
          const factor = dict.get(currentWord);
          if ( factor[COUNT] == MIN_COUNT ) {
            factor[FIRST_INDEX] = wordFirstIndex;
          }
          if ( !factor[NAME][name] ) {
            factor[NAME][name] = [MIN_COUNT, 0];
          } else {
            factor[NAME][name][NCOUNT] += 1;
          }
          factor[COUNT]++;

          factors.push(factor);
          prune && prune.delete(factor);
          toNormalize.delete(factor);
        }

    // normalize factors
      factors.forEach(f => {
        const n = f[NAME][name];
        if ( ! n ) {
          console.log(f, name);
        }
        n[SCORE] = n[NCOUNT] / factors.length;
        n[SCORE] = Math.round(n[SCORE] * SMULT);
        //n[SCORE] *= -Math.log(Object.keys(f[NAME]).length/State.names.size);
      });
      toNormalize.forEach(f => {
        const n = f[NAME][name];
        n[SCORE] = FOUND_NOT_FACTOR_MULT * 1 / factors.length;
        n[SCORE] = Math.round(n[SCORE] * SMULT);
        //n[SCORE] *= -Math.log(Object.keys(f[NAME]).length/State.names.size);
      });

    if ( opts.idempotent ) {
      reverse.forEach(({[WORD]:word}) => {
        dict.delete(word);
      });
    }

    return {factors, dict, docStr};
  }

  export function ent(factors, opts = {}) {
    let TotalLength = 0;
    let Ent = 0;

    const dict = new Map(); 

    for( const f of factors ) {
      if ( !dict.has(f[WORD]) ) {
        dict.set(f[WORD], f);
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

    if ( ! opts.addAllAsFactors ) {
      const check = factors.docStrLength == TotalLength;

      console.assert(check, factors.docStrLength, TotalLength);
    }

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

  export function simplify(str) {
    if ( REP_SYMBOLS ) {
      str = str.replace(/(\p{S})\p{S}*/gu, ' $1 ');
    }
    str = str.replace(/[\p{Z}\p{P}\p{C}]+/gu, ' ');      
    str = str.replace(/[\x00-\x1f\x7f]+/gu, ' ');  
    str = str.trim();
    str = str.toLocaleLowerCase();

    //console.log({str});

    return str;
  }

  export async function saveToDisk(limit = Infinity) {
    if ( !fs.existsSync(path.resolve('dicts')) ) {
      fs.mkdirSync(path.resolve('dicts'), {recursive:true});
    }

    console.log(`Saving ${State.names.size/2} indexed document names...`);

    const names = [...State.names.entries()];

    fs.writeFileSync(path.resolve("dicts", "names.json"), JSON.stringify(names));

    console.log("Done");

    console.log(`Collecting ${State.dict.size} in-memory values...`);

    let i = 0;
    let chunkId = 0;

    const chunkSize = 250000;

    const values = [...State.dict.values()];

    console.log(`Serializing ${values.length} values...`);

    const ValuesLength = values.length;

    while(values.length) {
      const chunk = values.splice(0, chunkSize);

      process.stdout.write(`Writing chunk of ${Math.min(chunk.length, chunkSize)} values...`);

      const fd = fs.openSync(
        path.resolve('dicts', `dict.${(chunkId+'').padStart(5,'0')}.json`), 
        "w"
      );

      fs.writeSync(fd, "[");

      for( const [j, value] of chunk.entries() ) {
        const closeOff = (
          (i >= Math.min(limit - 1, ValuesLength - 1)) || (j >= (chunk.length - 1))
        );
        const string = JSON.stringify(value) + (closeOff ? "]" : ",");
        fs.writeSync(fd, string);
        if ( closeOff ) break;
        i += 1;
      }

      fs.closeSync(fd);

      console.log("Done!");

      chunkId++;

      if ( i >= limit-1 ) {
        break;
      }
    }
  }

  export async function loadFromDisk(limit = Infinity) {
    const entries = [];

    const files = fs.readdirSync(path.resolve('dicts'), {withFileTypes:true});

    console.log("Loading indexed document names...");

    State.names = new BigMap();

    JSON.parse(
      fs.readFileSync(
        path.resolve('dicts', 'names.json')
      ).toString()
    ).forEach(([k,v]) => State.names.set(k,v));

    console.log("Loading document index files...");

    const StringChunkSize = 1000000; 
    let i = 0;

    for( const file of files ) {
      if ( file.isDirectory() ) continue;
      if ( !file.name.startsWith('dict') ) continue;
      console.log(`Reading dict file ${file.name}...`);
      const buf = fs.readFileSync(path.resolve('dicts', file.name));
      let lastString = '';
      for( let j = 2; j < buf.length-2; j) {
        const str = lastString + buf.slice(j, j+StringChunkSize).toString();
        let largestIndex = str.lastIndexOf('],[');
        str.slice(0, largestIndex)
          .split(/\],\[/g)
          .map(o => {
            try {
              return JSON.parse(`[${o}]`);
            } catch(e) {
              console.log(o, e);
              process.exit(1);
            }
          })
          .forEach(o => {
            if ( i < limit ) {
              entries.push([o[WORD], o]);
            }
            i += 2;
          });
        j += StringChunkSize;
        lastString = str.slice(largestIndex+3);
      }
      if ( i >= limit ) {
        break;
      }
    }

    console.log(`Creating dict with ${entries.length} factors...`);

    State.dict = new BigMap();
    entries.forEach(([k,v]) => State.dict.set(k,v));

    console.log("Done!");
  }

  export function dedup(list, key, jsonify = false) {
    const oList = Array.from(list);
    let map;

    if ( key !== undefined ) {
      map = new Map();
      list = list.map(o => {
        map.set(o[key], o);
        return o[key];
      });
    }

    if ( jsonify ) {
      list = list.map(o => JSON.stringify(o));
    }

    let deduped = new Set(list);
    
    deduped = [...deduped.keys()];
  
    if ( key !== undefined ) {
      deduped = deduped.map(k => map.get(k));
    } 

    if ( jsonify ) {
      deduped = deduped.map(s => JSON.parse(s));
    }

    return deduped;
  }

