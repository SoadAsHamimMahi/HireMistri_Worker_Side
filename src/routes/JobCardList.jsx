import React from "react";
import jobData from "../FakeData/fake_posted_jobs.json";

const JobCardList = () => {
  const activeJobs = (jobData || []).filter(
    (j) => String(j.status || "active").toLowerCase() === "active"
  );

  const statusTone = (s) => {
    const k = String(s || "active").toLowerCase();
    if (k === "active") return "bg-green-100 text-green-700";
    if (k === "in-progress") return "bg-yellow-100 text-yellow-700";
    if (k === "completed") return "bg-blue-100 text-blue-700";
    return "bg-gray-100 text-gray-700";
  };

  const FallbackImg =
    "https://via.placeholder.com/640x400?text=No+Image";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {activeJobs.map((job) => {
        const img =
          (Array.isArray(job.images) && job.images[0]) || FallbackImg;
        const applicants = job.applicants || [];

        return (
          <div
            key={job.id}
            className="group bg-white border rounded-xl overflow-hidden hover:shadow-md transition"
          >
            {/* Image */}
            <div className="relative">
              <div className="aspect-[16/9] bg-base-200 overflow-hidden">
                <img
                  src={img}
                  alt={job.title}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition"
                  loading="lazy"
                />
              </div>

              {/* Budget chip */}
              {job.budget != null && (
                <div className="absolute top-2 right-2 badge badge-success badge-outline bg-white/90">
                  ৳{job.budget}
                </div>
              )}
            </div>

            {/* Body */}
            <div className="p-4 flex flex-col gap-3">
              {/* Title + status */}
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-gray-900 leading-snug line-clamp-2">
                  {job.title}
                </h3>
                <span
                  className={`px-2 py-0.5 text-[10px] rounded-full font-semibold ${statusTone(
                    job.status
                  )}`}
                >
                  {job.status || "active"}
                </span>
              </div>

              {/* Meta */}
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div className="flex items-center gap-1.5">
                  <span>📍</span>
                  <span className="truncate">{job.location || "—"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>🧰</span>
                  <span className="truncate">{job.category || "—"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>🗓️</span>
                  <span className="truncate">
                    {job.date || "—"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>⏱️</span>
                  <span className="truncate">
                    {job.durationEstimateHrs
                      ? `${job.durationEstimateHrs} hrs`
                      : "—"}
                  </span>
                </div>
              </div>

              {/* Applicants preview */}
              <div className="rounded-lg bg-base-100 border p-2">
                <div className="flex items-center justify-between text-xs text-gray-700">
                  <span className="font-medium">Applicants</span>
                  <span className="text-gray-500">
                    {applicants.length} total
                  </span>
                </div>

                {applicants.length > 0 ? (
                  <ul className="mt-1 space-y-1">
                    {applicants.slice(0, 2).map((a, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-base-200 grid place-items-center text-[10px] font-bold">
                            {(a.name || "?").slice(0, 1).toUpperCase()}
                          </div>
                          <span className="text-gray-800">
                            {a.name || "Unknown"}
                          </span>
                        </div>
                        <div className="text-gray-600">
                          ৳{a.price ?? "—"} <span className="ml-1">⭐ {a.rating ?? "—"}</span>
                        </div>
                      </li>
                    ))}
                    {applicants.length > 2 && (
                      <li className="text-[11px] text-gray-500">
                        +{applicants.length - 2} more…
                      </li>
                    )}
                  </ul>
                ) : (
                  <div className="text-[11px] text-gray-500 mt-1">
                    No applicants yet.
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-1 flex items-center justify-between gap-2">
                <button className="btn btn-sm btn-outline">View</button>
                <button className="btn btn-sm btn-primary">Apply</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default JobCardList;
