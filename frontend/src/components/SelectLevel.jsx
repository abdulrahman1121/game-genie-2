// frontend/src/components/SelectLevel.jsx
import { useState } from 'react';
import axios from 'axios';

function SelectLevel({ onStart }) {
  const [level, setLevel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const startGame = async () => {
    if (!level) {
      setError('Please select a level');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await axios.post('http://localhost:3001/start', { level });
      onStart(response.data);
    } catch (err) {
      setError('Failed to start game: ' + (err.response?.data?.error || err.message));
    }
    setLoading(false);
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full">
      <h2 className="text-2xl font-semibold mb-4 text-center text-indigo-700">Select Level</h2>
      <select
        value={level}
        onChange={(e) => setLevel(e.target.value)}
        className="w-full p-3 border border-indigo-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">Choose a level</option>
        <option value="basic">Basic</option>
        <option value="intermediate">Intermediate</option>
        <option value="advanced">Advanced</option>
      </select>
      <button
        onClick={startGame}
        disabled={loading}
        className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition duration-300"
      >
        {loading ? 'Starting...' : 'Start Game'}
      </button>
      {error && <p className="mt-2 text-red-500 text-center">{error}</p>}
    </div>
  );
}

export default SelectLevel;