import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import regImage from '../Images/LoginRegistration.png';
import GoogleImage from '../Images/Google.png';
import { AuthContext } from '../Authentication/AuthProvider';
import { saveUserToApi } from '../Authentication/saveUser';

const WorkerRegister = () => {
  const auth = useContext(AuthContext); // safer than destructuring when Provider isn't mounted
  const navigate = useNavigate();

  // Show a helpful message if AuthProvider isn't wrapping the app yet
  if (!auth) {
    return (
      <section className="p-8 text-center text-red-600">
        AuthProvider not found. Wrap your app with &lt;AuthProvider&gt; in main.jsx.
      </section>
    );
  }

  const { createUser, signInWithGoogle } = auth;

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'worker', // fixed
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const validate = () => {
    if (!form.firstName.trim()) return 'First name is required.';
    if (!form.lastName.trim()) return 'Last name is required.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return 'Please enter a valid email.';
    if (!form.phone.trim()) return 'Phone is required.';
    if (form.password.length < 6) return 'Password must be at least 6 characters.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const err = validate();
    if (err) {
      alert(err);
      return;
    }

    try {
      setSubmitting(true);

      // 1) Create Firebase user
      const cred = await createUser(form.email.trim(), form.password);
      const user = cred?.user;
      if (!user) throw new Error('Signup succeeded but no user returned.');

      // 2) Upsert user profile into your API (PUT /api/users/:uid)
      await saveUserToApi(user, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        role: 'worker',
      });

      alert('Registration successful!');
      navigate('/dashboard');
    } catch (error) {
      // better error surface (handles axios and generic errors)
      const status = error?.response?.status;
      const msg =
        error?.response?.data?.error ||
        error?.message ||
        'Registration failed.';
      alert(status ? `Error ${status}: ${msg}` : msg);
      console.error('Worker register error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    if (!signInWithGoogle) {
      alert('Google sign‑in is not configured in AuthProvider.');
      return;
    }
    try {
      setSubmitting(true);
      const cred = await signInWithGoogle();
      const user = cred?.user;
      if (!user) throw new Error('Google sign‑in failed.');

      await saveUserToApi(user, { role: 'worker' });
      navigate('/dashboard');
    } catch (error) {
      console.error('Worker google sign‑in error:', error);
      let errorMessage = 'Google sign‑in failed.';
      
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in was cancelled. Please try again.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Popup was blocked by browser. Please allow popups and try again.';
      } else if (error.code === 'auth/cancelled-popup-request') {
        errorMessage = 'Sign-in was cancelled. Please try again.';
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'An account already exists with this email using a different sign-in method.';
      } else {
        const status = error?.response?.status;
        const msg = error?.response?.data?.error || error?.message || 'Google sign‑in failed.';
        errorMessage = status ? `Error ${status}: ${msg}` : msg;
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
              Worker — Create a new account
            </h1>

            <p className="text-sm text-base-content opacity-60 mt-6">
              Already have a worker account?{' '}
              <Link to="/login" className="text-blue-500 hover:underline">
                Log in
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
                  {submitting ? 'Signing up...' : 'Continue with Google'}
                </span>
              </button>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-base-200 text-base-content opacity-60">
                  Or create account with email
                </span>
              </div>
            </div>

            <div className="mt-6">
              <div className="inline-flex items-center px-4 py-2 bg-primary/20 border border-primary/30 rounded-xl">
                <i className="fas fa-briefcase text-primary mr-2"></i>
                <span className="text-primary font-medium">Worker Account</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {[
                { name: 'firstName', label: 'First Name', type: 'text', placeholder: 'Enter your first name' },
                { name: 'lastName', label: 'Last Name', type: 'text', placeholder: 'Enter your last name' },
                { name: 'phone', label: 'Phone', type: 'tel', placeholder: 'Enter your phone number' },
                { name: 'email', label: 'Email', type: 'email', placeholder: 'Enter your email address' },
                { name: 'password', label: 'Password', type: 'password', placeholder: 'Create a password' },
                { name: 'confirmPassword', label: 'Confirm Password', type: 'password', placeholder: 'Confirm your password' },
              ].map(({ name, label, type, placeholder }) => (
                <div key={name}>
                  <label className="block mb-2 text-sm font-medium text-base-content opacity-80">
                    {label}
                  </label>
                  <input
                    type={type}
                    name={name}
                    value={form[name]}
                    onChange={handleChange}
                    placeholder={placeholder}
                    className="input input-bordered w-full focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              ))}

              <div className="col-span-1 md:col-span-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center justify-center w-full px-6 py-3 text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  <span className="font-medium">
                    {submitting ? 'Creating account…' : 'Create Account'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkerRegister;
