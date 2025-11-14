import React, { useState } from 'react';
import { Eye, EyeOff, Shield, Monitor, User, Lock, Mail, AlertCircle, Loader } from 'lucide-react';

const LoginScreen = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    loginType: 'standard' // 'standard' or 'display'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_BASE = 'https://us-central1-new-dashboard-2025.cloudfunctions.net/admin-api';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          loginType: formData.loginType
        })
      });

      const data = await response.json();

      if (data.status === 'success') {
        // Store user info in localStorage for session management
        localStorage.setItem('dashboardUser', JSON.stringify(data.user));
        localStorage.setItem('dashboardToken', data.token || 'authenticated');
        
        // Call the onLogin callback with user data
        onLogin(data.user);
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisplayLogin = () => {
    setFormData({
      email: '',
      password: '',
      loginType: 'display'
    });
  };

  const handleStandardLogin = () => {
    setFormData({
      ...formData,
      loginType: 'standard'
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20"></div>
      <div className="absolute inset-0" style={{
        backgroundImage: `radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 50%), 
                         radial-gradient(circle at 75% 75%, rgba(147, 51, 234, 0.1) 0%, transparent 50%)`
      }}></div>

      <div className="relative w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Lex KPI Dashboard</h1>
          <p className="text-gray-400">Please sign in to continue</p>
        </div>

        {/* Login Type Selector */}
        <div className="bg-gray-800 rounded-lg p-6 shadow-2xl border border-gray-700">
          <div className="flex space-x-2 mb-6 bg-gray-700 rounded-lg p-1">
            <button
              type="button"
              onClick={handleStandardLogin}
              className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                formData.loginType === 'standard'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <User className="h-4 w-4" />
              <span>User Login</span>
            </button>
            <button
              type="button"
              onClick={handleDisplayLogin}
              className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                formData.loginType === 'display'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <Monitor className="h-4 w-4" />
              <span>TV Display</span>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-900 bg-opacity-20 border border-red-500 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-gray-700 text-white rounded-lg pl-10 pr-3 py-2 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  placeholder={formData.loginType === 'display' ? 'email address' : 'email address'}
                  required
                />
              </div>
            </div>

            {/* Password Field - Only for standard login */}
            {formData.loginType === 'standard' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-gray-700 text-white rounded-lg pl-10 pr-10 py-2 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Display Mode Info */}
            {formData.loginType === 'display' && (
              <div className="bg-purple-900 bg-opacity-20 border border-purple-500 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <Monitor className="h-4 w-4 text-purple-400 mt-0.5" />
                  <div>
                    <p className="text-purple-200 text-sm font-medium">TV Display Mode</p>
                    <p className="text-purple-300 text-xs mt-1">
                      Enter the display account email. No password required for TV displays.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-lg font-medium transition-colors ${
                formData.loginType === 'standard'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  {formData.loginType === 'standard' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Monitor className="h-4 w-4" />
                  )}
                  <span>
                    {formData.loginType === 'standard' ? 'Sign In' : 'Start Display Mode'}
                  </span>
                </>
              )}
            </button>
          </form>

          {/* User Type Descriptions */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Account Types:</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center space-x-2">
                <User className="h-3 w-3 text-blue-400" />
                <span className="text-gray-400">
                  <strong className="text-blue-400">Admin/Viewer:</strong> Full dashboard access with password
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Monitor className="h-3 w-3 text-purple-400" />
                <span className="text-gray-400">
                  <strong className="text-purple-400">TV Display:</strong> Kiosk mode
                </span>
              </div>
            </div>
          </div>

          {/* Demo Credentials - Remove in production */}
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-500 text-center">
              
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;