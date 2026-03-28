import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await axios.post('/api/login', { username, password });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
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
          <Link to="/signup" className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800">Sign Up</Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Side - Branding */}
        <div className="w-1/2 bg-linear-to-br from-gray-900 to-gray-800 text-white flex flex-col justify-center px-16">
          <h1 className="text-5xl font-bold mb-4">Curating Enterprise Efficiency.</h1>
          <p className="text-xl text-gray-300">Manage your editorial workflow and commerce analytics in one unified, professional interface.</p>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-1/2 flex items-center justify-center px-16">
          <div className="w-full max-w-md">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-gray-500 mb-8">Please enter your details to access the CRM dashboard.</p>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="Enter your username"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="Enter your password"
                  required
                />
              </div>

              <div className="flex items-center justify-between mb-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-600">Keep me logged in for 30 days</span>
                </label>
                <a href="#" className="text-sm text-gray-900 hover:underline">Forgot password?</a>
              </div>

              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

              <button
                type="submit"
                className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition"
              >
                Log In to Dashboard
              </button>
            </form>

            <p className="text-center mt-6 text-gray-600">
              Don't have an account? <Link to="/signup" className="text-gray-900 font-medium hover:underline">Sign Up</Link>
            </p>

            {/* Test Credentials */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm font-medium text-blue-800 mb-2">Test Credentials</p>
              <div className="space-y-1 text-sm text-blue-700">
                <p><strong>Admin Access:</strong> admin / admin123</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex justify-between items-center px-8 py-4 border-t border-gray-200 text-sm text-gray-500">
        <div className="flex gap-6">
          <a href="#" className="hover:text-gray-700">Privacy Policy</a>
          <a href="#" className="hover:text-gray-700">Terms of Service</a>
          <a href="#" className="hover:text-gray-700">Cookie Settings</a>
        </div>
      </footer>
    </div>
  );
}
