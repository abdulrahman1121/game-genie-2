const express = require('express');
const OpenAI = require('openai').default;

if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY is not set in .env file');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const router = express.Router();

const operationMap = {
  addition: '+',
  subtraction: '-',
  multiplication: '*',
  division: '/',
};

let gameState = null;

function chooseOperation(level) {
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

  const chosenOp = ops[Math.floor(Math.random() * ops.length)];
  return { name: chosenOp, symbol: operationMap[chosenOp] };
}

async function generateTargetAndNumbers(operationName, symbol) {
  const maxNumber = 100; // Can change to 1000 later
  const prompt = `
Generate a target positive integer between 1 and 100.
Then, generate exactly 8 unique pairs of positive integers (each between 1 and ${maxNumber}) such that when applying the operation "${operationName}" (${symbol}), each pair results in the target.
Rules:
- For addition: a + b = target, with a > 0, b > 0, a <= target, b <= target
- For subtraction: a - b = target, with a > b > 0, a <= ${maxNumber}
- For multiplication: a * b = target, with a > 0, b > 0, a <= ${maxNumber}, b <= ${maxNumber}
- For division: a / b = target with a % b == 0, quotient target, a > 0, b > 0, a <= ${maxNumber}, b <= ${maxNumber}
Try to make all 16 numbers as unique as possible; allow duplicates only if necessary.
First generate the pairs, then flatten them into a list of 16 numbers and shuffle the list.
Output only valid JSON: {"target": target, "pairs": [[a1,b1],[a2,b2],...,[a8,b8]], "numbers": [shuffled array of 16 numbers]}

Example for ${operationName}:
${
  operationName === 'addition' ? '{"target": 50, "pairs": [[1,49],[2,48],[3,47],[4,46],[5,45],[6,44],[7,43],[8,42]], "numbers": [shuffled]}"' :
  operationName === 'subtraction' ? '{"target": 10, "pairs": [[11,1],[12,2],[13,3],[14,4],[15,5],[16,6],[17,7],[18,8]], "numbers": [shuffled]}"' :
  operationName === 'multiplication' ? '{"target": 24, "pairs": [[1,24],[2,12],[3,8],[4,6],[6,4],[8,3],[12,2],[24,1]], "numbers": [shuffled]}"' :
  '{"target": 5, "pairs": [[5,1],[10,2],[15,3],[20,4],[25,5],[30,6],[35,7],[40,8]], "numbers": [shuffled]}"'
}
`;
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a math game generator. Follow the instructions exactly, ensure all pairs satisfy the rules strictly, and output only the JSON.' },
        { role: 'user', content: prompt }
      ],
    });
    const jsonStr = response.choices[0].message.content.trim();
    const result = JSON.parse(jsonStr);
    if (!result.target || !result.pairs || result.pairs.length !== 8 || !result.numbers || result.numbers.length !== 16) {
      throw new Error('Invalid response format');
    }

    // Validate pairs
    for (let pair of result.pairs) {
      if (pair.length !== 2 || !checkPair(pair[0], pair[1], symbol, result.target)) {
        throw new Error('Generated pairs do not satisfy the operation');
      }
    }

    // Validate range and addition constraint
    const allNumbers = result.numbers;
    if (allNumbers.some(n => n < 1 || n > maxNumber || !Number.isInteger(n))) {
      throw new Error('Numbers out of range');
    }
    if (symbol === '+' && allNumbers.some(n => n > result.target)) {
      throw new Error('Addition numbers exceed target');
    }

    // Validate numbers match flattened pairs
    const flatPairs = result.pairs.flat().sort((a, b) => a - b);
    const sortedNumbers = [...result.numbers].sort((a, b) => a - b);
    if (flatPairs.length !== sortedNumbers.length || flatPairs.some((v, i) => v !== sortedNumbers[i])) {
      throw new Error('Numbers do not match pairs');
    }

    return result;
  } catch (err) {
    console.warn(`OpenAI failed: ${err.message}, falling back to local generation`);
    // Fallback local generation
    let target;
    let numbers;
    let attempts = 0;
    while (true) {
      attempts++;
      if (attempts > 50) {
        throw new Error('Failed to generate valid grid after multiple attempts');
      }
      target = Math.floor(Math.random() * 100) + 1;
      const pairs = [];
      const usedNumbers = new Set();
      let localAttempts = 0;
      let allowDuplicates = false;
      while (pairs.length < 8) {
        localAttempts++;
        if (localAttempts > 1000) {
          allowDuplicates = true;
          localAttempts = 0;
        }
        let a, b;
        if (operationName === 'addition') {
          a = Math.floor(Math.random() * target) + 1;
          b = target - a;
          if (b < 1 || b > maxNumber) continue;
        } else if (operationName === 'subtraction') {
          a = Math.floor(Math.random() * (maxNumber - target)) + target + 1;
          b = a - target;
          if (b < 1 || b > maxNumber) continue;
        } else if (operationName === 'multiplication') {
          const factors = [];
          for (let i = 1; i <= Math.min(target, maxNumber); i++) {
            if (target % i === 0 && target / i <= maxNumber) {
              factors.push(i);
            }
          }
          if (factors.length === 0) break;
          const idx = Math.floor(Math.random() * factors.length);
          a = factors[idx];
          b = target / a;
        } else if (operationName === 'division') {
          const maxB = Math.floor(maxNumber / target);
          if (maxB < 1) break;
          b = Math.floor(Math.random() * maxB) + 1;
          a = target * b;
        }

        if (!allowDuplicates && (usedNumbers.has(a) || usedNumbers.has(b))) continue;

        pairs.push([a, b]);
        usedNumbers.add(a);
        usedNumbers.add(b);
      }
      if (pairs.length === 8) {
        numbers = pairs.flat();
        for (let i = numbers.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
        }
        break;
      }
    }
    return { target, numbers };
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

router.post('/start', async (req, res) => {
  const { level } = req.body;
  if (!['basic', 'intermediate', 'advanced'].includes(level)) {
    return res.status(400).json({ error: 'Invalid level' });
  }

  try {
    const { name: operationName, symbol } = chooseOperation(level);
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

router.post('/guess', (req, res) => {
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

router.get('/state', (req, res) => {
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

module.exports = router;