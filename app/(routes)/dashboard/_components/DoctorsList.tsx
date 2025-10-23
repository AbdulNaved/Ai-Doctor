"use client";
import { Button } from "@/components/ui/button";
import { AIDoctorAgents } from "@/shared/list";
import Image from "next/image";
import React, { useState } from "react";
import { IoArrowForward } from "react-icons/io5";
import AddNewSession from "./AddNewSession";

export type Doctor = {
  id: number;
  specialist: string;
  description: string;
  image: string;
  agentPrompt: string;
  voiceId: string;
  subscriptionRequired?: boolean;
};

function DoctorsList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  const handleDoctorClick = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setIsDialogOpen(true);
  };

  return (
    <div className="mt-6 md:mt-10 px-4 sm:px-6 lg:px-8">
      {/* Header - Responsive */}
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
          AI Specialist Doctors
        </h2>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          Choose a specialist for your consultation
        </p>
      </div>

      {/* Responsive Grid */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
        {AIDoctorAgents.map((doctor: Doctor) => (
          <div
            key={doctor.id}
            className="group border-2 border-gray-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-300"
            onClick={() => handleDoctorClick(doctor)}
          >
            {/* Doctor Image - Responsive */}
            <div className="relative w-full aspect-[4/5] overflow-hidden rounded-lg sm:rounded-xl mb-3">
              <Image
                src={doctor.image}
                alt={doctor.specialist}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
              />
            </div>

            {/* Doctor Info - Responsive */}
            <div className="space-y-2">
              <h3 className="font-bold text-sm sm:text-base md:text-lg text-gray-900 line-clamp-1">
                {doctor.specialist}
              </h3>

              <p className="line-clamp-2 text-xs sm:text-sm text-gray-600 min-h-[2.5rem] sm:min-h-[3rem]">
                {doctor.description}
              </p>

              {/* Button - Responsive */}
              <Button
                variant="outline"
                className="bg-primary hover:bg-primary/90 text-white mt-2 w-full text-xs sm:text-sm h-8 sm:h-9 md:h-10 gap-1 sm:gap-2"
              >
                <span className="hidden sm:inline">Start Consultation</span>
                <span className="sm:hidden">Consult</span>
                <IoArrowForward className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* No Doctors Message */}
      {AIDoctorAgents.length === 0 && (
        <div className="text-center py-12 sm:py-16">
          <p className="text-gray-500 text-sm sm:text-base">
            No doctors available at the moment
          </p>
        </div>
      )}

      {/* Render AddNewSession with the selected doctor */}
      <AddNewSession
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        preSelectedDoctor={selectedDoctor}
      />
    </div>
  );
}

export default DoctorsList;
