import React, { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, MessageSquare, User } from 'lucide-react';
import { Feedback, DepartmentFeedbackStats } from '../../types';

interface DepartmentFeedbackListProps {
  feedbacks: Feedback[];
  departmentStats?: DepartmentFeedbackStats;
}

const DepartmentFeedbackList: React.FC<DepartmentFeedbackListProps> = ({ feedbacks, departmentStats }) => {
  const [expandedFeedback, setExpandedFeedback] = useState<string | null>(null);

  if (feedbacks.length === 0) {
    return (
      <div className="card p-8 text-center">
        <MessageSquare size={48} className="mx-auto mb-4 text-neutral-300" />
        <h3 className="text-xl font-semibold text-neutral-700 mb-2">No Feedback Available</h3>
        <p className="text-neutral-500">
          No feedback submissions found for the selected department.
        </p>
      </div>
    );
  }

  const toggleExpand = (id: string) => {
    if (expandedFeedback === id) {
      setExpandedFeedback(null);
    } else {
      setExpandedFeedback(id);
    }
  };

  return (
    <div>
      {departmentStats && (
        <div className="card mb-6">
          <div className="card-body">
            <h3 className="text-lg font-medium text-neutral-800 mb-4">
              Summary for {departmentStats.department} Department
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-neutral-50 p-4 rounded-md">
                <div className="text-sm text-neutral-500 mb-1">Average Rating</div>
                <div className="text-2xl font-semibold text-primary-700">
                  {departmentStats.averageRating.toFixed(1)} / 5
                </div>
              </div>
              
              <div className="bg-neutral-50 p-4 rounded-md">
                <div className="text-sm text-neutral-500 mb-1">Total Feedbacks</div>
                <div className="text-2xl font-semibold text-primary-700">
                  {departmentStats.totalFeedbacks}
                </div>
              </div>
              
              <div className="bg-neutral-50 p-4 rounded-md">
                <div className="text-sm text-neutral-500 mb-1">Questions Rated</div>
                <div className="text-2xl font-semibold text-primary-700">
                  {departmentStats.questionStats.length}
                </div>
              </div>
            </div>
            
            <h4 className="text-md font-medium text-neutral-700 mb-3">Question Ratings</h4>
            <div className="space-y-3">
              {departmentStats.questionStats.map((questionStat) => (
                <div key={questionStat.questionId} className="flex flex-col space-y-1">
                  <div className="text-sm text-neutral-600">{questionStat.questionText}</div>
                  <div className="flex items-center">
                    <div 
                      className={`inline-block w-8 h-8 rounded-full mr-2 flex items-center justify-center font-medium text-sm ${
                        questionStat.averageRating >= 4 
                          ? 'bg-success-500 text-white' 
                          : questionStat.averageRating >= 3 
                          ? 'bg-warning-500 text-neutral-800' 
                          : 'bg-error-500 text-white'
                      }`}
                    >
                      {questionStat.averageRating.toFixed(1)}
                    </div>
                    <div className="bg-neutral-200 h-2 rounded-full w-full max-w-xs overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          questionStat.averageRating >= 4 
                            ? 'bg-success-500' 
                            : questionStat.averageRating >= 3 
                            ? 'bg-warning-500' 
                            : 'bg-error-500'
                        }`}
                        style={{ width: `${(questionStat.averageRating / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {feedbacks.map((feedback) => (
          <div key={feedback.id} className="card">
            <div 
              className="p-4 border-b border-neutral-200 flex justify-between items-center cursor-pointer"
              onClick={() => toggleExpand(feedback.id)}
            >
              <div>
                <div className="flex items-center space-x-2">
                  <User size={16} className="text-primary-500" />
                  <span className="font-medium text-neutral-800">{feedback.userName}</span>
                  <span className="text-sm text-neutral-500">
                    from {feedback.userDepartment}
                  </span>
                </div>
                <div className="mt-1 text-sm text-neutral-500">
                  Submitted on {format(feedback.createdAt, 'MMM dd, yyyy')}
                </div>
              </div>
              
              <div className="flex items-center">
                <div 
                  className={`inline-block w-8 h-8 rounded-full mr-3 flex items-center justify-center font-medium ${
                    calculateAverageRating(feedback) >= 4 
                      ? 'bg-success-500 text-white' 
                      : calculateAverageRating(feedback) >= 3 
                      ? 'bg-warning-500 text-neutral-800' 
                      : 'bg-error-500 text-white'
                  }`}
                >
                  {calculateAverageRating(feedback).toFixed(1)}
                </div>
                {expandedFeedback === feedback.id ? (
                  <ChevronUp size={20} className="text-neutral-500" />
                ) : (
                  <ChevronDown size={20} className="text-neutral-500" />
                )}
              </div>
            </div>
            
            {expandedFeedback === feedback.id && (
              <div className="p-4 animate-appear">
                <div className="space-y-6">
                  {feedback.questions.map((question, idx) => (
                    <div key={question.id} className="border-b border-neutral-100 pb-4 last:border-b-0 last:pb-0">
                      <h4 className="text-sm font-medium text-neutral-700 mb-2">
                        {idx + 1}. {question.text}
                      </h4>
                      
                      <div className="flex items-center mb-2">
                        <div 
                          className={`inline-block w-8 h-8 rounded-full mr-2 flex items-center justify-center font-medium ${
                            question.rating >= 4 
                              ? 'bg-success-500 text-white' 
                              : question.rating >= 3 
                              ? 'bg-warning-500 text-neutral-800' 
                              : 'bg-error-500 text-white'
                          }`}
                        >
                          {question.rating}
                        </div>
                        <span className="text-sm text-neutral-600">
                          {getRatingLabel(question.rating)}
                        </span>
                      </div>
                      
                      {question.comment && (
                        <div className="bg-neutral-50 p-3 rounded-md text-sm text-neutral-700">
                          {question.comment}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {feedback.additionalComment && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-neutral-700 mb-2">
                        Additional Comments
                      </h4>
                      <div className="bg-neutral-50 p-3 rounded-md text-sm text-neutral-700">
                        {feedback.additionalComment}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper function to calculate average rating for a feedback
const calculateAverageRating = (feedback: Feedback): number => {
  if (feedback.questions.length === 0) return 0;
  
  const sum = feedback.questions.reduce((acc, question) => acc + question.rating, 0);
  return sum / feedback.questions.length;
};

// Helper function to get a label for a rating
const getRatingLabel = (rating: number): string => {
  switch (rating) {
    case 1: return 'Very Poor';
    case 2: return 'Poor';
    case 3: return 'Average';
    case 4: return 'Good';
    case 5: return 'Excellent';
    default: return '';
  }
};

export default DepartmentFeedbackList;