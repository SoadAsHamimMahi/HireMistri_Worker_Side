import React, { useState, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import regImage from '../Images/LoginRegistration.png';
import { AuthContext } from '../Authentication/AuthProvider';
import { saveUserToApi } from '../Authentication/saveUser';

const WorkerLogin = () => {
  const { signIn, signInWithGoogle, resetPassword } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/dashboard';

  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handlePasswordReset = async () => {
    const email = form.email;
    
    if (!email) {
      return; // Button should be disabled, so this shouldn't happen
    }

    // Basic email validation
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    try {
      await resetPassword(email);
      setResetEmailSent(true);
      toast.success(`Password reset email sent to ${email}. Please check your inbox and spam folder.`);
    } catch (error) {
      console.error('Password reset error:', error);
      let errorMessage = 'Failed to send password reset email.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many password reset attempts. Please try again later.';
      } else {
        errorMessage = error.message || 'Failed to send password reset email.';
      }
      
      toast.error(errorMessage);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      const userCredential = await signIn(form.email, form.password);
      const user = userCredential?.user;
      if (!user) throw new Error('Login failed');
      // ensure role exists / upsert (optional)
      await saveUserToApi(user, { role: 'worker' });
      navigate(from, { replace: true });
    } catch (err) {
      console.error(err);
      let errorMessage = 'Login failed';
      
      if (err.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password. Please check your credentials.';
      } else if (err.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      } else if (err.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled.';
      } else {
        errorMessage = err?.message || 'Login failed';
      }
      
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    try {
      setSubmitting(true);
      const userCredential = await signInWithGoogle();
      const user = userCredential?.user;
      if (!user) throw new Error('Google sign-in failed');
      await saveUserToApi(user, { role: 'worker' });
      navigate(from, { replace: true });
    } catch (e) {
      console.error(e);
      let errorMessage = 'Google sign-in failed';
      
      if (e.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in was cancelled. Please try again.';
      } else if (e.code === 'auth/popup-blocked') {
        errorMessage = 'Popup was blocked by browser. Please allow popups and try again.';
      } else if (e.code === 'auth/cancelled-popup-request') {
        errorMessage = 'Sign-in was cancelled. Please try again.';
      } else if (e.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'An account already exists with this email using a different sign-in method.';
      } else {
        errorMessage = e?.message || 'Google sign-in failed';
      }
      
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="bg-[#f9f9f7] min-h-screen">
      <Toaster position="top-right" />
      <div className="flex min-h-screen">
        {/* Left Side: Hero Image */}
        <div className="hidden lg:block lg:w-2/5 relative overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${regImage})` }}
          />
          <div className="absolute inset-0 bg-brand/10 backdrop-blur-[2px]"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-brand/80 to-transparent"></div>
        </div>

        {/* Right Side: Form */}
        <div className="flex items-center justify-center w-full lg:w-3/5 p-8 mx-auto lg:px-12">
          <div className="w-full max-w-lg bg-white shadow-sm border border-gray-100 rounded-2xl p-10">
            {/* Header Branding */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center text-brand">
                <i className="fas fa-tools text-xl"></i>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">HireMistri</h2>
                <span className="text-[10px] uppercase tracking-widest font-bold text-brand bg-brand-light px-2 py-0.5 rounded-full">Worker Portal</span>
              </div>
            </div>

            <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
              Welcome back
            </h1>

            <p className="text-sm text-gray-500 mb-8">
              New worker?{' '}
              <Link to="/registration" className="text-brand hover:underline font-bold">
                Create an account
              </Link>
            </p>

            {/* Google Login */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogle}
                disabled={submitting}
                className="w-full py-3 px-4 border border-gray-200 bg-white rounded-xl flex items-center justify-center gap-3 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              >
                <svg width="20" height="20" viewBox="0 0 48 48"><g><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></g></svg>
                <span className="font-bold text-gray-700">
                  {submitting ? 'Signing in...' : 'Continue with Google'}
                </span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-medium">
                  Or continue with email
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block mb-2 text-sm font-bold text-gray-700">Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                  required
                />
                {!form.email && (
                  <p className="text-xs text-gray-500 mt-2 font-medium">
                    Enter your email to enable password reset
                  </p>
                )}
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-bold text-gray-700">Password</label>
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={submitting || !form.email || resetEmailSent}
                    className={`text-sm font-bold transition-colors ${
                      !form.email || submitting || resetEmailSent
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-brand hover:text-brand-hover'
                    }`}
                  >
                    {resetEmailSent ? 'Email sent!' : 'Forgot password?'}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-brand transition-colors"
                  >
                    {showPassword ? (
                      <i className="fas fa-eye-slash w-5 h-5"></i>
                    ) : (
                      <i className="fas fa-eye w-5 h-5"></i>
                    )}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-3.5 text-white bg-brand hover:bg-brand-hover rounded-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm font-black uppercase tracking-widest text-sm"
              >
                {submitting ? 'Logging in…' : 'Log in'}
              </button>
            </form>

            {/* Reset Success Message */}
            {resetEmailSent && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-start">
                  <i className="fas fa-check-circle text-green-600 mt-0.5 mr-3"></i>
                  <div>
                    <p className="text-green-800 font-bold text-sm">
                      Password reset email sent!
                    </p>
                    <p className="text-green-700 text-xs mt-1 leading-relaxed">
                      Please check your inbox and spam folder for the reset link.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkerLogin;
