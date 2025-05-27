import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { FeedbackPeriod, Question, Feedback, FeedbackQuestion } from '../../types';
import LoadingSpinner from '../common/LoadingSpinner';
import { CheckCircle, AlertCircle } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3001/api';

interface QuestionFormData {
  rating: string;
  comment?: string;
}

type FormValues = {
  [key: string]: QuestionFormData;
} & {
  additionalComment?: string;
}

// Update User interface to match our backend
interface User {
  id: string;
  name: string;
  email: string;
  department: string;
}

const FeedbackForm: React.FC = () => {
  const { periodId } = useParams<{ periodId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackPeriod, setFeedbackPeriod] = useState<FeedbackPeriod | null>(null);
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>();
  const watchedValues = watch();
  
  useEffect(() => {
    const fetchFeedbackPeriod = async () => {
      if (!periodId || !currentUser) return;
      
      setLoading(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/feedback-periods/${periodId}?userId=${currentUser.id}`
        );
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load feedback form');
        }
        
        const period = await response.json();
        setFeedbackPeriod(period);
      } catch (err) {
        console.error('Error fetching feedback period:', err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to load feedback form');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchFeedbackPeriod();
  }, [periodId, currentUser]);
  
  const onSubmit = async (data: FormValues) => {
    if (!currentUser || !feedbackPeriod) {
      console.error('Missing required data:', { currentUser, feedbackPeriod });
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      // Transform form data to feedback format
      const feedbackQuestions: FeedbackQuestion[] = feedbackPeriod.questions.map((question: Question) => {
        const formQuestion = data[question.id];
        if (!formQuestion || !formQuestion.rating) {
          throw new Error(`Missing rating for question: ${question.text}`);
        }
        return {
          ...question,
          rating: parseInt(formQuestion.rating, 10),
          comment: formQuestion.comment || ''
        };
      });
      
      // Validate user data
      if (!currentUser.id || !currentUser.name || !currentUser.email || !currentUser.department) {
        throw new Error('Missing required user information');
      }
      
      const feedback = {
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email,
        userDepartment: currentUser.department,
        targetDepartment: feedbackPeriod.department,
        questions: feedbackQuestions,
        additionalComment: data.additionalComment || ''
      };
      
      // Validate feedback data
      if (!feedback.userId || !feedback.userName || !feedback.userEmail || !feedback.userDepartment || !feedback.targetDepartment) {
        throw new Error('Missing required feedback information');
      }
      
      // Save feedback using the API
      const response = await fetch(`${API_BASE_URL}/feedbacks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Add token for authentication
        },
        body: JSON.stringify(feedback)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit feedback');
      }
      
      const result = await response.json();
      setSuccess(true);
      
      // Redirect after a short delay
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      if (err instanceof Error) {
        setError(`Failed to submit feedback: ${err.message}`);
      } else {
        setError('Failed to submit feedback. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="card p-8 text-center animate-appear">
        <div className="flex justify-center mb-4">
          <AlertCircle size={48} className="text-error-500" />
        </div>
        <h3 className="text-xl font-medium text-neutral-800 mb-2">Error</h3>
        <p className="text-neutral-600 mb-6">{error}</p>
        <button 
          onClick={() => navigate('/')}
          className="btn btn-primary"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }
  
  if (success) {
    return (
      <div className="card p-8 text-center animate-appear">
        <div className="flex justify-center mb-4">
          <CheckCircle size={48} className="text-success-500" />
        </div>
        <h3 className="text-xl font-medium text-neutral-800 mb-2">Thank You!</h3>
        <p className="text-neutral-600 mb-1">Your feedback has been submitted successfully.</p>
        <p className="text-neutral-500 text-sm mb-6">You'll be redirected to the dashboard in a moment.</p>
      </div>
    );
  }
  
  if (!feedbackPeriod) {
    return null;
  }

  return (
    <div className="animate-appear">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-neutral-800">
          {feedbackPeriod.department} Department Feedback
        </h2>
        <p className="text-neutral-500 mt-1">
          Please rate your experience with the {feedbackPeriod.department} department
        </p>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="card mb-6">
          <div className="card-body">
            {feedbackPeriod.questions.map((question, index) => (
              <div key={question.id} className={`${index > 0 ? 'mt-8 pt-8 border-t border-neutral-200' : ''}`}>
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-neutral-800">
                    {index + 1}. {question.text}
                  </h3>
                </div>
                
                <div className="rating-group">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <div key={value} className="flex items-center">
                      <input
                        type="radio"
                        id={`${question.id}-rating-${value}`}
                        value={value}
                        className="rating-input"
                        {...register(`${question.id}.rating`, { required: true })}
                      />
                      <label 
                        htmlFor={`${question.id}-rating-${value}`}
                        className="rating-label"
                      >
                        {value}
                      </label>
                    </div>
                  ))}
                </div>
                
                {errors[question.id]?.rating && (
                  <p className="text-sm text-error-600 mt-1">Please select a rating</p>
                )}
                
                {/* Show comment box for ratings <= 3 */}
                {watchedValues[question.id]?.rating && 
                  parseInt(watchedValues[question.id].rating, 10) <= 3 && (
                    <div className="mt-3 animate-appear">
                      <label className="form-label" htmlFor={`${question.id}-comment`}>
                        Please provide details about your rating:
                      </label>
                      <textarea
                        id={`${question.id}-comment`}
                        className="form-textarea h-24"
                        {...register(`${question.id}.comment`, { 
                          required: 'Please provide details for ratings of 3 or below'
                        })}
                      ></textarea>
                      {errors[question.id]?.comment && (
                        <p className="text-sm text-error-600 mt-1">{errors[question.id]?.comment?.message}</p>
                      )}
                    </div>
                  )
                }
              </div>
            ))}
          </div>
        </div>
        
        <div className="card mb-6">
          <div className="card-body">
            <h3 className="text-lg font-medium text-neutral-800 mb-3">
              Additional Comments
            </h3>
            <textarea
              className="form-textarea h-32"
              placeholder="Please share any additional feedback or suggestions..."
              {...register('additionalComment')}
            ></textarea>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn btn-outline mr-3"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? <LoadingSpinner size="sm" /> : 'Submit Feedback'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FeedbackForm;