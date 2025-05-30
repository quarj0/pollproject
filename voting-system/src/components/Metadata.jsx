import { Helmet } from "react-helmet-async";
import PropTypes from "prop-types";

const Metadata = ({ 
  title, 
  description, 
  keywords = "", 
  ogImage = "https://castsure.com/og-image.jpg",
  canonical
}) => {
  const fullTitle = title ? `${title} | Cast Sure` : "Cast Sure - Secure Digital Voting & Poll Management Platform";
  
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      
      {/* Canonical URL */}
      {canonical && <link rel="canonical" href={canonical} />}
    </Helmet>
  );
};

Metadata.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string.isRequired,
  keywords: PropTypes.string,
  ogImage: PropTypes.string,
  canonical: PropTypes.string
};

export default Metadata;
