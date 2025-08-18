import { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [level, setLevel] = useState('');
  const [gameState, setGameState] = useState(null);
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const startGame = async () => {
    if (!['basic', 'intermediate', 'advanced'].includes(level)) {
      setMessage('Please select a level');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:3001/start', { level });
      setGameState(response.data);
      setMessage(response.data.message);
      setSelected([]);
    } catch (err) {
      setMessage(`Error: ${err.response?.data?.error || err.message}`);
    }
    setLoading(false);
  };

  const handleCellClick = async (r, c) => {
    if (!gameState || gameState.won) return;
    if (gameState.marked[r][c]) return;

    const newSelected = [...selected, { r, c }];
    if (newSelected.length === 2) {
      setLoading(true);
      try {
        const response = await axios.post('http://localhost:3001/guess', {
          r1: newSelected[0].r,
          c1: newSelected[0].c,
          r2: newSelected[1].r,
          c2: newSelected[1].c,
        });
        setGameState({
          ...gameState,
          marked: response.data.marked,
          won: response.data.won,
        });
        setMessage(response.data.message);
        setSelected([]);
        if (response.data.won) {
          setMessage('You won!');
        }
      } catch (err) {
        setMessage(`Error: ${err.response?.data?.error || err.message}`);
        setSelected([]);
      }
      setLoading(false);
    } else {
      setSelected(newSelected);
    }
  };

  useEffect(() => {
    if (gameState) {
      const fetchState = async () => {
        try {
          const response = await axios.get('http://localhost:3001/state');
          setGameState(response.data);
        } catch (err) {
          setMessage(`Error fetching state: ${err.message}`);
        }
      };
      fetchState();
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-4">Math Game</h1>
      {!gameState ? (
        <div className="flex flex-col items-center gap-4">
          <select
            className="p-2 border rounded"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            <option value="">Select Level</option>
            <option value="basic">Basic</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            onClick={startGame}
            disabled={loading}
          >
            {loading ? 'Starting...' : 'Start Game'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="text-xl">
            Target: {gameState.target} | Operation: {gameState.symbol}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {gameState.grid.map((row, r) =>
              row.map((num, c) => (
                <button
                  key={`${r}-${c}`}
                  className={`w-16 h-16 flex items-center justify-center border-2 rounded text-lg font-semibold
                    ${gameState.marked[r][c] ? 'bg-green-300' : selected.some(s => s.r === r && s.c === c) ? 'bg-blue-200' : 'bg-white'}
                    ${gameState.marked[r][c] ? '' : 'hover:bg-gray-200'}`}
                  onClick={() => handleCellClick(r, c)}
                  disabled={gameState.marked[r][c] || loading || gameState.won}
                >
                  {gameState.marked[r][c] ? 'X' : num}
                </button>
              ))
            )}
          </div>
          <div className="text-lg">{message}</div>
          {gameState.won && (
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={() => setGameState(null)}
            >
              New Game
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default App;