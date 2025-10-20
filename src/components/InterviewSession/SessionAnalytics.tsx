import React, { useState, useEffect, useMemo } from 'react';
import { SessionPersistenceService, SessionHistoryEntry } from '../../services/SessionPersistenceService';
import { SessionSchedulingService } from '../../services/SessionSchedulingService';

interface SessionAnalyticsProps {
  userId: string;
  persistenceService: SessionPersistenceService;
  schedulingService: SessionSchedulingService;
  className?: string;
}

interface AnalyticsData {
  totalSessions: number;
  completedSessions: number;
  totalTimeSpent: number;
  averageScore: number;
  improvementTrend: number;
  categoryPerformance: Array<{ category: string; averageScore: number; sessionCount: number }>;
  recentActivity: Array<{ date: string; sessionsCount: number; averageScore: number }>;
  practiceStreak: {
    current: number;
    longest: number;
    totalSessions: number;
  };
}

export const SessionAnalytics: React.FC<SessionAnalyticsProps> = ({
  userId,
  persistenceService,
  schedulingService,
  className = ''
}) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    loadAnalyticsData();
  }, [userId, timeRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [analytics, history, streak] = await Promise.all([
        persistenceService.getSessionAnalytics(userId),
        persistenceService.getSessionHistory(userId, 100),
        schedulingService.getPracticeStreak(userId)
      ]);

      setAnalyticsData({
        ...analytics,
        practiceStreak: {
          current: streak.currentStreak,
          longest: streak.longestStreak,
          totalSessions: streak.totalSessions
        }
      });

      setSessionHistory(history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = useMemo(() => {
    if (!sessionHistory.length) return [];

    const now = new Date();
    let cutoffDate = new Date();

    switch (timeRange) {
      case 'week':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    return sessionHistory.filter(session => 
      new Date(session.startTime) >= cutoffDate
    );
  }, [sessionHistory, timeRange]);

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (trend: number): string => {
    if (trend > 5) return '📈';
    if (trend < -5) return '📉';
    return '➡️';
  };

  if (loading) {
    return (
      <div className={`session-analytics ${className}`}>
        <div className="analytics-loading">
          <div className="loading-spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`session-analytics ${className}`}>
        <div className="analytics-error">
          <p>Error loading analytics: {error}</p>
          <button onClick={loadAnalyticsData} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className={`session-analytics ${className}`}>
        <div className="no-data">
          <p>No analytics data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`session-analytics ${className}`}>
      {/* Header */}
      <div className="analytics-header">
        <h2>Practice Analytics</h2>
        <div className="time-range-selector">
          {(['week', 'month', 'quarter', 'year'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`range-btn ${timeRange === range ? 'active' : ''}`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="analytics-overview">
        <div className="overview-card">
          <div className="card-icon">📊</div>
          <div className="card-content">
            <h3>Total Sessions</h3>
            <div className="card-value">{analyticsData.totalSessions}</div>
            <div className="card-subtitle">
              {analyticsData.completedSessions} completed
            </div>
          </div>
        </div>

        <div className="overview-card">
          <div className="card-icon">⏱️</div>
          <div className="card-content">
            <h3>Time Practiced</h3>
            <div className="card-value">{formatTime(analyticsData.totalTimeSpent)}</div>
            <div className="card-subtitle">
              Avg: {formatTime(Math.round(analyticsData.totalTimeSpent / Math.max(1, analyticsData.totalSessions)))}
            </div>
          </div>
        </div>

        <div className="overview-card">
          <div className="card-icon">🎯</div>
          <div className="card-content">
            <h3>Average Score</h3>
            <div className={`card-value ${getScoreColor(analyticsData.averageScore)}`}>
              {Math.round(analyticsData.averageScore)}%
            </div>
            <div className="card-subtitle">
              {getTrendIcon(analyticsData.improvementTrend)} {Math.abs(analyticsData.improvementTrend).toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="overview-card">
          <div className="card-icon">🔥</div>
          <div className="card-content">
            <h3>Practice Streak</h3>
            <div className="card-value">{analyticsData.practiceStreak.current}</div>
            <div className="card-subtitle">
              Best: {analyticsData.practiceStreak.longest} days
            </div>
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="analytics-section">
        <h3>Performance Over Time</h3>
        <div className="performance-chart">
          {analyticsData.recentActivity.length > 0 ? (
            <div className="chart-container">
              {analyticsData.recentActivity.map((activity) => (
                <div key={activity.date} className="chart-bar">
                  <div 
                    className="bar-fill"
                    style={{ 
                      height: `${activity.averageScore}%`,
                      backgroundColor: activity.averageScore >= 70 ? '#10b981' : 
                                     activity.averageScore >= 50 ? '#f59e0b' : '#ef4444'
                    }}
                  />
                  <div className="bar-label">
                    <div className="bar-date">{formatDate(activity.date)}</div>
                    <div className="bar-score">{Math.round(activity.averageScore)}%</div>
                    <div className="bar-sessions">{activity.sessionsCount} sessions</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-chart-data">
              <p>No recent activity to display</p>
            </div>
          )}
        </div>
      </div>

      {/* Category Performance */}
      <div className="analytics-section">
        <h3>Performance by Category</h3>
        <div className="category-performance">
          {analyticsData.categoryPerformance.length > 0 ? (
            analyticsData.categoryPerformance.map(category => (
              <div key={category.category} className="category-item">
                <div className="category-header">
                  <span className="category-name">
                    {category.category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                  <span className={`category-score ${getScoreColor(category.averageScore)}`}>
                    {Math.round(category.averageScore)}%
                  </span>
                </div>
                <div className="category-progress">
                  <div 
                    className="progress-fill"
                    style={{ width: `${category.averageScore}%` }}
                  />
                </div>
                <div className="category-sessions">
                  {category.sessionCount} sessions
                </div>
              </div>
            ))
          ) : (
            <div className="no-category-data">
              <p>No category data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="analytics-section">
        <h3>Recent Sessions</h3>
        <div className="recent-sessions">
          {filteredHistory.length > 0 ? (
            <div className="sessions-list">
              {filteredHistory.slice(0, 10).map(session => (
                <div key={session.sessionId} className="session-item">
                  <div className="session-date">
                    {new Date(session.startTime).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  <div className="session-details">
                    <div className="session-questions">
                      {session.questionsAnswered} questions
                    </div>
                    <div className="session-duration">
                      {formatTime(session.duration)}
                    </div>
                  </div>
                  <div className={`session-score ${getScoreColor(session.overallScore)}`}>
                    {Math.round(session.overallScore)}%
                  </div>
                  <div className={`session-status status-${session.status}`}>
                    {session.status}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-sessions">
              <p>No sessions in the selected time range</p>
            </div>
          )}
        </div>
      </div>

      {/* Insights */}
      <div className="analytics-section">
        <h3>Insights & Recommendations</h3>
        <div className="insights-container">
          {analyticsData.improvementTrend > 10 && (
            <div className="insight-item positive">
              <div className="insight-icon">🎉</div>
              <div className="insight-content">
                <h4>Great Progress!</h4>
                <p>Your performance has improved by {analyticsData.improvementTrend.toFixed(1)}% recently. Keep up the excellent work!</p>
              </div>
            </div>
          )}

          {analyticsData.practiceStreak.current >= 7 && (
            <div className="insight-item positive">
              <div className="insight-icon">🔥</div>
              <div className="insight-content">
                <h4>Streak Master!</h4>
                <p>You've maintained a {analyticsData.practiceStreak.current}-day practice streak. Consistency is key to improvement!</p>
              </div>
            </div>
          )}

          {analyticsData.averageScore < 60 && (
            <div className="insight-item warning">
              <div className="insight-icon">💡</div>
              <div className="insight-content">
                <h4>Focus on Fundamentals</h4>
                <p>Consider practicing with easier questions to build confidence and foundational skills.</p>
              </div>
            </div>
          )}

          {analyticsData.totalSessions < 5 && (
            <div className="insight-item info">
              <div className="insight-icon">📚</div>
              <div className="insight-content">
                <h4>Keep Practicing</h4>
                <p>You're just getting started! Regular practice sessions will help you see significant improvement.</p>
              </div>
            </div>
          )}

          {analyticsData.categoryPerformance.length > 0 && (
            (() => {
              const weakestCategory = analyticsData.categoryPerformance
                .reduce((min, cat) => cat.averageScore < min.averageScore ? cat : min);
              
              if (weakestCategory.averageScore < 70) {
                return (
                  <div className="insight-item warning">
                    <div className="insight-icon">🎯</div>
                    <div className="insight-content">
                      <h4>Improvement Opportunity</h4>
                      <p>
                        Your {weakestCategory.category.replace('-', ' ')} skills could use some work. 
                        Consider focusing your next few sessions on this area.
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            })()
          )}
        </div>
      </div>
    </div>
  );
};

// Compact analytics widget for dashboard
interface AnalyticsWidgetProps {
  userId: string;
  persistenceService: SessionPersistenceService;
  className?: string;
}

export const AnalyticsWidget: React.FC<AnalyticsWidgetProps> = ({
  userId,
  persistenceService,
  className = ''
}) => {
  const [data, setData] = useState<{
    totalSessions: number;
    averageScore: number;
    streak: number;
    lastSession?: Date;
  } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const analytics = await persistenceService.getSessionAnalytics(userId);
        const history = await persistenceService.getSessionHistory(userId, 1);
        
        setData({
          totalSessions: analytics.totalSessions,
          averageScore: analytics.averageScore,
          streak: 0, // Would need to get from scheduling service
          lastSession: history.length > 0 ? new Date(history[0].startTime) : undefined
        });
      } catch (error) {
        console.error('Failed to load analytics widget data:', error);
      }
    };

    loadData();
  }, [userId, persistenceService]);

  if (!data) {
    return (
      <div className={`analytics-widget ${className}`}>
        <div className="widget-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className={`analytics-widget ${className}`}>
      <h3>Your Progress</h3>
      
      <div className="widget-stats">
        <div className="widget-stat">
          <span className="stat-value">{data.totalSessions}</span>
          <span className="stat-label">Sessions</span>
        </div>
        
        <div className="widget-stat">
          <span className={`stat-value ${data.averageScore >= 70 ? 'good' : data.averageScore >= 50 ? 'fair' : 'poor'}`}>
            {Math.round(data.averageScore)}%
          </span>
          <span className="stat-label">Avg Score</span>
        </div>
        
        <div className="widget-stat">
          <span className="stat-value">{data.streak}</span>
          <span className="stat-label">Day Streak</span>
        </div>
      </div>
      
      {data.lastSession && (
        <div className="widget-last-session">
          Last practice: {data.lastSession.toLocaleDateString()}
        </div>
      )}
    </div>
  );
};