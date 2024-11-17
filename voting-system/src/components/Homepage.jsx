const HomePage = () => {
  return (
    <div className="font-roboto bg-background text-dark">
      {/* Header */}

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center h-screen bg-gradient-to-r from-primary to-accent text-white text-center p-6">
        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-4">
          Vote for What Matters
        </h1>
        <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
          Join thousands of users and participate in secure, transparent voting.
          A seamless experience for all your voting needs.
        </p>
        <div className="space-x-4">
          <button className="bg-secondary text-white py-3 px-6 rounded-full hover:bg-accent transition-all duration-300">
            Start Voting
          </button>
          <button className="bg-transparent border-2 border-white text-white py-3 px-6 rounded-full hover:bg-white hover:text-dark transition-all duration-300">
            Learn More
          </button>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16 bg-light text-dark text-center">
        <h2 className="text-3xl font-semibold mb-4">About Our Voting System</h2>
        <p className="text-lg mx-auto w-3/4 md:w-1/2">
          Our platform offers a secure, transparent, and easy-to-use voting
          system. Whether you&apos;re voting for a contest, election, or survey,
          we provide a seamless experience.
        </p>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="py-16 bg-background text-dark text-center"
      >
        <h2 className="text-3xl font-semibold mb-8">
          Why Choose Our Platform?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 px-6">
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
            <img
              src="/assets/icons/secure.svg"
              alt="Secure"
              className="h-16 mx-auto mb-4"
            />
            <h3 className="text-xl font-semibold">Secure Voting</h3>
            <p>
              Our platform ensures that your votes are protected with the latest
              security protocols.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
            <img
              src="/assets/icons/transparent.svg"
              alt="Transparent"
              className="h-16 mx-auto mb-4"
            />
            <h3 className="text-xl font-semibold">Transparent Results</h3>
            <p>
              View real-time results that are always transparent and unbiased.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
            <img
              src="/assets/icons/fast.svg"
              alt="Fast"
              className="h-16 mx-auto mb-4"
            />
            <h3 className="text-xl font-semibold">Fast and Easy</h3>
            <p>
              Cast your vote and see the results quickly. Simple, intuitive
              interface for all users.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 bg-dark text-white text-center">
        <p>&copy; 2024 Your Voting Platform. All rights reserved.</p>
        <div className="space-x-4 mt-4">
          <a
            href="/privacy-policy"
            className="hover:text-accent transition-colors duration-300"
          >
            Privacy Policy
          </a>
          <a
            href="/terms"
            className="hover:text-accent transition-colors duration-300"
          >
            Terms of Service
          </a>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
