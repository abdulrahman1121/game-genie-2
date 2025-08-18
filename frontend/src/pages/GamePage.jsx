import { useState, useEffect } from 'react';
import axios from 'axios';

function GamePage({ initialState }) {
  const [gameState, setGameState] = useState(initialState);
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [localResult, setLocalResult] = useState(null);

  // Debug initialState
  useEffect(() => {
    console.log('GamePage initialState:', initialState);
    if (!initialState || !initialState.operationName) {
      console.warn('Missing or incomplete initialState');
      setMessage('Error: Game data not loaded correctly');
    }
  }, [initialState]);

  // Prevent rendering until gameState is valid
  if (!gameState || !gameState.operationName || !gameState.target || !gameState.symbol || !gameState.grid || !gameState.marked) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-3xl w-full text-center">
        <p className="text-red-600 text-lg">Loading game data...</p>
        {message && <p className="text-red-600 mt-2">{message}</p>}
      </div>
    );
  }

  const handleCellClick = async (r, c, num) => {
    if (gameState.marked[r][c] || loading || gameState.won) return;

    const newSelected = [...selected, { r, c, num }];
    setSelected(newSelected);

    if (newSelected.length === 2) {
      const res = compute(newSelected[0].num, newSelected[1].num, gameState.symbol);
      setLocalResult(res);

      setLoading(true);
      try {
        const response = await axios.post('http://localhost:3001/guess', {
          r1: newSelected[0].r, c1: newSelected[0].c,
          r2: newSelected[1].r, c2: newSelected[1].c,
        });
        setGameState({
          ...gameState,
          marked: response.data.marked,
          won: response.data.won,
        });
        setMessage(response.data.message);
        if (response.data.won) {
          setMessage('You won!');
        }
      } catch (err) {
        setMessage('Error: ' + (err.response?.data?.error || err.message));
      }
      setSelected([]);
      setLocalResult(null);
      setLoading(false);
    }
  };

  function compute(a, b, symbol) {
    if (symbol === '+') return a + b;
    if (symbol === '*') return a * b;
    if (symbol === '-') return Math.abs(a - b);
    if (symbol === '/') {
      let res1 = b !== 0 && a % b === 0 ? a / b : NaN;
      let res2 = a !== 0 && b % a === 0 ? b / a : NaN;
      return !isNaN(res1) ? res1 : (!isNaN(res2) ? res2 : 'Invalid');
    }
    return 'Invalid';
  }

  return (
    <div className="bg-white p-8 rounded-xl shadow-2xl max-w-3xl w-full">
      <h2 className="text-2xl font-semibold mb-2 text-center text-indigo-700">
        {gameState.operationName.charAt(0).toUpperCase() + gameState.operationName.slice(1)} - Target: {gameState.target}
      </h2>
      <div className="flex items-center justify-center gap-4 mb-6 text-xl">
        <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
          {selected[0] ? selected[0].num : ''}
        </div>
        <span className="font-bold">{gameState.symbol}</span>
        <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
          {selected[1] ? selected[1].num : ''}
        </div>
        <span className="font-bold">=</span>
        <div className={`w-20 h-20 border-2 rounded-lg flex items-center justify-center bg-gray-50 ${
          localResult !== null ? (localResult === gameState.target ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600') : ''
        }`}>
          {localResult !== null ? localResult : ''}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {gameState.grid.map((row, r) => row.map((num, c) => (
          <button
            key={`${r}-${c}`}
            className={`w-24 h-24 flex items-center justify-center border-2 rounded-lg text-4xl font-bold transition duration-200
              ${gameState.marked[r][c] ? 'bg-green-200 line-through text-red-500 cursor-not-allowed' : 'bg-white hover:shadow-md hover:border-indigo-500'}
              ${selected.some(s => s.r === r && s.c === c) ? 'bg-blue-100 border-blue-500' : 'border-gray-300'}`}
            onClick={() => handleCellClick(r, c, num)}
            disabled={gameState.marked[r][c] || loading || gameState.won}
          >
            {gameState.marked[r][c] ? 'X' : num}
          </button>
        )))}
      </div>
      <p className={`text-center text-lg ${message === 'Correct!' ? 'text-green-600' : 'text-red-600'}`}>{message}</p>
      {gameState.won && (
        <button
          className="mt-4 w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-300"
          onClick={() => window.location.reload()}
        >
          New Game
        </button>
      )}
    </div>
  );
}

export default GamePage;