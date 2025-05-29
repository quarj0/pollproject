import { useState } from 'react';
import { motion } from 'framer-motion';

const VoteDemo = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const steps = [
    {
      title: 'Poll Creation',
      description: 'Create a new poll in seconds',
      content: (
        <div className="space-y-4">
          <div className="w-full max-w-sm mx-auto">
            <input
              type="text"
              placeholder="Poll Title"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              value="Best Programming Language 2025"
              readOnly
            />
            <textarea
              placeholder="Poll Description"
              className="w-full mt-3 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              value="Vote for your favorite programming language!"
              readOnly
            />
          </div>
        </div>
      )
    },
    {
      title: 'Add Candidates',
      description: 'Add contestants to your poll',
      content: (
        <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
          <div className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <img src="https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/267_Python_logo-512.png" alt="Python" className="w-16 h-16 mx-auto mb-2" />
            <h3 className="text-center font-semibold">Python</h3>
          </div>
          <div className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <img src="https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/187_Js_logo_logos-512.png" alt="JavaScript" className="w-16 h-16 mx-auto mb-2" />
            <h3 className="text-center font-semibold">JavaScript</h3>
          </div>
        </div>
      )
    },
    {
      title: 'Voting Process',
      description: 'Simple and secure voting interface',
      content: (
        <div className="max-w-lg mx-auto space-y-4">
          {['Python', 'JavaScript'].map((candidate) => (
            <motion.button
              key={candidate}
              onClick={() => setSelectedCandidate(candidate)}
              className={`w-full p-4 rounded-lg border transition-all ${
                selectedCandidate === candidate 
                  ? 'border-primary-500 bg-primary-50 shadow-md' 
                  : 'border-gray-200 hover:border-primary-300'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <h3 className="font-medium">{candidate}</h3>
            </motion.button>
          ))}
        </div>
      )
    },
    {
      title: 'Real-time Results',
      description: 'Watch results update instantly',
      content: (
        <div className="max-w-lg mx-auto space-y-4">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium">Python</span>
                <span>65%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <motion.div 
                  className="bg-primary-600 h-2.5 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: '65%' }}
                  transition={{ duration: 1 }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium">JavaScript</span>
                <span>35%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <motion.div 
                  className="bg-accent-500 h-2.5 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: '35%' }}
                  transition={{ duration: 1 }}
                />
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="py-16 bg-gradient-to-br from-white to-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">See How It Works</h2>
        
        {/* Steps Navigation */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center space-x-4">
            {steps.map((step, index) => (
              <motion.button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`flex items-center ${
                  index === currentStep 
                    ? 'text-primary-600' 
                    : 'text-gray-400'
                }`}
                whileHover={{ scale: 1.05 }}
              >
                <span className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm
                  ${index === currentStep 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-gray-200'
                  }
                `}>
                  {index + 1}
                </span>
                <span className="ml-2 hidden sm:inline">{step.title}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto"
        >
          <h3 className="text-2xl font-semibold text-center mb-2">
            {steps[currentStep].title}
          </h3>
          <p className="text-gray-600 text-center mb-8">
            {steps[currentStep].description}
          </p>
          <div className="bg-white rounded-xl shadow-soft-xl p-6 mb-8">
            {steps[currentStep].content}
          </div>
          
          {/* Navigation Buttons */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              className="px-6 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentStep(prev => Math.min(steps.length - 1, prev + 1))}
              disabled={currentStep === steps.length - 1}
              className="px-6 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default VoteDemo;
