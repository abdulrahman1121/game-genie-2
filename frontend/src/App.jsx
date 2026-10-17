// frontend/src/App.jsx
import { useState } from 'react';
import SelectLevel from './components/SelectLevel';
import GamePage from './pages/GamePage';
import './index.css';

function App() {
  const [gameData, setGameData] = useState(null);

  const handleStart = (data) => {
    setGameData(data);
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-6">
      {gameData && (
        <button
          onClick={() => setGameData(null)}
          className="fixed top-6 left-6 z-20 px-6 py-3 rounded-[14px] bg-[#D9D9D9] border-2 border-black text-[#E65CB6] font-monda font-bold uppercase text-xl shadow-[5px_5px_0_0_#959595] hover:shadow-[5px_5px_0_0_#707070] active:translate-x-[2px] active:translate-y-[2px] transition duration-200"
        >
          ← Back
        </button>
      )}
      <h1 className="text-4xl font-bold text-indigo-800 mb-8 shadow-text">Math Pair Game</h1>
      {!gameData ? (
        <SelectLevel onStart={handleStart} />
      ) : (
        <GamePage initialState={gameData} />
      )}
    </div>
  );
}

export default App;