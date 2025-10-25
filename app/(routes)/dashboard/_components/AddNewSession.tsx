"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import React, { useState, useEffect } from "react";
import { IoArrowForward } from "react-icons/io5";
import { Loader2, RefreshCw } from "lucide-react";
import axios from "axios";
import { Doctor } from "./DoctorsList";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";

interface AddNewSessionProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  preSelectedDoctor?: Doctor | null;
}

function AddNewSession({
  isOpen,
  onOpenChange,
  preSelectedDoctor,
}: AddNewSessionProps) {
  const [note, setNote] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [suggestedDocter, setSuggestedDocter] = useState<Doctor | undefined>(
    preSelectedDoctor || undefined
  );
  const [error, setError] = useState<string>();
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | undefined>(
    preSelectedDoctor || undefined
  );
  const [consultationCount, setConsultationCount] = useState<number>(0);
  const [hasSubscription, setHasSubscription] = useState<boolean>(false);
  const router = useRouter();
  const { user } = useUser();
  const { getToken } = useAuth();

  // Check subscription status with forced token refresh
  const checkUserStatus = async (forceRefresh = false) => {
    if (!user) return;

    try {
      if (forceRefresh) {
        console.log("🔄 Force refreshing token...");
        await getToken({ skipCache: true });
        // Small delay to ensure server updates
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const response = await axios.get("/api/check-subscription");
      setHasSubscription(response.data.hasSubscription);
      setConsultationCount(response.data.consultationCount || 0);

      console.log("✅ Subscription check:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Error checking subscription:", error);
      return null;
    }
  };

  useEffect(() => {
    checkUserStatus(true); // Force refresh on mount
  }, [user]);

  // Manual refresh function
  const handleRefreshSubscription = async () => {
    setIsRefreshing(true);
    try {
      const data = await checkUserStatus(true);

      if (data?.hasSubscription) {
        alert(
          "✅ Subscription activated! You can now start unlimited consultations."
        );
      } else if (data) {
        alert(
          `You have ${data.remainingConsultations} free consultations remaining.`
        );
      }
    } catch (error) {
      console.error("Error refreshing:", error);
      alert("Failed to refresh subscription status. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Check if user can start a consultation
  const canStartConsultation = () => {
    if (hasSubscription) return true;
    return consultationCount < 2;
  };

  const handleDialogOpen = async () => {
    // Force refresh when opening dialog
    await checkUserStatus(true);

    // If user doesn't have subscription and exceeded free limit
    if (!hasSubscription && consultationCount >= 2) {
      router.push("/Pricing");
      return;
    }
  };

  const OnClickNext = async () => {
    if (!note || note.trim().length < 3) {
      setError("Please provide more details about your symptoms");
      return;
    }

    // Check consultation limit before proceeding
    if (!canStartConsultation()) {
      router.push("/Pricing");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const response = await axios.post("/api/suggest-docters", {
        notes: note,
      });
      const data = response.data;
      setSuggestedDocter(data);
    } catch (error) {
      console.error("Error fetching doctor suggestion:", error);
      setError("Failed to find a doctor. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartConsultation = async () => {
    // Final check before creating session
    const statusData = await checkUserStatus(true);

    if (
      statusData &&
      !statusData.hasSubscription &&
      statusData.consultationCount >= 2
    ) {
      router.push("/Pricing");
      return;
    }

    setIsLoading(true);
    try {
      const result = await axios.post("/api/session-chat", {
        notes: note,
        selectedDoctor: selectedDoctor,
      });

      console.log("✅ Session created:", result.data);

      if (result.data.sessionId) {
        router.push(`/dashboard/medical-agent/${result.data.sessionId}`);
      }
    } catch (error: any) {
      console.error("❌ Error starting consultation:", error);

      // Check if it's a subscription limit error
      if (error.response?.status === 403) {
        router.push("/Pricing");
      } else {
        setError(
          error.response?.data?.message ||
            "Failed to start consultation. Please try again."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild onClick={handleDialogOpen}>
        {!isOpen && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="bg-primary text-white mt-3 relative"
            >
              + Start a Consultation
              {!hasSubscription && (
                <span className="ml-2 text-xs bg-white/20 px-2 py-1 rounded-full">
                  {Math.max(0, 2 - consultationCount)} free left
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="mt-3"
              onClick={(e) => {
                e.stopPropagation();
                handleRefreshSubscription();
              }}
              disabled={isRefreshing}
              title="Refresh subscription status"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>
              {suggestedDocter
                ? "Recommended Specialist"
                : "Start Consultation"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefreshSubscription}
              disabled={isRefreshing}
              className="text-xs"
            >
              <RefreshCw
                className={`h-3 w-3 mr-1 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </DialogTitle>
          <DialogDescription asChild>
            {!suggestedDocter ? (
              <div className="flex flex-col gap-2">
                <h2 className="text-lg font-bold">
                  Add Symptoms or Any Other Details
                </h2>
                {!hasSubscription && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                    <p className="text-sm text-blue-800">
                      💡 Free consultations:{" "}
                      <span className="font-bold">
                        {Math.max(0, 2 - consultationCount)} of 2 remaining
                      </span>
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Upgrade to premium for unlimited consultations
                    </p>
                  </div>
                )}
                {hasSubscription && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-2">
                    <p className="text-sm text-green-800">
                      ✅ <span className="font-bold">Premium Active</span> -
                      Unlimited consultations
                    </p>
                  </div>
                )}
                <Textarea
                  placeholder="Enter your symptoms or any other details"
                  className="h-[200px]"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                {error && <p className="text-red-500 text-sm">{error}</p>}
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5 mt-5">
                  <div className="flex flex-col gap-2">
                    <h2 className="text-lg font-bold">Select the doctor</h2>
                    <div
                      className={`border-2 border-gray-200 rounded-2xl hover:border-primary/40 p-4 cursor-pointer ${
                        selectedDoctor ? "border-primary" : ""
                      } flex flex-col items-center justify-center text-center`}
                      onClick={() => setSelectedDoctor(suggestedDocter)}
                    >
                      <Image
                        src={suggestedDocter.image}
                        alt={suggestedDocter.specialist || "Doctor"}
                        width={70}
                        height={70}
                        className="rounded-full w-[50px] h-[50px] object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = "/medical-assistance.png";
                        }}
                      />
                      <h2 className="font-bold mt-1">
                        {suggestedDocter.specialist}
                      </h2>
                      <p className="line-clamp-2 text-sm text-gray-500">
                        {suggestedDocter.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="bg-gray-900 text-white mt-2">
              Cancel
            </Button>
          </DialogClose>
          {!suggestedDocter ? (
            <Button
              variant="outline"
              className="bg-primary text-white mt-2 flex items-center gap-2"
              disabled={!note || isLoading}
              onClick={OnClickNext}
            >
              Next{" "}
              {isLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <IoArrowForward />
              )}
            </Button>
          ) : (
            <Button
              disabled={isLoading}
              className="bg-primary text-white mt-2 flex items-center gap-2"
              onClick={() => handleStartConsultation()}
            >
              Choose Doctor{" "}
              {isLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <IoArrowForward />
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddNewSession;

//
// "use client";
// import { Button } from "@/components/ui/button";
// import {
//   Dialog,
//   DialogClose,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog";
// import { Textarea } from "@/components/ui/textarea";

// import React, { useState, useEffect } from "react";
// import { IoArrowForward } from "react-icons/io5";
// import { Loader2 } from "lucide-react";
// import axios from "axios";
// import { Doctor } from "./DoctorsList";
// import Image from "next/image";
// import { useRouter } from "next/navigation";
// import { useUser } from "@clerk/nextjs";

// interface AddNewSessionProps {
//   isOpen?: boolean;
//   onOpenChange?: (open: boolean) => void;
//   preSelectedDoctor?: Doctor | null;
// }

// function AddNewSession({
//   isOpen,
//   onOpenChange,
//   preSelectedDoctor,
// }: AddNewSessionProps) {
//   const [note, setNote] = useState<string>("");
//   const [isLoading, setIsLoading] = useState(false);
//   const [suggestedDocter, setSuggestedDocter] = useState<Doctor | undefined>(
//     preSelectedDoctor || undefined
//   );
//   const [error, setError] = useState<string>();
//   const [selectedDoctor, setSelectedDoctor] = useState<Doctor | undefined>(
//     preSelectedDoctor || undefined
//   );
//   const [consultationCount, setConsultationCount] = useState<number>(0);
//   const [hasSubscription, setHasSubscription] = useState<boolean>(false);
//   const router = useRouter();
//   const { user } = useUser();

//   // Check subscription status and consultation count on component mount
//   useEffect(() => {
//     const checkUserStatus = async () => {
//       try {
//         const response = await axios.get("/api/check-subscription");
//         setHasSubscription(response.data.hasSubscription);
//         setConsultationCount(response.data.consultationCount || 0);
//       } catch (error) {
//         console.error("Error checking subscription:", error);
//       }
//     };

//     if (user) {
//       checkUserStatus();
//     }
//   }, [user]);

//   // Check if user can start a consultation
//   const canStartConsultation = () => {
//     if (hasSubscription) return true;
//     return consultationCount < 2;
//   };

//   const handleDialogOpen = () => {
//     // If user doesn't have subscription and exceeded free limit
//     if (!hasSubscription && consultationCount >= 2) {
//       router.push("/Pricing");
//       return;
//     }
//   };

//   const OnClickNext = async () => {
//     if (!note || note.trim().length < 3) {
//       setError("Please provide more details about your symptoms");
//       return;
//     }

//     // Check consultation limit before proceeding
//     if (!canStartConsultation()) {
//       router.push("/Pricing");
//       return;
//     }

//     setError("");
//     setIsLoading(true);

//     try {
//       const response = await axios.post("/api/suggest-docters", {
//         notes: note,
//       });
//       const data = response.data;
//       setSuggestedDocter(data);
//     } catch (error) {
//       console.error("Error fetching doctor suggestion:", error);
//       setError("Failed to find a doctor. Please try again.");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // const handleStartConsultation = async () => {
//   //   // Final check before creating session
//   //   if (!canStartConsultation()) {
//   //     router.push("/Pricing");
//   //     return;
//   //   }

//   //   setIsLoading(true);
//   //   try {
//   //     const result = await axios.post("/api/session-chat", {
//   //       notes: note,
//   //       selectedDoctor: selectedDoctor,
//   //     });
//   //     console.log(result.data);
//   //     if (result.data.sessionId) {
//   //       console.log("sessionId", result.data.sessionId);
//   //       router.push(`/dashboard/medical-agent/${result.data.sessionId}`);
//   //     }
//   //   } catch (error) {
//   //     console.error("Error starting consultation:", error);
//   //     setError("Failed to start consultation. Please try again.");
//   //   } finally {
//   //     setIsLoading(false);
//   //   }
//   // };

//   const handleStartConsultation = async () => {
//     setIsLoading(true);
//     try {
//       const result = await axios.post("/api/session-chat", {
//         notes: note,
//         selectedDoctor: selectedDoctor,
//       });

//       console.log(result.data);

//       if (result.data.sessionId) {
//         console.log("sessionId", result.data.sessionId);
//         router.push(`/dashboard/medical-agent/${result.data.sessionId}`);
//       }
//     } catch (error: any) {
//       console.error("Error starting consultation:", error);

//       // Check if it's a subscription limit error
//       if (error.response?.status === 403) {
//         // Redirect to pricing page
//         router.push("/Pricing");
//       } else {
//         setError(
//           error.response?.data?.message ||
//             "Failed to start consultation. Please try again."
//         );
//       }
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <Dialog open={isOpen} onOpenChange={onOpenChange}>
//       <DialogTrigger asChild onClick={handleDialogOpen}>
//         {!isOpen && (
//           <Button
//             variant="outline"
//             className="bg-primary text-white mt-3 relative"
//           >
//             + Start a Consultation
//             {!hasSubscription && (
//               <span className="ml-2 text-xs bg-white/20 px-2 py-1 rounded-full">
//                 {2 - consultationCount} free left
//               </span>
//             )}
//           </Button>
//         )}
//       </DialogTrigger>
//       <DialogContent>
//         <DialogHeader>
//           <DialogTitle>
//             {suggestedDocter ? "Recommended Specialist" : "Start Consultation"}
//           </DialogTitle>
//           <DialogDescription asChild>
//             {!suggestedDocter ? (
//               <div className="flex flex-col gap-2">
//                 <h2 className="text-lg font-bold">
//                   Add Symptoms or Any Other Details
//                 </h2>
//                 {!hasSubscription && (
//                   <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
//                     <p className="text-sm text-blue-800">
//                       💡 Free consultations:{" "}
//                       <span className="font-bold">
//                         {2 - consultationCount} of 2 remaining
//                       </span>
//                     </p>
//                     <p className="text-xs text-blue-600 mt-1">
//                       Upgrade to premium for unlimited consultations
//                     </p>
//                   </div>
//                 )}
//                 <Textarea
//                   placeholder="Enter your symptoms or any other details"
//                   className="h-[200px]"
//                   value={note}
//                   onChange={(e) => setNote(e.target.value)}
//                 />
//                 {error && <p className="text-red-500 text-sm">{error}</p>}
//               </div>
//             ) : (
//               <div>
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5 mt-5">
//                   <div className="flex flex-col gap-2">
//                     <h2 className="text-lg font-bold">Select the doctor</h2>
//                     <div
//                       className={`border-2 border-gray-200 rounded-2xl hover:border-primary/40 p-4 cursor-pointer ${
//                         selectedDoctor ? "border-primary" : ""
//                       } flex flex-col items-center justify-center text-center`}
//                       onClick={() => setSelectedDoctor(suggestedDocter)}
//                     >
//                       <Image
//                         src={suggestedDocter.image}
//                         alt={suggestedDocter.specialist || "Doctor"}
//                         width={70}
//                         height={70}
//                         className="rounded-full w-[50px] h-[50px] object-cover"
//                         onError={(e) => {
//                           const target = e.target as HTMLImageElement;
//                           target.onerror = null;
//                           target.src = "/medical-assistance.png";
//                         }}
//                       />
//                       <h2 className="font-bold mt-1">
//                         {suggestedDocter.specialist}
//                       </h2>
//                       <p className="line-clamp-2 text-sm text-gray-500">
//                         {suggestedDocter.description}
//                       </p>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             )}
//           </DialogDescription>
//         </DialogHeader>
//         <DialogFooter>
//           <DialogClose asChild>
//             <Button variant="outline" className="bg-gray-900 text-white mt-2">
//               Cancel
//             </Button>
//           </DialogClose>
//           {!suggestedDocter ? (
//             <Button
//               variant="outline"
//               className="bg-primary text-white mt-2 flex items-center gap-2"
//               disabled={!note || isLoading}
//               onClick={OnClickNext}
//             >
//               Next{" "}
//               {isLoading ? (
//                 <Loader2 className="animate-spin" />
//               ) : (
//                 <IoArrowForward />
//               )}
//             </Button>
//           ) : (
//             <Button
//               disabled={isLoading}
//               className="bg-primary text-white mt-2 flex items-center gap-2"
//               onClick={() => handleStartConsultation()}
//             >
//               Choose Doctor{" "}
//               {isLoading ? (
//                 <Loader2 className="animate-spin" />
//               ) : (
//                 <IoArrowForward />
//               )}
//             </Button>
//           )}
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// }

// export default AddNewSession;
//nn
// "use client";
// import { Button } from "@/components/ui/button";
// import {
//   Dialog,
//   DialogClose,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog";
// import { Textarea } from "@/components/ui/textarea";

// import React, { useState } from "react";
// import { IoArrowForward } from "react-icons/io5";
// import { Loader2 } from "lucide-react";
// import axios from "axios";
// import { Doctor } from "./DoctorsList";
// import Image from "next/image";
// import { useRouter } from "next/navigation";

// interface AddNewSessionProps {
//   isOpen?: boolean;
//   onOpenChange?: (open: boolean) => void;
//   preSelectedDoctor?: Doctor | null;
// }

// function AddNewSession({
//   isOpen,
//   onOpenChange,
//   preSelectedDoctor,
// }: AddNewSessionProps) {
//   const [note, setNote] = useState<string>("");
//   const [isLoading, setIsLoading] = useState(false);
//   const [suggestedDocter, setSuggestedDocter] = useState<Doctor | undefined>(
//     preSelectedDoctor || undefined
//   );
//   const [error, setError] = useState<string>();
//   const [selectedDoctor, setSelectedDoctor] = useState<Doctor | undefined>(
//     preSelectedDoctor || undefined
//   );
//   const router = useRouter();

//   const OnClickNext = async () => {
//     if (!note || note.trim().length < 3) {
//       setError("Please provide more details about your symptoms");
//       return;
//     }

//     setError("");
//     setIsLoading(true);

//     try {
//       const response = await axios.post("/api/suggest-docters", {
//         notes: note,
//       });
//       const data = response.data;
//       setSuggestedDocter(data);
//     } catch (error) {
//       console.error("Error fetching doctor suggestion:", error);
//       setError("Failed to find a doctor. Please try again.");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleStartConsultation = async () => {
//     setIsLoading(true);
//     const result = await axios.post("/api/session-chat", {
//       notes: note,
//       selectedDoctor: selectedDoctor,
//     });
//     console.log(result.data);
//     if (result.data.sessionId) {
//       console.log("sessionId", result.data.sessionId);
//       router.push(`/dashboard/medical-agent/${result.data.sessionId}`);
//     }
//     setIsLoading(false);
//   };

//   return (
//     <Dialog open={isOpen} onOpenChange={onOpenChange}>
//       <DialogTrigger asChild>
//         {!isOpen && (
//           <Button variant="outline" className="bg-primary text-white mt-3">
//             + Start a Consultation
//           </Button>
//         )}
//       </DialogTrigger>
//       <DialogContent>
//         <DialogHeader>
//           <DialogTitle>
//             {suggestedDocter ? "Recommended Specialist" : "Start Consultation"}
//           </DialogTitle>
//           <DialogDescription asChild>
//             {!suggestedDocter ? (
//               <div className="flex flex-col gap-2">
//                 <h2 className="text-lg font-bold">
//                   Add Symptoms or Any Other Details
//                 </h2>
//                 <Textarea
//                   placeholder="Enter your symptoms or any other details"
//                   className="h-[200px]"
//                   value={note}
//                   onChange={(e) => setNote(e.target.value)}
//                 />
//                 {error && <p className="text-red-500 text-sm">{error}</p>}
//               </div>
//             ) : (
//               <div>
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5 mt-5">
//                   <div className="flex flex-col gap-2">
//                     <h2 className="text-lg font-bold">Select the doctor</h2>
//                     <div
//                       className={`border-2 border-gray-200 rounded-2xl hover:border-primary/40 p-4 cursor-pointer ${
//                         selectedDoctor ? "border-primary" : ""
//                       } flex flex-col items-center justify-center text-center`}
//                       onClick={() => setSelectedDoctor(suggestedDocter)}
//                     >
//                       <Image
//                         src={suggestedDocter.image}
//                         alt={suggestedDocter.specialist || "Doctor"}
//                         width={70}
//                         height={70}
//                         className="rounded-full w-[50px] h-[50px] object-cover"
//                         onError={(e) => {
//                           const target = e.target as HTMLImageElement;
//                           target.onerror = null;
//                           target.src = "/medical-assistance.png";
//                         }}
//                       />
//                       <h2 className="font-bold mt-1">
//                         {suggestedDocter.specialist}
//                       </h2>
//                       <p className="line-clamp-2 text-sm text-gray-500">
//                         {suggestedDocter.description}
//                       </p>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             )}
//           </DialogDescription>
//         </DialogHeader>
//         <DialogFooter>
//           <DialogClose asChild>
//             <Button variant="outline" className="bg-gray-900 text-white mt-2">
//               Cancel
//             </Button>
//           </DialogClose>
//           {!suggestedDocter ? (
//             <Button
//               variant="outline"
//               className="bg-primary text-white mt-2 flex items-center gap-2"
//               disabled={!note || isLoading}
//               onClick={OnClickNext}
//             >
//               Next{" "}
//               {isLoading ? (
//                 <Loader2 className="animate-spin" />
//               ) : (
//                 <IoArrowForward />
//               )}
//             </Button>
//           ) : (
//             <Button
//               disabled={isLoading}
//               className="bg-primary text-white mt-2 flex items-center gap-2"
//               onClick={() => handleStartConsultation()}
//             >
//               Choose Doctor{" "}
//               {isLoading ? (
//                 <Loader2 className="animate-spin" />
//               ) : (
//                 <IoArrowForward />
//               )}
//             </Button>
//           )}
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// }

// export default AddNewSession;
