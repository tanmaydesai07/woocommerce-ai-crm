import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Signup() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await axios.post('/api/signup', { username, password, role });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold text-center mb-6">Sign Up</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-3 mb-3 border rounded"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 mb-3 border rounded"
            required
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full p-3 mb-3 border rounded"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-3 rounded hover:bg-blue-600"
          >
            Sign Up
          </button>
        </form>
        {error && <p className="text-red-500 text-center mt-3">{error}</p>}
        <p className="text-center mt-4">
          Already have an account?{' '}
          <Link to="/" className="text-blue-500">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
