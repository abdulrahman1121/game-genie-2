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