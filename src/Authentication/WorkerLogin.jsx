import React, { useState, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import regImage from '../Images/LoginRegistration.png';
import GoogleImage from '../Images/Google.png';
import { AuthContext } from '../Authentication/AuthProvider';
import { saveUserToApi } from '../Authentication/saveUser';

const WorkerLogin = () => {
  const { signIn, signInWithGoogle } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/dashboard';

  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
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
      alert(err?.message || 'Login failed');
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
      alert(e?.message || 'Google sign-in failed');
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
              Worker — Log in
            </h1>

            <p className="text-sm text-gray-500 mt-6">
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
                className="w-full py-2 border mt-3 rounded flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <img src={GoogleImage} alt="Google" className="w-5 h-5" />
                Continue with Google
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 mt-8">
              <div>
                <label className="block mb-2 text-sm text-gray-600 dark:text-gray-200">Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="block w-full px-5 py-3 mt-2 border rounded-lg dark:bg-gray-900 dark:text-gray-300"
                  required
                />
              </div>
              <div>
                <label className="block mb-2 text-sm text-gray-600 dark:text-gray-200">Password</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Password"
                  className="block w-full px-5 py-3 mt-2 border rounded-lg dark:bg-gray-900 dark:text-gray-300"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center justify-center w-full px-6 py-3 text-white bg-blue-500 rounded-lg hover:bg-blue-400 transition disabled:opacity-60"
              >
                <span>{submitting ? 'Logging in…' : 'Log in'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkerLogin;
