import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MdCheckCircle, MdCancel, MdError, MdDownload } from 'react-icons/md';

export default function PaymentStatus() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const status = searchParams.get('status');
  const amount = searchParams.get('amount');

  const [counter, setCounter] = useState(5);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCounter(c => {
        if (c <= 1) {
          navigate('/earnings');
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate, isPaused]);

  const handleDownloadReceipt = () => {
    setIsPaused(true);
    window.print();
  };

  return (
    <>
      <style>
        {`
          @media print {
            body { background: white !important; color: black !important; }
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            .receipt-card { 
               background: white !important; border: none !important; color: black !important; box-shadow: none !important;
            }
            .text-white { color: black !important; }
            .text-white\\/50, .text-white\\/40 { color: #666 !important; }
          }
        `}
      </style>
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 font-['Inter'] print:bg-white print:p-0">
        <div className="receipt-card bg-[#111] border border-white/5 rounded-[2rem] p-10 max-w-sm w-full text-center relative overflow-hidden print:max-w-none print:p-8">
        
        {/* Decorative background glow */}
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 blur-[100px] rounded-full opacity-20 pointer-events-none 
          ${status === 'success' ? 'bg-[#1ec86d]' : status === 'cancel' ? 'bg-amber-500' : 'bg-red-500'}`} 
        />

        <div className="relative z-10">
          {status === 'success' && (
            <>
              <div className="w-20 h-20 bg-[#1ec86d]/10 text-[#1ec86d] rounded-full flex items-center justify-center mx-auto mb-6">
                <MdCheckCircle className="text-5xl" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Payment Successful</h2>
              <p className="text-white/50 text-sm mb-6">Your due balance has been credited securely via SSLCommerz.</p>
              {amount && (
                <div className="py-4 border-t border-b border-white/5 mb-8">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Amount Paid</p>
                  <p className="text-3xl font-bold text-[#1ec86d]">৳ {amount}</p>
                </div>
              )}
              
              <div className="hidden print-only text-left mb-8 border border-gray-200 rounded-xl p-4">
                 <p className="text-xs font-bold text-gray-500 uppercase mb-2">Transaction Details</p>
                 <div className="flex justify-between text-sm mb-1"><span>Payment Method:</span> <span>SSLCommerz</span></div>
                 <div className="flex justify-between text-sm mb-1"><span>Date:</span> <span>{new Date().toLocaleString()}</span></div>
                 <div className="flex justify-between text-sm font-bold mt-2 pt-2 border-t border-gray-200"><span>Total Paid:</span> <span>৳ {amount}</span></div>
              </div>
            </>
          )}

          {status === 'cancel' && (
            <>
              <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <MdCancel className="text-5xl" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Payment Cancelled</h2>
              <p className="text-white/50 text-sm mb-8">You have cancelled the payment. No charges were made.</p>
            </>
          )}

          {status === 'fail' && (
            <>
              <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <MdError className="text-5xl" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Payment Failed</h2>
              <p className="text-white/50 text-sm mb-8">Your transaction could not be completed. Please try again later.</p>
            </>
          )}

          <div className="space-y-3 no-print">
            {status === 'success' && (
              <button 
                onClick={handleDownloadReceipt}
                className="w-full py-4 rounded-xl flex justify-center items-center gap-2 font-bold uppercase tracking-widest text-xs transition-colors bg-white/10 hover:bg-white/20 text-white"
              >
                <MdDownload className="text-lg" /> Download Receipt
              </button>
            )}
            <button 
              onClick={() => navigate('/earnings')}
              className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-colors
                ${status === 'success' ? 'bg-[#1ec86d] hover:bg-[#1ec86d]/90 text-black' : 'bg-white/10 hover:bg-white/20 text-white'}`}
            >
              Return to Wallet {isPaused ? '' : `(${counter}s)`}
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
