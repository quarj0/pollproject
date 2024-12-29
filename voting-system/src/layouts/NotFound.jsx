import { Link } from "react-router-dom";

const NotFoundPage = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
            <div className="text-center">
                <h1 className="text-5xl font-bold text-gray-800 mb-4">
                    404
                </h1>
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                    Oops! Page not found.
                </h2>
                <p className="text-gray-500 mb-6">
                    The page you are looking for does not exist.
                </p>
                <Link to="/" className="text-blue-600 hover:underline text-lg">
                    Go back to Home
                </Link>
            </div>
        </div>
    );
};

export default NotFoundPage;
