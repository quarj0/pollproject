/* eslint-disable no-unused-vars */
import { useState, useEffect, Fragment } from "react";
import PropTypes from "prop-types";
import { Disclosure, Menu, Transition } from "@headlessui/react";
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
import logo from "../assets/votelab.png";

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
      const fetchBalance = async () => {
        try {
          const response = await axiosInstance.get("/payment/account/balance/", {
            headers: { Authorization: `Bearer ${authTokens.access}` },
          });
          if (response.data && typeof response.data.available_balance === "number") {
            setBalance(response.data.available_balance.toFixed(2));
          } else {
            console.error("Invalid balance data:", response.data);
            setBalance("0.00");
          }
        } catch (error) {
          console.error("Error fetching balance:", error);
          setBalance("0.00");
          // Optionally show error message to user
          // setError('Failed to fetch balance');
        } finally {
          setLoading(false);
        }
      };
      fetchBalance();
    }
  }, [authTokens]);

  const MenuItem = ({ to, icon, label }) => (
    <Menu.Item>
      {({ active }) => (
        <Link
          to={to}
          className={`${
            active ? "bg-gray-50" : ""
          } px-4 py-2 text-sm text-gray-700 flex items-center space-x-2 hover:bg-gray-50 transition duration-150`}
        >
          {icon}
          <span>{label}</span>
        </Link>
      )}
    </Menu.Item>
  );

  MenuItem.propTypes = {
    to: PropTypes.string.isRequired,
    icon: PropTypes.node.isRequired,
    label: PropTypes.string.isRequired,
  };

  return (
    <>
      <Disclosure as="nav" className="fixed top-0 w-full bg-white shadow-md z-50">
        {({ open }) => (
          <>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="relative flex h-16 items-center justify-between">
                {/* Mobile Menu Button */}
                <div className="flex items-center sm:hidden">
                  <Disclosure.Button
                    aria-label="Open mobile menu"
                    className="relative inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-teal-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors duration-200"
                  >
                    <span className="sr-only">
                      {open ? 'Close main menu' : 'Open main menu'}
                    </span>
                    {open ? (
                      <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                    ) : (
                      <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                    )}
                  </Disclosure.Button>
                </div>

                {/* Logo and Navigation Links */}
                <div className="flex flex-1 items-center justify-center sm:justify-start">
                  <div className="flex shrink-0 items-center">
                    <Link to="/dashboard" className="focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 rounded-lg">
                      <img src={logo} alt="VoteLab Logo" className="h-8 w-auto sm:h-10" />
                    </Link>
                  </div>
                  <div className="hidden sm:ml-8 sm:block">
                    <div className="flex space-x-4">
                      {navigation.map((item) => (
                        <Link
                          key={item.name}
                          to={item.href}
                          className={`${
                            item.current
                              ? "bg-teal-800 text-white"
                              : "text-gray-700 hover:bg-teal-700 hover:text-white"
                          } rounded-md px-3 py-2 text-sm font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2`}
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Balance and Profile */}
                <div className="flex items-center space-x-4">
                  <div className="hidden sm:block">
                    {loading ? (
                      <div className="text-sm text-gray-600 animate-pulse">Loading balance...</div>
                    ) : error ? (
                      <div className="text-sm text-red-500 animate-pulse">Error loading balance</div>
                    ) : (
                      <span className="text-sm font-medium text-gray-700">
                        Balance: GHS {balance.available}
                      </span>
                    )}
                  </div>

                  {/* Profile Dropdown */}
                  {authTokens ? (
                    <Menu as="div" className="relative ml-3">
                      {({ open }) => (
                        <>
                          <Menu.Button className="flex rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition duration-200">
                            <span className="sr-only">Open user menu</span>
                            <FaUserCircle className="h-8 w-8 text-gray-600 hover:text-teal-700 transition-colors" />
                          </Menu.Button>
                          <Transition
                            as={Fragment}
                            enter="transition ease-out duration-200"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-150"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                          >
                            <Menu.Items className="absolute right-0 z-50 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none">
                              <MenuItem
                                to="/profile"
                                icon={<FaUser className="h-4 w-4" />}
                                label="Your Profile"
                              />
                              <MenuItem
                                to="/payment/new"
                                icon={<FaCreditCard className="h-4 w-4" />}
                                label="New Payment Link"
                              />
                              <MenuItem
                                to="/settings"
                                icon={<FaCog className="h-4 w-4" />}
                                label="Settings"
                              />
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={logout}
                                    className={`${
                                      active ? "bg-gray-50" : ""
                                    } w-full px-4 py-2 text-left text-sm text-gray-700 flex items-center space-x-2 hover:bg-gray-50 transition duration-150`}
                                  >
                                    <FaSignOutAlt className="h-4 w-4" />
                                    <span>Sign out</span>
                                  </button>
                                )}
                              </Menu.Item>
                            </Menu.Items>
                          </Transition>
                        </>
                      )}
                    </Menu>
                  ) : (
                    <Link
                      to="/login"
                      className="text-gray-700 hover:text-teal-700 font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 rounded-md px-3 py-2"
                    >
                      Login
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Navigation */}
            <Transition
              show={open}
              enter="transition duration-200 ease-out"
              enterFrom="transform scale-95 opacity-0"
              enterTo="transform scale-100 opacity-100"
              leave="transition duration-150 ease-in"
              leaveFrom="transform scale-100 opacity-100"
              leaveTo="transform scale-95 opacity-0"
            >
              <Disclosure.Panel className="sm:hidden">
                <div className="space-y-1 px-2 pb-3 pt-2 bg-white shadow-lg rounded-b-lg">
                  <div className="py-2 px-3 border-b border-gray-200">
                    {loading ? (
                      <div className="text-sm text-gray-600 animate-pulse">Loading balance...</div>
                    ) : error ? (
                      <div className="text-sm text-red-500 animate-pulse">Error loading balance</div>
                    ) : (
                      <span className="text-sm font-medium text-gray-700">
                        Balance: GHS {balance.available}
                      </span>
                    )}
                  </div>
                  {navigation.map((item) => (
                    <Disclosure.Button
                      key={item.name}
                      as={Link}
                      to={item.href}
                      className={`${
                        item.current
                          ? "bg-teal-800 text-white"
                          : "text-gray-700 hover:bg-teal-700 hover:text-white"
                      } block rounded-md px-3 py-2 text-base font-medium transition duration-200 w-full text-left`}
                    >
                      {item.name}
                    </Disclosure.Button>
                  ))}
                </div>
              </Disclosure.Panel>
            </Transition>
          </>
        )}
      </Disclosure>
      {/* Add spacing below navbar */}
      <div className="h-16" />
    </>
  );
}

Navbar.propTypes = {
  authTokens: PropTypes.object,
  logout: PropTypes.func.isRequired,
};
