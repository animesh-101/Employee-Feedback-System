import React, { useState, useEffect } from 'react';
import { Department, departments, DepartmentFeedbackStats, Feedback } from '../../types';
import LoadingSpinner from '../common/LoadingSpinner';
import DepartmentFeedbackList from './DepartmentFeedbackList';
import FeedbackQuestionManager from './FeedbackQuestionManager';
import QuestionTemplateManager from './QuestionTemplateManager';
import { BarChart3, FileText, Settings, ClipboardList } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3001/api';

const AdminDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'feedbacks' | 'manage' | 'templates'>('overview');
  const [selectedDepartment, setSelectedDepartment] = useState<Department | 'all'>('all');
  const [departmentStats, setDepartmentStats] = useState<DepartmentFeedbackStats[]>([]);
  const [totalFeedbacks, setTotalFeedbacks] = useState(0);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);

  // Calculate stats for all departments
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        // Fetch all feedbacks with department statistics
        const response = await fetch(`${API_BASE_URL}/feedbacks`);
        if (!response.ok) {
          throw new Error('Failed to fetch feedbacks');
        }
        const data = await response.json();
        
        setFeedbacks(data.feedbacks);
        setTotalFeedbacks(data.totalFeedbacks);
        setDepartmentStats(data.departmentStats);
      } catch (error) {
        console.error('Error fetching feedback stats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  const filteredFeedbacks = selectedDepartment === 'all' 
    ? feedbacks 
    : feedbacks.filter(f => f.targetDepartment === selectedDepartment);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="animate-appear">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h2 className="text-2xl font-semibold text-neutral-800 mb-4 md:mb-0">
          Admin Dashboard
        </h2>
        
        <div className="flex bg-neutral-100 p-1 rounded-md">
          <button
            className={`px-4 py-2 rounded flex items-center ${
              activeTab === 'overview' 
              ? 'bg-white shadow-sm text-primary-700' 
              : 'text-neutral-600 hover:text-neutral-800'
            }`}
            onClick={() => setActiveTab('overview')}
          >
            <BarChart3 size={18} className="mr-2" />
            <span>Overview</span>
          </button>
          <button
            className={`px-4 py-2 rounded flex items-center ${
              activeTab === 'feedbacks' 
              ? 'bg-white shadow-sm text-primary-700' 
              : 'text-neutral-600 hover:text-neutral-800'
            }`}
            onClick={() => setActiveTab('feedbacks')}
          >
            <FileText size={18} className="mr-2" />
            <span>Feedbacks</span>
          </button>
          <button
            className={`px-4 py-2 rounded flex items-center ${
              activeTab === 'manage' 
              ? 'bg-white shadow-sm text-primary-700' 
              : 'text-neutral-600 hover:text-neutral-800'
            }`}
            onClick={() => setActiveTab('manage')}
          >
            <Settings size={18} className="mr-2" />
            <span>Manage</span>
          </button>
          <button
            className={`px-4 py-2 rounded flex items-center ${
              activeTab === 'templates' 
              ? 'bg-white shadow-sm text-primary-700' 
              : 'text-neutral-600 hover:text-neutral-800'
            }`}
            onClick={() => setActiveTab('templates')}
          >
            <ClipboardList size={18} className="mr-2" />
            <span>Question Templates</span>
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card">
              <div className="card-body">
                <h3 className="text-neutral-500 text-sm font-medium mb-1">Total Feedbacks</h3>
                <p className="text-3xl font-semibold text-primary-700">{totalFeedbacks}</p>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <h3 className="text-neutral-500 text-sm font-medium mb-1">Departments with Feedback</h3>
                <p className="text-3xl font-semibold text-primary-700">
                  {departmentStats.filter(d => d.totalFeedbacks > 0).length}
                </p>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <h3 className="text-neutral-500 text-sm font-medium mb-1">Average Rating Overall</h3>
                <p className="text-3xl font-semibold text-primary-700">
                  {(departmentStats.reduce((acc, curr) => acc + (curr.averageRating * curr.totalFeedbacks), 0) / 
                    Math.max(1, departmentStats.reduce((acc, curr) => acc + curr.totalFeedbacks, 0))).toFixed(1)}
                </p>
              </div>
            </div>
          </div>

          <h3 className="text-xl font-semibold text-neutral-800 mb-4">Department Ratings</h3>
          <div className="card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Average Rating
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Total Feedbacks
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {departmentStats
                    .sort((a, b) => b.totalFeedbacks - a.totalFeedbacks)
                    .map((stat) => (
                      <tr key={stat.department} className="hover:bg-neutral-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-neutral-800">{stat.department}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {stat.totalFeedbacks > 0 ? (
                            <div className="flex items-center">
                              <span 
                                className={`inline-block w-8 h-8 rounded-full mr-2 flex items-center justify-center font-medium ${
                                  stat.averageRating >= 4 
                                    ? 'bg-success-500 text-white' 
                                    : stat.averageRating >= 3 
                                    ? 'bg-warning-500 text-neutral-800' 
                                    : 'bg-error-500 text-white'
                                }`}
                              >
                                {stat.averageRating.toFixed(1)}
                              </span>
                              <div 
                                className="bg-neutral-200 h-2 rounded-full w-24 overflow-hidden"
                              >
                                <div 
                                  className={`h-full rounded-full ${
                                    stat.averageRating >= 4 
                                      ? 'bg-success-500' 
                                      : stat.averageRating >= 3 
                                      ? 'bg-warning-500' 
                                      : 'bg-error-500'
                                  }`}
                                  style={{ width: `${(stat.averageRating / 5) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-neutral-500">No data</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-neutral-800">{stat.totalFeedbacks}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {stat.totalFeedbacks > 0 ? (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-success-50 text-success-600">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-neutral-100 text-neutral-600">
                              No Feedback
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'feedbacks' && (
        <div>
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-neutral-800 mb-3 md:mb-0">
              Feedback Submissions
            </h3>
            
            <div className="inline-block">
              <select
                className="form-select"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value as Department | 'all')}
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>
          
          <DepartmentFeedbackList 
            feedbacks={filteredFeedbacks} 
            departmentStats={departmentStats.find(d => 
              selectedDepartment !== 'all' && d.department === selectedDepartment
            )}
          />
        </div>
      )}

      {activeTab === 'manage' && (
        <FeedbackQuestionManager />
      )}

      {activeTab === 'templates' && (
        <QuestionTemplateManager />
      )}
    </div>
  );
};

export default AdminDashboard;