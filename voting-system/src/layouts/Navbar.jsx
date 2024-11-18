import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";
import {
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import axiosInstance from "../apis/api";
import { FaUserCircle, FaVoteYea } from "react-icons/fa";

const navigation = [
  { name: "Create Poll", href: "/create-poll", current: false },
];

Navbar.propTypes = {
  authTokens: PropTypes.shape({
    access: PropTypes.string.isRequired,
  }).isRequired,
  logout: PropTypes.func.isRequired,
};

export default function Navbar({ authTokens, logout }) {
  const [balance, setBalance] = useState({ available: 0, withdrawn: 0 });

  useEffect(() => {
    if (authTokens) {
      // Fetch user balance
      axiosInstance
        .get("payment/account/balance", {
          headers: {
            Authorization: `Bearer ${authTokens.access}`,
          },
        })
        .then((response) => {
          setBalance({
            available: response.data.available_balance,
          });
        })
        .catch((error) => {
          console.error("Error fetching balance:", error);
        });
    }
  }, [authTokens]);

  return (
    <Disclosure as="nav" className="bg-blue-600">
      <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
            {/* Mobile menu button */}
            <DisclosureButton className="group relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-blue-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
              <span className="sr-only">Open main menu</span>
              <Bars3Icon
                aria-hidden="true"
                className="block size-6 group-data-[open]:hidden"
              />
              <XMarkIcon
                aria-hidden="true"
                className="hidden size-6 group-data-[open]:block"
              />
            </DisclosureButton>
          </div>
          <div className="flex flex-1 items-center justify-between sm:items-stretch sm:justify-start">
            <div className="flex shrink-0 items-center">
              <FaVoteYea className="h-8 w-auto" />
            </div>
            <div className="hidden sm:ml-6 sm:block">
              <div className="flex space-x-4">
                {navigation.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className={
                      (item.current
                        ? "bg-blue-900 text-white"
                        : "text-gray-300 hover:bg-blue-700 hover:text-white",
                      "rounded-md px-3 py-2 text-sm font-medium")
                    }
                  >
                    {item.name}
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
            <div className="text-white mr-4">
              <p>Balance: GHS{balance.available} </p>
              
            </div>

            {/* Profile dropdown */}
            <Menu as="div" className="relative ml-3">
              <div>
                <MenuButton className="relative flex rounded-full bg-blue-600 text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600">
                  <span className="sr-only">Open user menu</span>
                  <FaUserCircle className="size-8 rounded-full" />
                </MenuButton>
              </div>
              <MenuItems className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none">
                <MenuItem>
                  <a
                    href="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Your Profile
                  </a>
                </MenuItem>
                <MenuItem>
                  <a
                    href="/settings"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Settings
                  </a>
                </MenuItem>
                <MenuItem>
                  <button
                    onClick={logout}
                    className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sign out
                  </button>
                </MenuItem>
              </MenuItems>
            </Menu>
          </div>
        </div>
      </div>

      <DisclosurePanel className="sm:hidden">
        <div className="space-y-1 px-2 pb-3 pt-2">
          {navigation.map((item) => (
            <DisclosureButton
              key={item.name}
              as="a"
              href={item.href}
              className={
                (item.current
                  ? "bg-blue-900 text-white"
                  : "text-gray-300 hover:bg-blue-700 hover:text-white",
                "block rounded-md px-3 py-2 text-base font-medium")
              }
            >
              {item.name}
            </DisclosureButton>
          ))}
        </div>
      </DisclosurePanel>
    </Disclosure>
  );
}
