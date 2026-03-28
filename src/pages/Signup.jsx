import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Signup() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await axios.post('/api/signup', { username, password });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation */}
      <nav className="flex justify-between items-center px-8 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-gray-800">Editorial CRM</span>
          <span className="text-sm text-gray-500">WooCommerce Partner</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#" className="text-gray-600 hover:text-gray-900">Help</a>
          <a href="#" className="text-gray-600 hover:text-gray-900">Support</a>
          <Link to="/" className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800">Login</Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Side - Branding */}
        <div className="w-1/2 bg-gradient-to-br from-gray-900 to-gray-800 text-white flex flex-col justify-center px-16">
          <h1 className="text-5xl font-bold mb-4">Curating Enterprise Efficiency.</h1>
          <p className="text-xl text-gray-300">Manage your editorial workflow and commerce analytics in one unified, professional interface.</p>
        </div>

        {/* Right Side - Signup Form */}
        <div className="w-1/2 flex items-center justify-center px-16">
          <div className="w-full max-w-md">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
            <p className="text-gray-500 mb-8">Join our CRM platform to manage your business efficiently.</p>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="Choose a username"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="Create a password"
                  required
                />
              </div>

              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

              <button
                type="submit"
                className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition"
              >
                Create Account
              </button>
            </form>

            <p className="text-center mt-6 text-gray-600">
              Already have an account? <Link to="/" className="text-gray-900 font-medium hover:underline">Log In</Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex justify-between items-center px-8 py-4 border-t border-gray-200 text-sm text-gray-500">
        <span>© 2024 Editorial Executive CRM. All rights reserved.</span>
        <div className="flex gap-6">
          <a href="#" className="hover:text-gray-700">Privacy Policy</a>
          <a href="#" className="hover:text-gray-700">Terms of Service</a>
          <a href="#" className="hover:text-gray-700">Cookie Settings</a>
        </div>
      </footer>
    </div>
  );
}
