export const getImageUrl = (imageUrl) => {
  if (!imageUrl) return null;

  // Check if it's already a full URL
  if (imageUrl.startsWith("http")) {
    return imageUrl;
  }

  // Handle relative URLs
  return `${import.meta.env.VITE_API_URL}${imageUrl}`;
};
