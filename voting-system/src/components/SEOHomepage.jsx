import Homepage from './Homepage';
import Metadata from './Metadata';

const SEOHomepage = () => {
  const seoData = {
    title: "Cast Sure - Professional Digital Voting & Poll Management Platform",
    description: "Create and manage secure digital polls with real-time results. Perfect for organizations, elections, events, and competitions. Start your digital voting journey today.",
    keywords: "digital voting, online polls, election management, secure voting, real-time results, poll creation",
    canonical: "https://castsure.com"
  };

  return (
    <>
      <Metadata {...seoData} />
      <Homepage />
    </>
  );
};

export default SEOHomepage;
