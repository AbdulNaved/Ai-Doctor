"use client";
import {
  Drawer as DrawerComponent,
  DrawerContent,
  DrawerHeader,
  DrawerTrigger,
  DrawerClose,
  DrawerTitle,
} from "@/components/ui/drawer";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IoMenuSharp,
  IoHomeOutline,
  IoTimeOutline,
  IoPricetagOutline,
  IoPersonOutline,
  IoCloseOutline,
  IoChevronForwardOutline,
} from "react-icons/io5";

const menuItems = [
  {
    id: 1,
    label: "Home",
    href: "/",
    icon: IoHomeOutline,
    description: "Dashboard home",
  },
  {
    id: 2,
    label: "History",
    href: "/history",
    icon: IoTimeOutline,
    description: "Consultation history",
  },
  {
    id: 3,
    label: "Pricing",
    href: "/Pricing",
    icon: IoPricetagOutline,
    description: "View plans",
  },
  {
    id: 4,
    label: "Profile",
    href: "/profile",
    icon: IoPersonOutline,
    description: "Your profile",
  },
];

export default function Drawer() {
  const pathname = usePathname();

  return (
    <DrawerComponent>
      <DrawerTrigger asChild>
        <button
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <IoMenuSharp className="text-2xl text-gray-700" />
        </button>
      </DrawerTrigger>

      <DrawerContent className="max-h-[80vh]">
        {/* Header */}
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-xl font-bold text-gray-900">
              Navigation
            </DrawerTitle>
            <DrawerClose asChild>
              <button
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close menu"
              >
                <IoCloseOutline className="text-2xl text-gray-500" />
              </button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        {/* Menu Items */}
        <nav className="px-4 py-6">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <li key={item.id}>
                  <DrawerClose asChild>
                    <Link
                      href={item.href}
                      className={`
                        flex items-center justify-between px-4 py-3 rounded-lg 
                        transition-all duration-200 group
                        ${
                          isActive
                            ? "bg-primary text-white"
                            : "hover:bg-gray-100 text-gray-700"
                        }
                      `}
                    >
                      <div className="flex items-center gap-4">
                        <Icon
                          className={`
                            text-2xl transition-colors
                            ${
                              isActive
                                ? "text-white"
                                : "text-gray-500 group-hover:text-primary"
                            }
                          `}
                        />
                        <div className="flex flex-col items-start">
                          <span
                            className={`
                            text-base font-medium
                            ${isActive ? "text-white" : "text-gray-900"}
                          `}
                          >
                            {item.label}
                          </span>
                          <span
                            className={`
                            text-xs
                            ${isActive ? "text-white/80" : "text-gray-500"}
                          `}
                          >
                            {item.description}
                          </span>
                        </div>
                      </div>

                      <IoChevronForwardOutline
                        className={`
                          text-lg
                          ${
                            isActive
                              ? "text-white"
                              : "text-gray-400 group-hover:text-gray-600"
                          }
                        `}
                      />
                    </Link>
                  </DrawerClose>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t mt-auto bg-gray-50">
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-900 mb-1">
              AI Medical Voice Agent
            </p>
            <p className="text-xs text-gray-500">
              Get instant medical consultation
            </p>
          </div>
        </div>
      </DrawerContent>
    </DrawerComponent>
  );
}

// "use client"
// import {
//   Drawer as DrawerComponent,
//   DrawerContent,
//   DrawerHeader,
//   DrawerTrigger,
// } from "@/components/ui/drawer";
// import Link from "next/link";
// import {IoMenuSharp } from "react-icons/io5";

// const menuItems = [
//   {
//     id: 1,
//     label: "Home",
//     href: "/",
//   },
//   {
//     id: 2,
//     label: "History",
//     href: "/history",
//   },
//   {
//     id: 3,
//     label: "Pricing",
//     href: "/pricing",
//   },
//   {
//     id: 4,
//     label: "Profile",
//     href: "/profile",
//   },

// ]

// export default function Drawer() {
//   return (
//     <DrawerComponent>
//       <DrawerTrigger>
//         <IoMenuSharp className="text-2xl" />
//       </DrawerTrigger>
//       <DrawerContent>
//         <DrawerHeader className="px-6">
//           <div className="">
//             {menuItems.map((item) => (
//               <Link key={item.id} href={item.href} className="mr-10 font-medium text-gray-500 hover:text-gray-900 flex items-center justify-start text-start gap-2">
//                 <span className="text-2xl text-start text-gray-500 hover:text-gray-900">{item.label}
//                 <div className="w-full h-[1px] bg-gray-200" />
//                 </span>
//               </Link>
//             ))}
//           </div>
//         </DrawerHeader>
//       </DrawerContent>
//     </DrawerComponent>
//   );
// }
