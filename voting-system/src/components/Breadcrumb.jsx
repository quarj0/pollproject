import { Link, useLocation, matchPath } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiChevronRight } from 'react-icons/hi';

const routes = [
  { path: '/', name: 'Home' },
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/events', name: 'Upcoming Events' },
  { path: '/past/events', name: 'Past Events' },
  { path: '/payment/verify/:reference', name: 'Payment Verification' },
  { path: '/polls/:pollId/contestants', name: 'Contestants' },
  { path: '/polls/:pollId/contestants/:contestantId/edit', name: 'Edit Contestant' },
  { path: '/manage-polls', name: 'Manage Polls' },
  { path: '/create/:pollId/contestants', name: 'Add Contestant' },
  { path: '/edit/poll/:pollId', name: 'Edit Poll' },
  { path: '/edit/contestant/:contestantId', name: 'Update Contestant' },
  { path: '/register', name: 'Register' },
  { path: '/login', name: 'Login' },
  { path: '/payment/new', name: 'New Payment' },
  { 
    path: '/poll/:pollId', 
    name: 'Poll Details',
    breadcrumb: (params) => `Poll ${params.pollId}`
  },
  { 
    path: '/poll/:pollId/results', 
    name: 'Results',
    parent: '/poll/:pollId',
    breadcrumb: (params) => `Poll ${params.pollId} Results`
  },
  { path: '/settings', name: 'Settings' },
  { path: '/about', name: 'About' },
  { path: '/contact', name: 'Contact' },
  { path: '/faq', name: 'FAQ' },
  { path: '/privacy-policy', name: 'Privacy Policy' },
  { path: '/terms', name: 'Terms' },
  { path: '/services', name: 'Services' },
  { path: '/profile', name: 'Profile' },
  { path: '/create-poll', name: 'Create Poll' },
  { path: '/password/reset', name: 'Reset Password' },
  { path: '/auth/reset/password/:uidb64/:token', name: 'Reset Password Confirmation' }
];

const Breadcrumb = () => {
  const location = useLocation();

  const findMatchingRoute = (pathname) => {
    // Sort routes by specificity (longer paths first)
    const sortedRoutes = [...routes].sort((a, b) => 
      b.path.split('/').length - a.path.split('/').length ||
      b.path.length - a.path.length
    );

    // Find the first matching route
    for (const route of sortedRoutes) {
      const match = matchPath(
        { 
          path: route.path, 
          end: true,
          // Allow partial matches for parent routes
          exact: !route.parent 
        }, 
        pathname
      );
      if (match) {
        return { ...route, params: match.params };
      }
    }
    return null;
  };

  const getBreadcrumbItems = () => {
    const items = [];
    let currentPath = '';
    const pathSegments = location.pathname.split('/').filter(Boolean);

    // Always add home for non-home pages
    if (location.pathname !== '/') {
      items.push({ name: 'Home', path: '/' });
    }

    // Build the breadcrumb chain
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const route = findMatchingRoute(currentPath);

      if (route) {
        // Handle parent routes if defined
        if (route.parent) {
          const parentPath = route.parent.replace(
            /:([^/]+)/g, 
            (_, param) => route.params[param]
          );
          const parentRoute = findMatchingRoute(parentPath);
          
          if (parentRoute && !items.find(item => item.path === parentPath)) {
            items.push({
              name: parentRoute.breadcrumb ? 
                parentRoute.breadcrumb(parentRoute.params) : 
                parentRoute.name,
              path: parentPath
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
        // Only add fallback if we haven't found a matching route
        const previousPath = pathSegments.slice(0, index).join('/');
        const previousRoute = findMatchingRoute(`/${previousPath}`);
        
        if (!previousRoute || index === pathSegments.length - 1) {
          const name = segment
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          items.push({ name, path: currentPath });
        }
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
              className={`${
                index > 0 ? 'ml-1 md:ml-2' : ''
              } text-sm font-medium ${
                item.path === location.pathname 
                  ? 'text-blue-600' 
                  : 'text-gray-700 hover:text-blue-600'
              }`}
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
