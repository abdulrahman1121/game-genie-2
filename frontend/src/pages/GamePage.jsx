import { useState, useEffect } from 'react';
import axios from 'axios';

function GamePage({ initialState }) {
  const [gameState, setGameState] = useState(initialState);
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(!initialState || !initialState.operationName);
  const [localResult, setLocalResult] = useState(null);

  // Fetch game state if initialState is invalid
  useEffect(() => {
    console.log('GamePage initialState:', initialState);
    if (!initialState || !initialState.operationName || !initialState.target || !initialState.symbol || !initialState.grid || !initialState.marked) {
      console.warn('Invalid initialState, attempting to fetch from /state');
      setLoading(true);
      axios.get('http://localhost:3001/state')
        .then(response => {
          console.log('Fetched game state:', response.data);
          if (response.data.operationName && response.data.target && response.data.symbol && response.data.grid && response.data.marked) {
            setGameState(response.data);
            setMessage('');
          } else {
            setMessage('Error: Could not load game data');
          }
        })
        .catch(err => {
          setMessage('Error: ' + (err.response?.data?.error || err.message));
        })
        .finally(() => setLoading(false));
    }
  }, [initialState]);

  // Prevent rendering until gameState is valid
  if (loading || !gameState || !gameState.operationName || !gameState.target || !gameState.symbol || !gameState.grid || !gameState.marked) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-3xl w-full text-center">
        <p className="text-red-600 text-lg">{loading ? 'Loading game data...' : 'Error loading game'}</p>
        {message && <p className="text-red-600 mt-2">{message}</p>}
        <button
          className="mt-4 w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-300"
          onClick={() => window.location.reload()}
        >
          Back to Level Select
        </button>
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
    <div className="bg-white p-10 rounded-xl shadow-2xl max-w-3xl w-full">
      <div className="bg-white flex items-center justify-between mb-6">
        <h2 className="text-[#E65CB6] text-center font-['Monda'] text-[36px] font-bold leading-normal uppercase ">
          {gameState.operationName}
        </h2>
        <div className="flex items-center gap-4">
          <span className="text-[#E65CB6] text-center text-stroke-3 font-monda text-[36px] font-normal font-bold leading-normal uppercase">
            Target: {gameState.target}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-center gap-6 mb-8 text-2xl">
        <div className="w-[54px] h-[75px] border-2 rounded-[14px] bg-[#D9D9D9] shadow-[5px_5px_0_0_#959595] flex items-center justify-center">
          {selected[0] ? selected[0].num : ''}
        </div>
        <span className="text-[#E65CB6] text-center text-stroke-3 font-monda text-[36px] font-normal font-bold leading-normal uppercase">
          {gameState.symbol}
        </span>
        <div className="w-[54px] h-[75px] border-2 rounded-[14px] bg-[#D9D9D9] shadow-[5px_5px_0_0_#959595] flex items-center justify-center">
          {selected[1] ? selected[1].num : ''}
        </div>
        <span className="text-[#E65CB6] text-center text-stroke-3 font-monda text-[36px] font-normal font-bold leading-normal uppercase">
          =
        </span>
        <div className={`w-[42px] h-[75px] border-b-[5px] border-b-[#E65CB6] shadow-[0_3px_0_0_#FFF] ${
          localResult !== null ? (localResult === gameState.target ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600') : 'border-indigo-300 text-indigo-700'
        }`}>
          {localResult !== null ? localResult : ''}
        </div>
      </div>

      <div className="flex items-center gap-6 mb-8 ml-8">
  <div className="relative mx-auto w-[750px] max-w-[800px]">
    {/* Background grid (7x5) */}
    <div className="absolute top-[-17px] left-[0px] grid grid-cols-7 grid-rows-5 gap-4 z-0 w-[637px]">
      {Array(5).fill().flatMap((_, r) =>
        Array(7).fill().map((_, c) => (
          <div
            key={`bg-${r}-${c}`}
            className="w-[91px] h-[91px] rounded-[14px] bg-[#ABABAB] shadow-[7px_7px_0_0_#5C5C5C] border border-gray-500 cursor-pointer"
            onClick={() => console.log(`Clicked background tile ${r},${c}`)}
          />
        ))
      )}
    </div>

    {/* Foreground grid (4x4) */}
    <div className="grid grid-cols-4 gap-4 w-[364px] z-10 relative mx-auto left-[50px] top-[45px]">
      {gameState.grid.map((row, r) =>
        row.map((num, c) => (
          <button
            key={`fg-${r}-${c}`}
            className={`w-[91px] h-[91px] flex items-center justify-center rounded-[14px] text-4xl font-bold transition duration-300
              ${gameState.marked[r][c] ? 'opacity-0 pointer-events-none' : 'bg-gray-300 shadow-[7px_7px_0_0_#959595] hover:shadow-[7px_7px_0_0_#707070]'}
              ${selected.some(s => s.r === r && s.c === c) ? 'bg-indigo-100' : ''}`}
            onClick={() => handleCellClick(r, c, num)}
            disabled={gameState.marked[r][c] || loading || gameState.won}
          >
            {gameState.marked[r][c] ? 'X' : num}
          </button>
        ))
      )}
    </div>
  </div>

  <img src="/genie.png" alt="Genie" className="w-32 h-32 object-contain" />
</div>

      <p className={`text-center text-xl font-semibold ${message === 'Correct!' ? 'text-green-600' : 'text-red-600'}`}>
        {message}
      </p>
      {gameState.won && (
        <button
          className="mt-6 w-full py-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-300 text-xl font-semibold"
          onClick={() => window.location.reload()}
        >
          New Game
        </button>
      )}
    </div>
  );
}

export default GamePage;