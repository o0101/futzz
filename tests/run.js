import fs from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';
import {exec,execSync} from 'child_process';
import {discohash} from 'bebb4185';
import {dedup, simplify, State, loadFromDisk, saveToDisk, query, index, ent} from '../src/futzz.js';

const SHOW_RESULTS = true;
const SAVE_CORRELATION = false;
const PAGE = 3;
const NAMES_ONLY_PAGE_LENGTH = 10;

const NOLIST = new Set([
  'factors',
  'stats'
]);

const PARAM_RANGES = {
  "minIteration": [2, 3],
  "maxWordLength": [31],
  "minAddAllLength": [1,2,3],
  "mainFactor": [true],
  "prune": [true],
  "useQ": [false],
  "extend": [true],
  "countAll": [false, true],
  "addAllAsFactors": [false],
  "addAllAsFactorsIntervention": [false, true],
  "minCount": [1]
}

const cat = process.argv[2];
const act = process.argv[3];
const num = parseInt(process.argv[4]) || undefined;
const ak = num || process.argv[4] === 'nolimit' ? process.argv[5] : process.argv[4];
const jap = process.argv[6] ? process.argv[6] : process.argv[5];
const zang = process.argv[7] ? process.argv[7] : process.argv[6];

start();

async function start() {
  if ( cat ) {
    if ( act === 'multi') {
      console.log("Multi auto mode");
      console.log(num);
      await runMultiAuto(num);
    } else if ( act === 'load' ) {
      console.log("Load mode");
      await runLoad(num);
    } else if ( act === 'disk' ) {
      console.log("Save mode");
      await runDisk(num);
    } else if ( act === 'auto' ) {
      console.log("Auto mode");
      const S = await runAuto(num, ak);
      console.log(JSON.stringify(S, null, 2));
    } else {
      console.log("Q&A mode");
      await runNew(parseInt(act) || Infinity);
    }
  } else {
    console.log("Simple test mode");
    await runAll();
  }
}

  function enumerateConfigs(ranges) {
    const keys = Object.keys(ranges);
    const MAX = Array(keys.length);
    Object.values(ranges).forEach((vArray, i) => MAX[i] = vArray.length);

    const values = Array(keys.length);
    Object.values(ranges).forEach((vArray, i) => values[i] = vArray);

    const units = Array(keys.length);
    units.fill(0);

    const enumeration = [];
    let k = 0;

    enumerating: while(units[0] != MAX[0]) {
      enumeration.push(units.map((i, j) => values[j][i]));  
      k++;
      for(let i = units.length-1; i >= 0; i--) {
        if ( units[i] < MAX[i]-1 ) {
          units[i]++;
          break;
        } else if ( i > 0 ) {
          units[i] = 0;
        } else {
          break enumerating;
        }
      }
    }

    console.log(`Enumerated ${k} possibilities.`);

    console.assert(k === enumeration.length);

    return enumeration.map(vals => {
      const c = {};
      vals.forEach((v,i) => {
        c[keys[i]] = v;   
      });
      return c;
    });
  }

  async function runMultiAuto(limit = 'nolimit') {
    const allConfigs = enumerateConfigs(PARAM_RANGES);
    //console.log(JSON.stringify({allConfigs}));
    const POOL_SIZE = os.cpus().length - 4; // 1 for OS and 1 for this process, and 2 spare
    const runner = [];
    let notifyComplete;
    let running = 0;
    let test = 0;
    for( const config of allConfigs ) {
      const dirname = test+'';
      runner.push(() => {
        const outPath = path.resolve('results', 'configtests', dirname);
        if ( !fs.existsSync(outPath) ) {
          fs.mkdirSync(outPath, {recursive:true});
        }

        fs.writeFileSync(path.resolve(outPath, 'config.json'), JSON.stringify(config,null,2));

        exec(`npm test ufo auto ${limit} no no-progress ${outPath}`, (err, stdout, stderr) => {
          if ( err ) {
            console.warn(err);
          }
          const result = (err || stdout).toString();
          fs.writeFileSync(path.resolve(outPath, 'result.txt'), result);
          notifyComplete();
        });
      });
      test++;
    }

    await startRun();

    console.log("Done!");

    async function startRun() {
      while(runner.length || running > 0) {
        if ( running < Math.min(allConfigs.length, POOL_SIZE) ) {
          const startNextJob = runner.shift();
          if ( ! startNextJob ) {
            break;
          }
          startNextJob();
          running += 1;
          console.log({jobStarted:{running}, remaining: runner.length});
        } else {
          await completionNotified();
          running -= 1;
          console.log({jobCompleted:{running}});
        }
      }
    }

    function completionNotified() {
      let resolver;
      const p = new Promise(res => resolver = res);
      notifyComplete = resolver;
      return p;
    }
  }

  async function runAuto(limit, loadIndexFromDisk = true) {
    if ( loadIndexFromDisk === 'no' ) {
      loadIndexFromDisk = false;
    }

    if ( ! loadIndexFromDisk ) {
      console.log("Indexing documents...");

      await runNew(limit, true);
    } else {
      await loadFromDisk(limit);
    }

    console.log(`Indexing created ${Math.round(State.dict.size/2)} factors`);
    console.log("Running queries...");
    const files = fs.readdirSync(path.resolve('tests', 'queries'), {withFileTypes:true});
    const Summary = {
      precision: [],
      recall: [],
      groups: []
    };

    files.forEach((file,i) => {
      if ( file.isDirectory() ) return;
      const Precision = [];
      const Recall = [];
      const Record = [];
      const group = file.name;
      const name = group.replace('.dat', '');
      const queries = fs
        .readFileSync(path.resolve('tests', 'queries', group))
        .toString()
        .split(/\n/g)
        .map(q => q.trim())
        .filter(q => q.length);

      console.log(`Running query set ${i+1} of ${files.length} with ${queries.length} queries...`);
      let isCorrelation = false;
      let isAnti = false;

      if ( group.startsWith('_') ) {
        isCorrelation = true;
        // it's a correlation group, so split each line
        queries.forEach((q,i) => {
          queries[i] = q.split(/\s*,\s*/);
        });
      }

      if ( group.startsWith('!') ) {
        isAnti = true;
      }

      if ( isCorrelation ) {
        for(  const [first, second] of queries ) {
          try {
            const {precision, recall} = evaluateCorrelationQuery(first, second);
            Precision.push(precision);
            Recall.push(recall);
            Record.push([first, second, precision, recall]);
            if ( SAVE_CORRELATION ) {
              Summary.precision.push(precision);
              Summary.recall.push(recall);
            }
          } catch(e) {
            continue;
          }
        }
      } else {
        for( const q of queries ) {
          try {
            const {precision, recall} = evaluateQuery(q);
            Precision.push(precision);
            Recall.push(recall);
            Record.push([q, precision, recall]);
            if ( ! isAnti ) {
              Summary.precision.push(precision);
              Summary.recall.push(recall);
            }
          } catch(e) {
            continue;
          }
        }
      }

      Summary.groups.push({
        name,
        AvgPrecision: (Precision.reduce((A,p) => A + p, 0)/Precision.length).toFixed(4),
        AvgRecall: (Recall.reduce((A,p) => A + p, 0)/Precision.length).toFixed(4),
        Record
      });
    });

    const pLen = Summary.precision.length;

    if ( pLen ) {
      // summarise precision
        Summary.avgPrecision = (Summary.precision.reduce((A,p) => A + p, 0)/pLen).toFixed(2);
        Summary.medianPrecision = (Array.from(Summary.precision)
          .sort()
          .slice(...(pLen%2 == 0 ? [pLen/2-1,pLen/2+1] : [(pLen+1)/2, (pLen+1)/2+1]))
          .reduce((A,p) => A + p, 0)/(pLen%2 == 0 ? 2 : 1)).toFixed(2);
        Summary.modePrecision = parseFloat(Object.entries(
          Summary.precision
            .reduce((F,p) => (p = Math.round(p), F[p] = (F[p] || 0) + 1, F), {})
        ).sort(([k,v], [k2,v2]) => v2 - v)[0][0]).toFixed(0);

      // summarise recall
        Summary.avgRecall = (Summary.recall.reduce((A,p) => A + p, 0)/pLen).toFixed(2);
        Summary.medianRecall = (Array.from(Summary.recall)
          .sort()
          .slice(...(pLen%2 == 0 ? [pLen/2-1,pLen/2+1] : [(pLen+1)/2, (pLen+1)/2+1]))
          .reduce((A,p) => A + p, 0)/(pLen%2 == 0 ? 2 : 1)).toFixed(2);
        Summary.modeRecall = parseFloat(Object.entries(
          Summary.recall
            .reduce((F,p) => (p = Math.round(p), F[p] = (F[p] || 0) + 1, F), {})
        ).sort(([k,v], [k2,v2]) => v2 - v)[0][0]).toFixed(0);

        Summary.score = (parseFloat(Summary.avgRecall) + parseFloat(Summary.avgPrecision)).toFixed(2);
      
      const {
        avgPrecision, medianPrecision, modePrecision,
        avgRecall, medianRecall, modeRecall 
      } = Summary;
      
      if ( jap !== 'no-progress' ) {
        for( const group of Summary.groups ) {
          const {AvgPrecision, AvgRecall} = group;

          console.log(`\nGroup ${group.name}`);
          console.log(JSON.stringify({
            group: group.name,
            AvgPrecision,
            AvgRecall
          }, null, 2));
        }

        console.log(`\n\nOverall for category ${cat}`);
        console.log(JSON.stringify({
          avgPrecision, medianPrecision, modePrecision,
          avgRecall, medianRecall, modeRecall 
        }, null, 2));
      }
    }

    if ( jap !== 'no-progress' ) {
      console.log(`Ran ${pLen} experiments.`);
    }

    return Summary;
  }

  function evaluateQuery(q, noThrow = false, opts) {
    q = simplify(q);
    const {results, ...rest} = query(q, undefined, opts);
    const matchingFiles = getFiles(q);
    if ( matchingFiles.size === 0 && ! noThrow ) {
      throw new TypeError('Not enough matches to compare against');
    }
    const matchingResults = results.filter(([name]) => matchingFiles.has(name));
    const recall = matchingResults.length / (1+matchingFiles.size)*100;
    const precision = matchingResults.length / (1+results.length)*100;
    return {results, recall, precision, ...rest};
  }

  function evaluateCorrelationQuery(a, b, opts) {
    q = simplify(q);
    const {results:resultsa, ...resta} = query(a, undefined, opts);
    const {results:resultsb, ...restb} = query(b, undefined, opts);
    // b should align to a
    const matchingFiles = new Set(resultsa.map(([name]) => name));
    if ( matchingFiles.size === 0 ) {
      throw new TypeError('Not enough matches to compare against');
    }
    const matchingResults = resultsb.filter(([name]) => matchingFiles.has(name));
    const recall = matchingResults.length / (1+matchingFiles.size)*100;
    const precision = matchingResults.length / (1+resultsb.length)*100;
    //console.log({matchingFiles:matchingFiles, matchingResults:matchingResults,recall, precision});
    return {recall, precision};
  }

  function getFiles(query) {
    const base = path.resolve('demo', 'data', cat, '*');
    try {
      query = query.split(/\s+/gu).join('/&&/');
      const qHash = discohash(query).toString(16);
      const qResultPath = path.resolve(
        'tests', 'queries', 'precomputed-results-filenames', `${qHash}.dat` 
      );
      let files = [], needsSave = false;

      if ( fs.existsSync(qResultPath) ) {
        try {
          files = JSON.parse(fs.readFileSync(qResultPath).toString());
        } catch(e) {
          console.warn("File exists but reading as JSON threw an error", e);
          needsSave = true;
        }
      } else {
        needsSave = true;
      }

      if ( needsSave ) {
        console.log({saving:{query, location:qResultPath}});
        try {
          files = execSync(
              `find ${
                base
              } -type f -exec awk -v RS='.' '{IGNORECASE=1;}/${
                query
              }/{print FILENAME}' {} \\;`
            )
            .toString()
            .split(/\n/g)
            .filter(n => n.trim().length)
            .map(n => path.resolve(cat, n));
          files = dedup(files);
          console.log({files});
          if ( ! fs.existsSync(path.dirname(qResultPath) ) ) {
            console.log({creating: path.dirname(qResultPath)});
            fs.mkdirSync(path.dirname(qResultPath), {recursive:true});
          }
          try {
            fs.writeFileSync(qResultPath, JSON.stringify(files,null,2));
          } catch(e) {
            console.warn(e);
            fs.writeFileSync('error.last.txt', e.toString());
            process.exit(1);
          }
        } catch(e2) {
          console.warn(e2);
        }
      }

      return new Set(files);
    } catch(e) {
      //console.warn(e);
      return new Set();
    }
  }

  async function runDisk(limit) {
    console.log("Indexing documents...");

    await runNew(limit, true);

    console.log("Saving to disk...");

    await saveToDisk();
  }

  async function runLoad(limit) {
    console.log("Loading indexes...");

    await loadFromDisk(limit);

    await runNew(undefined, undefined, true);
  }

  async function runNew(limit = Infinity, noTerminal = false, noIndex = false) {
    let count = 0;
    let terminal;

    if ( ! noTerminal ) {
      terminal = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
    }

    if ( ! noIndex ) {
      const entries = [];
      let total = 0;

      entries.push(...fs.readdirSync(path.resolve('demo','data', cat), {withFileTypes:true}));
      total = entries.length;

      entries.map(dirent => dirent.basePath = path.resolve('demo', 'data', cat));

      while( entries.length && count < limit ) {
        const entry = entries.shift();
        if ( ! entry.isDirectory ) {
          console.log(entry);
        }
        if ( entry.isDirectory() ) {
          total -= 1;
          const newEntries = Array.from(
            fs.readdirSync(
              path.resolve(entry.basePath, entry.name), 
              {withFileTypes:true}
            ).map(dirent => (dirent.basePath = path.resolve(entry.basePath, entry.name), dirent))
          );
          total += newEntries.length;
          entries.push(...newEntries);
        } else {
          const filePath = path.resolve(entry.basePath, entry.name);
          runIteration1(fs.readFileSync(filePath).toString(), filePath);
          count ++;
          if ( jap !== 'no-progress' ) {
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            process.stdout.write(
              `Indexed ${count}/${
                Math.min(limit,total)
               } \t (${
                Math.round(State.dict.size/2)
               } codes) \t (${
                (count/Math.min(limit,total)*100).toFixed(2)
              }%) files...`
            );
          }
        }
      }

      console.log('Done!');
    } else {
      count = State.names.size/2;
    }

    if ( noTerminal ) {
      return;
    }

    let q
    do {
      q = await new Promise(res => terminal.question(`Query ${count} files> `, res));
      q = q && q.trim();
      if ( q && q.length && q !== '.exit' ) {
        let extra;
        let noQuery = false;
        let command;
        if ( q.startsWith('.') ) {
          const firstSpace = q.indexOf(' ');
          if ( firstSpace >= 0 ) {
            command = q.slice(1, firstSpace); 
            q = q.slice(firstSpace+1);
            console.log({command,q});
          }

          if ( fs.existsSync(path.resolve(q)) ) {
            ({[command]: extra} = index(fs.readFileSync(path.resolve(q)).toString(), q));
            noQuery = true;
          }
        }
        let precision, recall, results;

        let Page = PAGE;
        if ( command === 'names' ) {
          Page = NAMES_ONLY_PAGE_LENGTH;
        }

        if ( ! noQuery ) {
          ({precision, recall, results, [command]: extra} = evaluateQuery(q, true, {[command]:true}));
        }

        if ( command && extra ) {
          console.log({[command]:extra});
        }

        if ( results && results.length && !NOLIST.has(command)) {
          results = results.map(([name]) => ({name, start:fs.readFileSync(name).toString().trim().slice(300, 512)}));

          let i = 0;
          if ( SHOW_RESULTS ) {
            for (const {name, start} of results ) {
              console.log(name);
              if ( command !== 'names' ) {
                console.log(start);
                console.log('\n');
              }
              i++;
              if ( i % Page === 0 ) {
                await new Promise(
                  res => terminal.question(
                    `Page ${i/Page} of ${Math.round(results.length/Page)}. ENTER for next`,
                    res
                  )
                );
              }
            }
          }
        }

        console.log({resultsLength: results.length, precision, recall});
      }
    } while( q !== '.exit' );

    terminal.close();
  }

  function runAll() {
    let score = 0;
    runEmpty();
    runIteration1(fs.readFileSync(path.resolve('samples', 'di.txt')).toString(), 'declaration of independence');
    runIteration1(fs.readFileSync(path.resolve('samples', 'do.txt')).toString(), 'down and out');
    runIteration1(fs.readFileSync(path.resolve('samples', 't2.txt')).toString(), 'terminator 2');
    runIteration1(fs.readFileSync(path.resolve('samples', 'tao.txt')).toString(), 'tao te ching - chinese');
    runIteration1(fs.readFileSync(path.resolve('samples', 'tao2.txt')).toString(), 'wiki - tao te ching - chinese');
    runIteration1(fs.readFileSync(path.resolve('samples', 'tao3.txt')).toString(), 'wiki - tao te ching - english');
    runIteration1(fs.readFileSync(path.resolve('samples', 'hm.txt')).toString(), 'haruki murakami - chinese');
    const {dict} = runIteration1(fs.readFileSync(path.resolve('samples', 'hm2.txt')).toString(), 'haruki murakami - english');
    console.log({dictSize: dict.size});
    score += query("terminator 2", [ "terminator 2"]);

    score += query("judgement day", ["terminator 2" ]);
    score += query("john connor", [ "terminator 2"]);
    score += query("john connor's mother's name", [ "terminator 2"]);
    score += query("Whuffie book", [ "down and out" ]);
    score += query("Keep a moving Dan", ["down and out" ]);
    score += query("Declaration of Independence", [ "declaration of independence" ]);
    score += query("life liberty and the pursuit of happiness", [ "declaration of independence" ]);
    score += query("hasta la vista baby", [ "terminator 2" ]);
    score += query("baby", [ "down and out", "terminator 2" ]);
    score += query("legislature of the united states", [ "declaration of independence" ]);
    score += query("of free men and government, all the world's peoples", [ "declaration of independence" ]);
    score += query("haruki murakami", [ "haruki murakmai - english", "haruki murakami - chinese" ]);
    score += query("挪威的森林", [ "haruki murakami - chinese" ]);
    score += query("tao te ching", [ "wiki - tao te ching - english" ]);
    score += query("道的方式", [ "wiki - tao te ching - chinese", "tao te ching - chinese" ]);
    score += query("the way amazing", [ "wiki - tao te ching - english", "tao te ching - chinese" ]);
    score += query("在國王的宇宙中，無路可走的路是未知的", [ "tao te ching - chinese", "wiki - tao te ching - chinese" ]);
    score += query("the way", [ "wiki - tao te ching - english", "down and out" ]);
    score += query("都在天堂之下", [ "wiki - tao te ching - chinese", "tao te ching - chinese" ]);
    score += query("Midori", [ "haruki murakami - english", "haruki murakami - chinese" ]);
    score += query("famous Kobe writer", [ "haruki murakami - english" ]);
    score += query("神戶著名作家", [ "haruki murakami - chinese" ]);
    score += query("lao zi", [ "wiki - tao te ching - english", "tao te ching - chinese" , "wiki - tao te ching - chinese"]);
    score += query("老子", [ "tao te ching - chinese", "wiki - tao te ching - chinese" ]);
    score += query("the tao", [ "tao te ching - chinese", "wiki - tao te ching - english" ]);
    score += query("the warring states period", [ "tao te ching - chinese", "wiki - tao te ching - english", "declaration of independence", "terminator 2"]);
    score += query("classical chinese history texts", [ "tao te ching - chinese", "wiki - tao te ching - english"]);
    score += query("the art of war", [ "wiki - tao te ching - english", "tao te ching - chinese"]);
    if ( cat ) {
      score += query(cat, process.argv[3] ? [process.argv[3]] : [ ]);
    }

    console.log({totalScore:score});

    // not needed for now
      //rotating of the source text to change factorization
      //runIteration2();
    if ( !fs.existsSync(path.resolve('dicts')) ) {
      fs.mkdirSync(path.resolve('dicts'), {recursive:true});
    }

  }

  function runEmpty(dict = new Map()) {
    return dict;
  }

  function runIteration1(Text, name) {
    return index(Text, name);
  }

  // not needed for now
