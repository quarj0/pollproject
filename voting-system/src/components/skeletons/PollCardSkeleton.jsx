
const PollCardSkeleton = () => {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-soft-xl">
      <div className="animate-pulse">
        {/* Image placeholder */}
        <div className="h-48 bg-gray-200" />
        
        <div className="p-5">
          {/* Title placeholder */}
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
          
          {/* Description placeholder */}
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-5/6" />
          </div>
          
          {/* Stats placeholder */}
          <div className="flex items-center justify-between mt-4">
            <div className="h-4 bg-gray-200 rounded w-1/4" />
            <div className="h-4 bg-gray-200 rounded w-1/4" />
          </div>
        </div>
        
        {/* Footer placeholder */}
        <div className="px-5 py-4 bg-gray-50">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
        </div>
      </div>
    </div>
  );
};

export default PollCardSkeleton;
