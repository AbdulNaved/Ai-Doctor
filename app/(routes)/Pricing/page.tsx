import { PricingTable } from "@clerk/nextjs";
import React from "react";

function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-16">
          <h2 className="font-extrabold text-4xl md:text-5xl lg:text-6xl mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            Select Your Perfect Plan
          </h2>
          <p className="text-gray-600 text-lg md:text-xl max-w-2xl mx-auto mt-4">
            Choose the plan that best fits your needs. Upgrade or downgrade
            anytime.
          </p>
          <div className="mt-6 flex justify-center">
            <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"></div>
          </div>
        </div>

        {/* Pricing Table Container */}
        <div className="relative">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>

          {/* Clerk Pricing Table */}
          <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 md:p-12 border border-gray-100">
            <PricingTable />
          </div>
        </div>

        {/* Trust Badge Section */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm mb-4">
            Trusted by thousands of users worldwide
          </p>
          <div className="flex justify-center items-center gap-8 flex-wrap">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-green-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-gray-600 text-sm">Secure Payment</span>
            </div>
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-blue-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-gray-600 text-sm">Cancel Anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-purple-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-gray-600 text-sm">24/7 Support</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Page;

// import { PricingTable } from '@clerk/nextjs';
// import React from 'react'

// function page() {
//   return (
//    <div className="">
//     <h2 className='font-bold text-3xl mb-7'>Select Plan!</h2>
//       <PricingTable/>
//   </div>
//   )
// }

// export default page
