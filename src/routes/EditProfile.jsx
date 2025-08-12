import React, { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';

const EditProfile = () => {
    const [selectedTab, setSelectedTab] = useState('my profile');

    const [profile, setProfile] = useState({
        firstName: '',
        lastName: '',
        displayName: '',
        phone: '',
        workExperience: '',
        email: '',
        profileCover: null,
        address1: '',
        address2: '',
        city: '',
        country: 'Bangladesh',
        zip: '',
    });

    const requiredFields = ['firstName', 'lastName', 'displayName', 'email', 'phone', 'workExperience'];

    const isValid = requiredFields.every(field => profile[field]?.trim() !== '');

    // Load from localStorage on mount
    useEffect(() => {
        const savedProfile = JSON.parse(localStorage.getItem('workerProfile'));
        if (savedProfile) {
            setProfile(savedProfile);
        }
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };

    const onDrop = (acceptedFiles) => {
        const file = acceptedFiles[0];
        if (file) {
            const imageURL = URL.createObjectURL(file);
            setProfile(prev => ({ ...prev, profileCover: imageURL }));
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [] },
        multiple: false,
    });

    const handleSave = () => {
        if (!isValid) {
            toast.error('Please fill in all required fields.');
            return;
        }

        localStorage.setItem('workerProfile', JSON.stringify(profile));
        toast.success('Profile saved successfully!');
    };

    const handleReset = () => {
        setProfile({
            firstName: '',
            lastName: '',
            displayName: '',
            phone: '',
            workExperience: '',
            email: '',
            profileCover: null,
            address1: '',
            address2: '',
            city: '',
            country: 'Bangladesh',
            zip: '',
        });
        toast('Profile cleared.', { icon: '🧹' });
    };

    return (
        <div className="flex flex-col md:flex-row bg-white min-h-screen p-6 gap-4 md:gap-10">
            <Toaster />

            {/* Sidebar */}
            <aside className="md:w-1/4 w-full mb-6 md:mb-0">
                <div className="bg-white shadow rounded-lg p-4">
                    <ul className="space-y-3 font-medium">
                        {['MY PROFILE', 'ADDRESS'].map(tab => (
                            <li
                                key={tab}
                                className={`cursor-pointer hover:text-blue-600 ${selectedTab === tab.toLowerCase() ? 'text-blue-600 font-semibold' : ''}`}
                                onClick={() => setSelectedTab(tab.toLowerCase())}
                            >
                                {tab}
                            </li>
                        ))}
                    </ul>
                </div>
            </aside>

            {/* Content */}
            <section className="md:w-3/4 w-full space-y-6">
                {/* My Profile */}
                {selectedTab === 'my profile' && (
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-6 text-center">ACCOUNT</h2>

                        {/* Profile image upload area */}
                   
                        <div className="flex justify-center mb-6">
                            <div
                                {...getRootProps()}
                                className={`cursor-pointer relative w-36 h-36 rounded-full ring-4 transition duration-300 flex items-center justify-center ${isDragActive ? 'ring-blue-400 bg-blue-100' : 'ring-primary ring-offset-base-100 ring-offset-2'
                                    }`}
                            >
                                <input {...getInputProps()} />
                                <img
                                    src={profile.profileCover || '/default-profile.png'}
                                    alt="Profile"
                                    onError={(e) => { e.target.src = '/default-profile.png'; }}
                                    className="rounded-full object-cover w-full h-full"
                                />

                                {/* Conditional label (only when image is not set) */}
                                {!profile.profileCover && (
                                    <span className="absolute w-1/2 text-center text-sm text-gray-500">
                                        Click or drag image to upload
                                    </span>
                                )}
                            </div>
                        </div>



                        {/* Form Fields */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {[
                                { label: 'First Name', name: 'firstName' },
                                { label: 'Last Name', name: 'lastName' },
                                { label: 'Display Name', name: 'displayName' },
                                { label: 'Work Experience (years)', name: 'workExperience', type: 'number' },
                                { label: 'Phone Number', name: 'phone', type: 'tel' },
                                { label: 'Email', name: 'email', type: 'email' },
                            ].map(({ label, name, type = 'text' }) => (
                                <div key={name}>
                                    <label className="block text-sm font-medium mb-1">{label}</label>
                                    <input
                                        type={type}
                                        name={name}
                                        required
                                        value={profile[name]}
                                        onChange={handleChange}
                                        className="input input-bordered w-full"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="text-center mt-8 flex justify-center gap-4">
                            <button
                                onClick={handleSave}
                                disabled={!isValid}
                                className="btn btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                💾 Save Profile
                            </button>
                            <button
                                onClick={handleReset}
                                className="btn btn-outline btn-error px-6"
                            >
                                ❌ Reset
                            </button>
                        </div>
                    </div>
                )}

                {/* Address Section */}
                {selectedTab === 'address' && (
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4">ADDRESS</h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium mb-1">Address Line 1</label>
                                <input type="text" name="address1" value={profile.address1} onChange={handleChange} className="input input-bordered w-full" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Address Line 2</label>
                                <input type="text" name="address2" value={profile.address2} onChange={handleChange} className="input input-bordered w-full" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">City</label>
                                <input type="text" name="city" value={profile.city} onChange={handleChange} className="input input-bordered w-full" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Country/Region</label>
                                <select name="country" value={profile.country} onChange={handleChange} className="select select-bordered w-full">
                                    <option>Bangladesh</option>
                                    <option>India</option>
                                    <option>USA</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Zip/Postal Code</label>
                                <input type="text" name="zip" value={profile.zip} onChange={handleChange} className="input input-bordered w-full" />
                            </div>
                        </div>

                        <div className="mt-6 text-center">
                            <button onClick={handleSave} className="btn btn-primary px-6">💾 Save Address</button>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
};

export default EditProfile;
