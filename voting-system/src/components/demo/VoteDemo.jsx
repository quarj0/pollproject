import { useState } from 'react';
import { motion } from 'framer-motion';
import { FaCheck, FaUsers, FaClock, FaChartBar } from 'react-icons/fa';

const VoteDemo = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [demoVotes, setDemoVotes] = useState({
    'python': 42,
    'javascript': 38,
    'java': 35,
    'csharp': 28
  });

  const candidates = [
    {
      id: 'python',
      name: 'Python',
      image: 'https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/267_Python_logo-512.png',
      category: 'Backend'
    },
    {
      id: 'javascript',
      name: 'JavaScript',
      image: 'https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/187_Js_logo_logos-512.png',
      category: 'Full Stack'
    },
    {
      id: 'java',
      name: 'Java',
      image: 'https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/181_Java_logo_logos-512.png',
      category: 'Backend'
    },
    {
      id: 'csharp',
      name: 'C#',
      image: 'https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/181_Java_logo_logos-512.png',
      category: 'Backend'
    }
  ];

  const steps = [
    {
      title: 'Poll Creation',
      icon: <FaUsers className="w-6 h-6" />,
      description: 'Create a new poll in seconds',
      content: (
        <div className="space-y-4">
          <div className="w-full max-w-sm mx-auto">
            <input
              type="text"
              placeholder="Poll Title"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              value="Best Programming Language 2024"
              readOnly
            />
            <textarea
              placeholder="Poll Description"
              className="w-full mt-3 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              value="Vote for your favorite programming language!"
              readOnly
            />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="p-2 border rounded-lg">
                <div className="font-medium">Start Time</div>
                <div className="text-sm text-gray-600">March 20, 2024</div>
              </div>
              <div className="p-2 border rounded-lg">
                <div className="font-medium">End Time</div>
                <div className="text-sm text-gray-600">March 27, 2024</div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Contestant Management',
      icon: <FaUsers className="w-6 h-6" />,
      description: 'Add and manage contestants',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
            {candidates.map((candidate) => (
              <div key={candidate.id} className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <img src={candidate.image} alt={candidate.name} className="w-16 h-16 mx-auto mb-2" />
                <h3 className="text-center font-semibold">{candidate.name}</h3>
                <p className="text-center text-sm text-gray-600">{candidate.category}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-4">
            <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
              Add Contestant
            </button>
          </div>
        </div>
      )
    },
    {
      title: 'Voting Interface',
      icon: <FaClock className="w-6 h-6" />,
      description: 'Simple and secure voting',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
            {candidates.map((candidate) => (
              <motion.div
                key={candidate.id}
                className={`p-4 border rounded-lg cursor-pointer ${
                  selectedCandidate === candidate.id ? 'border-blue-500 shadow-lg' : 'hover:shadow-md'
                }`}
                onClick={() => setSelectedCandidate(candidate.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <img src={candidate.image} alt={candidate.name} className="w-16 h-16 mx-auto mb-2" />
                <h3 className="text-center font-semibold">{candidate.name}</h3>
                <p className="text-center text-sm text-gray-600">{candidate.category}</p>
                {selectedCandidate === candidate.id && (
                  <div className="absolute top-2 right-2">
                    <FaCheck className="text-blue-500" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
          <div className="flex justify-center mt-4">
            <button 
              className={`px-6 py-2 rounded-lg ${
                selectedCandidate 
                  ? 'bg-blue-500 text-white hover:bg-blue-600' 
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
              disabled={!selectedCandidate}
              onClick={() => {
                if (selectedCandidate) {
                  setDemoVotes(prev => ({
                    ...prev,
                    [selectedCandidate]: prev[selectedCandidate] + 1
                  }));
                  setCurrentStep(3);
                }
              }}
            >
              Submit Vote
            </button>
          </div>
        </div>
      )
    },
    {
      title: 'Results',
      icon: <FaChartBar className="w-6 h-6" />,
      description: 'Real-time results tracking',
      content: (
        <div className="space-y-4 max-w-lg mx-auto">
          <h3 className="text-xl font-bold text-center mb-6">Current Results</h3>
          {Object.entries(demoVotes)
            .sort(([,a], [,b]) => b - a)
            .map(([candidateId, votes]) => {
              const candidate = candidates.find(c => c.id === candidateId);
              const percentage = (votes / Object.values(demoVotes).reduce((a, b) => a + b, 0)) * 100;
              
              return (
                <div key={candidateId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <img src={candidate.image} alt={candidate.name} className="w-8 h-8" />
                      <span className="font-medium">{candidate.name}</span>
                    </div>
                    <span className="text-sm text-gray-600">{votes} votes</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <motion.div
                      className="bg-blue-500 h-2.5 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-8">
          {/* Progress Steps */}
          <div className="flex justify-between mb-8">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`flex flex-col items-center ${
                  index <= currentStep ? 'text-blue-500' : 'text-gray-400'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                    index <= currentStep ? 'bg-blue-500 text-white' : 'bg-gray-200'
                  }`}
                >
                  {step.icon}
                </div>
                <div className="text-sm font-medium">{step.title}</div>
              </div>
            ))}
          </div>

          {/* Step Content */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h2 className="text-2xl font-bold mb-2">{steps[currentStep].title}</h2>
            <p className="text-gray-600 mb-6">{steps[currentStep].description}</p>
            {steps[currentStep].content}
          </motion.div>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              className={`px-4 py-2 rounded-lg ${
                currentStep === 0
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-500 text-white hover:bg-gray-600'
              }`}
              disabled={currentStep === 0}
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentStep(prev => Math.min(steps.length - 1, prev + 1))}
              className={`px-4 py-2 rounded-lg ${
                currentStep === steps.length - 1
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
              disabled={currentStep === steps.length - 1}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoteDemo;
