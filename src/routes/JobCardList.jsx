
import React from 'react';
import jobData from '../FakeData/fake_posted_jobs.json';

const JobCardList = () => {
  const activeJobs = jobData.filter(job => job.status === "active");

  return (
    <div className="space-y-6">
      {activeJobs.map(job => (
        <div
          key={job.id}
          className="bg-white border rounded-xl shadow-md flex flex-col md:flex-row gap-4 p-4 transition hover:shadow-lg"
        >
          {/* Left: Image */}
          <div className="md:w-1/3">
            <img
              src={job.images[0]}
              alt={job.title}
              className="rounded-lg w-full h-36 object-cover"
            />
          </div>

          {/* Right: Info */}
          <div className="md:w-2/3 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{job.title}</h3>
                <p className="text-sm text-gray-600 mt-1">📍 {job.location}</p>
                <p className="text-sm text-gray-600">📂 {job.category}</p>
                <p className="text-sm text-gray-500">🗓️ Posted on: {job.date}</p>
              </div>
              <span className="text-green-600 font-semibold text-sm whitespace-nowrap mt-1">
                ৳{job.budget}
              </span>
            </div>

            {/* Applicants */}
            {job.applicants && job.applicants.length > 0 && (
              <div className="mt-3 bg-gray-50 p-3 rounded-md border">
                <p className="text-sm font-medium mb-2 text-gray-700">👷 Applicants:</p>
                <ul className="text-sm space-y-1">
                  {job.applicants.map((a, i) => (
                    <li key={i} className="flex items-center justify-between">
                      <span>✅ {a.name}</span>
                      <span className="text-gray-700">৳{a.price} – ⭐ {a.rating}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4">
              <button className="btn btn-sm bg-green-500 text-white hover:bg-green-600 px-5">
                Apply
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default JobCardList;
