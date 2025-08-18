require('dotenv').config();
const readline = require('readline');
const OpenAI = require('openai');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Loaded' : 'Missing');


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); // Set your OPENAI_API_KEY in environment variables

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

const operationMap = {
  addition: '+',
  subtraction: '-',
  multiplication: '*',
  division: '/',
};

async function chooseOperation(level) {
  let ops;
  if (level === 'basic') {
    ops = ['addition', 'subtraction'];
  } else if (level === 'intermediate') {
    ops = ['addition', 'subtraction', 'multiplication'];
  } else if (level === 'advanced') {
    ops = ['addition', 'subtraction', 'multiplication', 'division'];
  } else {
    throw new Error('Invalid level');
  }

  const prompt = `Randomly choose one operation from: ${ops.join(', ')}. Respond only with the chosen operation name.`;
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
  });
  const chosenOp = response.choices[0].message.content.trim().toLowerCase();
  if (!ops.includes(chosenOp)) {
    throw new Error('Invalid operation chosen by AI');
  }
  return { name: chosenOp, symbol: operationMap[chosenOp] };
}

async function generateTargetAndNumbers(operationName, symbol) {
  const prompt = `
Generate a target positive integer between 1 and 100.
Then, generate 8 unique pairs of positive integers (each between 1 and 200) such that when applying the operation "${operationName}" (${symbol}), each pair results in the target.
Rules:
- For addition: a + b = target
- For subtraction: a - b = target with a > b
- For multiplication: a * b = target
- For division: a / b = target with b dividing a evenly, and quotient being the integer target
Try to make all 16 numbers as unique as possible; allow duplicates only if necessary.
First generate the pairs, then flatten them into a list of 16 numbers and shuffle the list.
Output only valid JSON: {"target": target, "numbers": [shuffled array of 16 numbers]}
`;
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
  });
  const jsonStr = response.choices[0].message.content.trim();
  return JSON.parse(jsonStr);
}

function createGrid(numbers) {
  const grid = [];
  for (let i = 0; i < 4; i++) {
    grid.push(numbers.slice(i * 4, (i + 1) * 4));
  }
  return grid;
}

function displayGrid(grid, marked, target, symbol) {
  console.log('Grid:');
  for (let r = 0; r < 4; r++) {
    const row = [];
    for (let c = 0; c < 4; c++) {
      row.push(marked[r][c] ? 'X' : grid[r][c]);
    }
    console.log(row.join('\t'));
  }
  console.log(`Target: ${target}, Operation: ${symbol}`);
}

function isAllMatched(marked) {
  return marked.every(row => row.every(cell => cell));
}

function checkPair(a, b, symbol, target) {
  if (symbol === '+') return a + b === target;
  if (symbol === '*') return a * b === target;
  if (symbol === '-') return Math.abs(a - b) === target;
  if (symbol === '/') {
    if (b !== 0 && a % b === 0 && a / b === target) return true;
    if (a !== 0 && b % a === 0 && b / a === target) return true;
    return false;
  }
  return false;
}

async function main() {
  console.log('Welcome to the Math Game!');

  let level;
  while (true) {
    level = (await ask('Pick level: basic, intermediate, or advanced: ')).trim().toLowerCase();
    if (['basic', 'intermediate', 'advanced'].includes(level)) break;
    console.log('Invalid level, try again.');
  }

  const { name: operationName, symbol } = await chooseOperation(level);

  const { target, numbers } = await generateTargetAndNumbers(operationName, symbol);

  const grid = createGrid(numbers);
  const marked = Array(4).fill().map(() => Array(4).fill(false));

  while (!isAllMatched(marked)) {
    displayGrid(grid, marked, target, symbol);

    let r1, c1, r2, c2;
    while (true) {
      const input1 = (await ask('Enter first position (row col, 1-4): ')).trim();
      const parts1 = input1.split(' ').map(x => parseInt(x) - 1);
      if (parts1.length !== 2 || parts1.some(isNaN) || parts1.some(x => x < 0 || x > 3)) {
        console.log('Invalid input, try again.');
        continue;
      }
      [r1, c1] = parts1;
      if (marked[r1][c1]) {
        console.log('Already matched, choose another.');
        continue;
      }
      break;
    }

    while (true) {
      const input2 = (await ask('Enter second position (row col, 1-4): ')).trim();
      const parts2 = input2.split(' ').map(x => parseInt(x) - 1);
      if (parts2.length !== 2 || parts2.some(isNaN) || parts2.some(x => x < 0 || x > 3)) {
        console.log('Invalid input, try again.');
        continue;
      }
      [r2, c2] = parts2;
      if (marked[r2][c2]) {
        console.log('Already matched, choose another.');
        continue;
      }
      if (r1 === r2 && c1 === c2) {
        console.log('Same position, choose different.');
        continue;
      }
      break;
    }

    const num1 = grid[r1][c1];
    const num2 = grid[r2][c2];

    if (checkPair(num1, num2, symbol, target)) {
      marked[r1][c1] = true;
      marked[r2][c2] = true;
      console.log('Correct!');
    } else {
      console.log('Wrong, try again.');
    }
  }

  displayGrid(grid, marked, target, symbol);
  console.log('You won!');
  rl.close();
}

main().catch(err => {
  console.error(err);
  rl.close();
});