require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai').default;

if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY is not set in .env file');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const app = express();
app.use(cors());
app.use(express.json());

const operationMap = {
  addition: '+',
  subtraction: '-',
  multiplication: '*',
  division: '/',
};

let gameState = null;

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
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });
    const chosenOp = response.choices[0].message.content.trim().toLowerCase();
    if (!ops.includes(chosenOp)) {
      throw new Error('Invalid operation chosen by AI');
    }
    return { name: chosenOp, symbol: operationMap[chosenOp] };
  } catch (err) {
    throw new Error(`Failed to choose operation: ${err.message}`);
  }
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
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });
    const jsonStr = response.choices[0].message.content.trim();
    return JSON.parse(jsonStr);
  } catch (err) {
    throw new Error(`Failed to generate numbers: ${err.message}`);
  }
}

function createGrid(numbers) {
  const grid = [];
  for (let i = 0; i < 4; i++) {
    grid.push(numbers.slice(i * 4, (i + 1) * 4));
  }
  return grid;
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

function isAllMatched(marked) {
  return marked.every(row => row.every(cell => cell));
}

app.post('/start', async (req, res) => {
  const { level } = req.body;
  if (!['basic', 'intermediate', 'advanced'].includes(level)) {
    return res.status(400).json({ error: 'Invalid level' });
  }

  try {
    const { name: operationName, symbol } = await chooseOperation(level);
    const { target, numbers } = await generateTargetAndNumbers(operationName, symbol);
    if (!numbers || numbers.length !== 16) {
      throw new Error('Invalid number of grid values returned');
    }
    const grid = createGrid(numbers);
    const marked = Array(4).fill().map(() => Array(4).fill(false));

    gameState = { level, operationName, symbol, target, grid, marked };
    res.json({ target, symbol, grid, marked, message: 'Game started' });
  } catch (err) {
    console.error('Start endpoint error:', err);
    res.status(500).json({ error: `Failed to start game: ${err.message}` });
  }
});

app.post('/guess', (req, res) => {
  if (!gameState) {
    return res.status(400).json({ error: 'No game in progress' });
  }

  const { r1, c1, r2, c2 } = req.body;
  if (
    r1 < 0 || r1 > 3 || c1 < 0 || c1 > 3 ||
    r2 < 0 || r2 > 3 || c2 < 0 || c2 > 3 ||
    (r1 === r2 && c1 === c2) ||
    gameState.marked[r1][c1] || gameState.marked[r2][c2]
  ) {
    return res.status(400).json({ error: 'Invalid or already matched positions', correct: false });
  }

  const num1 = gameState.grid[r1][c1];
  const num2 = gameState.grid[r2][c2];
  const isCorrect = checkPair(num1, num2, gameState.symbol, gameState.target);

  if (isCorrect) {
    gameState.marked[r1][c1] = true;
    gameState.marked[r2][c2] = true;
  }

  const won = isAllMatched(gameState.marked);
  res.json({
    correct: isCorrect,
    marked: gameState.marked,
    won,
    message: isCorrect ? 'Correct!' : 'Wrong, try again.',
  });
});

app.get('/state', (req, res) => {
  if (!gameState) {
    return res.status(400).json({ error: 'No game in progress' });
  }
  res.json({
    target: gameState.target,
    symbol: gameState.symbol,
    grid: gameState.grid,
    marked: gameState.marked,
    won: isAllMatched(gameState.marked),
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});