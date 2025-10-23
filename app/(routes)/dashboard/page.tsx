import React from "react";
import HistoryList from "./_components/HistoryList";
import DoctorsList from "./_components/DoctorsList";
import AddNewSession from "./_components/AddNewSession";

function Dashboard() {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">My Dashboard</h2>
          <p className="text-gray-600 mt-1">
            Manage your medical consultations
          </p>
        </div>
        <AddNewSession />
      </div>

      {/* Session History with Reports */}
      <div className="mb-8">
        <HistoryList />
      </div>

      {/* Available Doctors */}
      <div>
        <DoctorsList />
      </div>
    </div>
  );
}

export default Dashboard;


// import React from 'react'
// import HistoryList from './_components/HistoryList'
// import DoctorsList from './_components/DoctorsList'
// import AddNewSession from './_components/AddNewSession'

// function Dashboard() {
//   return (
//     <div>
//       <div className="flex justify-between items-center">
//         <h2 className="text-2xl font-bold">My Dashboard</h2>
//         <AddNewSession />
//       </div>
//       <HistoryList />
//       <DoctorsList />
//     </div>
//   )
// }

// export default Dashboard
