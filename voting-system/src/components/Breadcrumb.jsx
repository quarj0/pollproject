import { Link, useLocation, matchPath } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiChevronRight } from 'react-icons/hi';

const routes = [
  { path: '/', name: 'Home' },
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/events', name: 'Events' },
  { path: '/payment/verify/:reference', name: 'Payment Verification' },
  { path: '/polls/:pollId/contestants', name: 'Contestants' },
  { path: '/manage-polls', name: 'Manage Polls' },
  { path: '/create/:pollId/contestants', name: 'Add Contestant' },
  { path: '/edit/poll/:pollId', name: 'Edit Poll' },
  { path: '/edit/contestant/:contestantId', name: 'Update Contestant' },
  { path: '/past/events', name: 'Past Events' },
  { path: '/register', name: 'Register' },
  { path: '/login', name: 'Login' },
  { path: '/payment/new', name: 'New Payment' },
  { 
    path: '/poll/:pollId', 
    name: 'Poll',
    breadcrumb: (params) => `Poll ${params.pollId}`
  },
  { 
    path: '/poll/:pollId/results', 
    name: 'Results',
    parent: '/poll/:pollId'
  },
  { 
    path: '/polls/:pollId', 
    name: 'Poll',
    breadcrumb: (params) => `Poll ${params.pollId}`
  },
  { path: '/settings', name: 'Settings' },
  { path: '/about', name: 'About' },
  { path: '/contact', name: 'Contact' },
  { path: '/faq', name: 'FAQ' },
  { path: '/privacy-policy', name: 'Privacy Policy' },
  { path: '/terms', name: 'Terms' },
  { path: '/services', name: 'Services' },
  { path: '/profile', name: 'Profile' },
  { path: '/create-poll', name: 'Create Poll' }
];

const Breadcrumb = () => {
  const location = useLocation();

  const findMatchingRoute = (pathname) => {
    // Sort routes by specificity (longer paths first)
    const sortedRoutes = [...routes].sort((a, b) => 
      b.path.split('/').length - a.path.split('/').length
    );

    // Find the first matching route
    for (const route of sortedRoutes) {
      const match = matchPath({ path: route.path, end: true }, pathname);
      if (match) {
        return { ...route, params: match.params };
      }
    }
    return null;
  };

  const getBreadcrumbItems = () => {
    const items = [];
    const paths = location.pathname.split('/').filter(Boolean);
    let currentPath = '';

    // Always add home
    items.push({ name: 'Home', path: '/' });

    // Build the breadcrumb chain
    paths.forEach((part) => {
      currentPath += `/${part}`;
      const route = findMatchingRoute(currentPath);

      if (route) {
        // If this is a child route and has a parent defined
        if (route.parent) {
          const parentRoute = findMatchingRoute(
            route.parent.replace(/:([^/]+)/g, (_, param) => route.params[param])
          );
          if (parentRoute && items[items.length - 1]?.path !== parentRoute.path) {
            items.push({
              name: parentRoute.breadcrumb ? 
                parentRoute.breadcrumb(parentRoute.params) : 
                parentRoute.name,
              path: currentPath.replace(/\/[^/]+$/, '')
            });
          }
        }

        items.push({
          name: route.breadcrumb ? 
            route.breadcrumb(route.params) : 
            route.name,
          path: currentPath
        });
      } else {
        // Fallback: use formatted segment name
        const name = part
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        items.push({ name, path: currentPath });
      }
    });

    return items;
  };

  const breadcrumbItems = getBreadcrumbItems();

  return (
    <motion.nav 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex px-5 py-3 text-gray-700 border border-gray-200 rounded-lg bg-gray-50 max-w-fit mx-4 mt-4"
      aria-label="Breadcrumb"
    >
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        {breadcrumbItems.map((item, index) => (
          <li key={index} className="inline-flex items-center">
            {index > 0 && <HiChevronRight className="w-5 h-5 text-gray-400" />}
            <Link
              to={item.path}
              className={`${index > 0 ? 'ml-1 md:ml-2' : ''} text-sm font-medium text-gray-700 hover:text-blue-600`}
            >
              {item.name}
            </Link>
          </li>
        ))}
      </ol>
    </motion.nav>
  );
};

export default Breadcrumb;
