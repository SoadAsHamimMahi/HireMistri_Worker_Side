import React, { useState, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import regImage from '../Images/LoginRegistration.png';
import GoogleImage from '../Images/Google.png';
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
      alert('Please enter a valid email address.');
      return;
    }

    try {
      await resetPassword(email);
      setResetEmailSent(true);
      alert(`Password reset email sent to ${email}. Please check your inbox and spam folder.`);
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
      
      alert(errorMessage);
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
      
      alert(errorMessage);
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
      
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="bg-white dark:bg-gray-900">
      <div className="flex justify-center min-h-screen">
        <div
          className="hidden bg-cover lg:block lg:w-2/5"
          style={{ backgroundImage: `url(${regImage})` }}
        />
        <div className="flex items-center w-full max-w-3xl p-8 mx-auto lg:px-12 lg:w-3/5">
          <div className="w-full">
            <h1 className="text-2xl font-semibold tracking-wider text-base-content">
              Worker — Log in
            </h1>

            <p className="text-sm text-base-content opacity-60 mt-6">
              New worker?{' '}
              <Link to="/registration" className="text-blue-500 hover:underline">
                Create an account
              </Link>
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogle}
                disabled={submitting}
                className="w-full py-3 px-4 border-2 border-gray-300 dark:border-gray-600 rounded-xl flex items-center justify-center gap-3 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <img src={GoogleImage} alt="Google" className="w-5 h-5" />
                <span className="font-medium text-base-content opacity-80">
                  {submitting ? 'Signing in...' : 'Continue with Google'}
                </span>
              </button>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-base-200 text-base-content opacity-60">
                  Or continue with email
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6">
              <div>
                <label className="block mb-2 text-sm font-medium text-base-content opacity-80">Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="input input-bordered w-full focus:ring-2 focus:ring-primary"
                  required
                />
                {!form.email && (
                  <p className="text-xs text-base-content opacity-60 mt-1">
                    Enter your email to enable password reset
                  </p>
                )}
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-base-content opacity-80">Password</label>
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={submitting || !form.email || resetEmailSent}
                    className={`text-sm transition-colors ${
                      !form.email || submitting || resetEmailSent
                        ? 'text-base-content opacity-50 cursor-not-allowed'
                        : 'text-primary hover:text-primary-focus'
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
                    className="input input-bordered w-full pr-12 focus:ring-2 focus:ring-primary"
                    required
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-base-content opacity-50 hover:opacity-70 transition-colors"
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
                className="flex items-center justify-center w-full px-6 py-3 text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                <span className="font-medium">
                  {submitting ? 'Logging in…' : 'Log in'}
                </span>
              </button>
            </form>

            {resetEmailSent && (
              <div className="mt-4 p-4 bg-primary/20 border border-primary/30 rounded-xl">
                <div className="flex items-center">
                  <i className="fas fa-check-circle text-primary mr-3"></i>
                  <div>
                    <p className="text-primary font-medium">
                      Password reset email sent!
                    </p>
                    <p className="text-primary opacity-80 text-sm mt-1">
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
