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
      navigate('/worker/dashboard');
    } catch (error) {
      const status = error?.response?.status;
      const msg =
        error?.response?.data?.error ||
        error?.message ||
        'Google sign‑in failed.';
      alert(status ? `Error ${status}: ${msg}` : msg);
      console.error('Worker google sign‑in error:', error);
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
            <h1 className="text-2xl font-semibold tracking-wider text-gray-800 dark:text-white">
              Worker — Create a new account
            </h1>

            <p className="text-sm text-gray-500 mt-6">
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
                className="w-full py-2 border mt-3 rounded flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <img src={GoogleImage} alt="Google" className="w-5 h-5" />
                Continue with Google
              </button>
            </div>

            <div className="mt-6">
              <h3 className="inline-block px-6 py-2 mt-2 text-green-600 border rounded">
                Worker
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 mt-8 md:grid-cols-2">
              {[
                { name: 'firstName', label: 'First Name', type: 'text' },
                { name: 'lastName', label: 'Last Name', type: 'text' },
                { name: 'phone', label: 'Phone', type: 'tel' },
                { name: 'email', label: 'Email', type: 'email' },
                { name: 'password', label: 'Password', type: 'password' },
                { name: 'confirmPassword', label: 'Confirm Password', type: 'password' },
              ].map(({ name, label, type }) => (
                <div key={name}>
                  <label className="block mb-2 text-sm text-gray-600 dark:text-gray-200">
                    {label}
                  </label>
                  <input
                    type={type}
                    name={name}
                    value={form[name]}
                    onChange={handleChange}
                    placeholder={label}
                    className="block w-full px-5 py-3 mt-2 border rounded-lg dark:bg-gray-900 dark:text-gray-300"
                    required
                  />
                </div>
              ))}

              <div className="col-span-1 md:col-span-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center justify-center w-full px-6 py-3 text-white bg-blue-500 rounded-lg hover:bg-blue-400 transition disabled:opacity-60"
                >
                  <span>{submitting ? 'Signing up…' : 'Sign Up'}</span>
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
