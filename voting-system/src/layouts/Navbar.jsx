import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Disclosure, Menu } from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import {
  FaUserCircle,
  FaUser,
  FaCreditCard,
  FaCog,
  FaSignOutAlt,
} from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";
import axiosInstance from "../apis/api";

export default function Navbar({ authTokens, logout }) {
  const [balance, setBalance] = useState({ available: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const location = useLocation();

  const navigation = [
    {
      name: "Home",
      href: "/dashboard",
      current: location.pathname === "/dashboard",
    },
    {
      name: "Manage Poll",
      href: "/manage-polls",
      current: location.pathname === "/manage-polls",
    },
  ];

  useEffect(() => {
    if (authTokens) {
      setLoading(true);
      setError(false);
      axiosInstance
        .get("payment/account/balance", {
          headers: {
            Authorization: `Bearer ${authTokens.access}`,
          },
        })
        .then((response) => {
          setBalance({ available: response.data.available_balance });
          setLoading(false);
        })
        .catch(() => {
          setError(true);
          setLoading(false);
        });
    }
  }, [authTokens]);

  return (
    <>
      <Disclosure as="nav" className="fixed top-0 w-full bg-white shadow z-50">
        <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
          <div className="relative flex h-16 items-center justify-between">
            {/* Mobile Menu */}
            <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
              <Disclosure.Button className="group relative inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-teal-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                <Bars3Icon
                  className="block h-6 w-6 group-data-[open]:hidden"
                  aria-hidden="true"
                />
                <XMarkIcon
                  className="hidden h-6 w-6 group-data-[open]:block"
                  aria-hidden="true"
                />
              </Disclosure.Button>
            </div>

            {/* Logo and Links */}
            <div className="flex flex-1 items-center justify-between sm:items-stretch sm:justify-start">
              <div className="flex shrink-0 items-center">
                <img
                  src="/logo.svg"
                  alt="Logo"
                  className="h-8 w-auto sm:h-10"
                />
              </div>
              <div className="hidden sm:ml-6 sm:block">
                <div className="flex space-x-4">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`${
                        item.current
                          ? "bg-teal-900 text-white"
                          : "text-gray-800 hover:bg-teal-700 hover:text-white"
                      } rounded-md px-3 py-2 text-sm font-medium`}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Balance and Profile */}
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
              <div className="text-gray-800 mr-4">
                {loading ? (
                  <span>Loading...</span>
                ) : error ? (
                  <span className="text-red-500 text-sm">
                    Unable to load balance
                  </span>
                ) : (
                  <p>Balance: GHS {balance.available}</p>
                )}
              </div>

              {/* Profile Dropdown */}
              <Menu as="div" className="relative ml-3">
                <div>
                  <Menu.Button className="relative flex rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-950">
                    <span className="sr-only">Open user menu</span>
                    <FaUserCircle className="h-8 w-8 text-gray-600" />
                  </Menu.Button>
                </div>
                <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none">
                  <Menu.Item>
                    {({ active }) => (
                      <Link
                        to="/profile"
                        className={`${
                          active ? "bg-gray-100" : ""
                        } px-4 py-2 text-sm text-gray-700 flex items-center space-x-2`}
                      >
                        <FaUser />
                        <span>Your Profile</span>
                      </Link>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <Link
                        to="/payment/new"
                        className={`${
                          active ? "bg-gray-100" : ""
                        } px-4 py-2 text-sm text-gray-700 flex items-center space-x-2`}
                      >
                        <FaCreditCard />
                        <span>New Payment Link</span>
                      </Link>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <Link
                        to="/settings"
                        className={`${
                          active ? "bg-gray-100" : ""
                        } px-4 py-2 text-sm text-gray-700 flex items-center space-x-2`}
                      >
                        <FaCog />
                        <span>Settings</span>
                      </Link>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={logout}
                        className={`${
                          active ? "bg-gray-100" : ""
                        } w-full px-4 py-2 text-left text-sm text-gray-700 flex items-center space-x-2`}
                      >
                        <FaSignOutAlt />
                        <span>Sign out</span>
                      </button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Menu>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <Disclosure.Panel className="sm:hidden">
          <div className="space-y-1 px-2 pb-3 pt-2">
            {navigation.map((item) => (
              <Disclosure.Button
                key={item.name}
                as={Link}
                to={item.href}
                className={`${
                  item.current
                    ? "bg-teal-900 text-white"
                    : "text-gray-600 hover:bg-teal-700 hover:text-white"
                } block rounded-md px-3 py-2 text-base font-medium`}
              >
                {item.name}
              </Disclosure.Button>
            ))}
          </div>
        </Disclosure.Panel>
      </Disclosure>
    </>
  );
}

Navbar.propTypes = {
  authTokens: PropTypes.shape({
    access: PropTypes.string.isRequired,
  }),
  logout: PropTypes.func.isRequired,
};
