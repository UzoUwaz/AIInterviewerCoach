import { 
  JobApplication, 
  ApplicationStatus, 
  ApplicationAnalytics,
  CoachingInsight,
  IndustryStats,
  SalaryTrend,
  MonthlyStats,
  SalaryRange
} from '../types';
import { JobApplicationModel } from './JobApplication';

export class ApplicationTracker {
  private applications: JobApplicationModel[] = [];

  constructor(applications: JobApplication[] = []) {
    this.applications = applications.map(app => 
      app instanceof JobApplicationModel ? app : JobApplicationModel.fromJSON(app)
    );
  }

  // Application management
  addApplication(application: JobApplication): JobApplicationModel {
    const appModel = application instanceof JobApplicationModel 
      ? application 
      : new JobApplicationModel(application);
    
    this.applications.push(appModel);
    return appModel;
  }

  getApplication(applicationId: string): JobApplicationModel | null {
    return this.applications.find(app => app.id === applicationId) || null;
  }

  updateApplication(applicationId: string, updates: Partial<JobApplication>): void {
    const app = this.getApplication(applicationId);
    if (!app) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    Object.assign(app, updates);
    app.validate();
  }

  removeApplication(applicationId: string): void {
    const index = this.applications.findIndex(app => app.id === applicationId);
    if (index !== -1) {
      this.applications.splice(index, 1);
    }
  }

  getAllApplications(): JobApplicationModel[] {
    return [...this.applications];
  }

  getApplicationsByStatus(status: ApplicationStatus): JobApplicationModel[] {
    return this.applications.filter(app => app.status === status);
  }

  getActiveApplications(): JobApplicationModel[] {
    return this.applications.filter(app => app.isActive());
  }

  getCompletedApplications(): JobApplicationModel[] {
    return this.applications.filter(app => app.isCompleted());
  }

  // Analytics methods
  generateAnalytics(): ApplicationAnalytics {
    const total = this.applications.length;
    const responseRate = this.calculateResponseRate();
    const interviewRate = this.calculateInterviewRate();
    const offerRate = this.calculateOfferRate();
    const averageResponseTime = this.calculateAverageTimeToResponse();
    const industryBreakdown = this.getIndustryBreakdown();
    const salaryTrends = this.getSalaryTrends();
    const monthlyStats = this.getMonthlyStats();

    return {
      totalApplications: total,
      responseRate,
      interviewRate,
      offerRate,
      averageResponseTime,
      topIndustries: industryBreakdown,
      salaryTrends,
      applicationsByMonth: monthlyStats
    };
  }



  private calculateResponseRate(): number {
    if (this.applications.length === 0) return 0;
    const responded = this.applications.filter(app => 
      app.status !== 'applied'
    ).length;
    return Math.round((responded / this.applications.length) * 100);
  }

  private calculateInterviewRate(): number {
    if (this.applications.length === 0) return 0;
    const interviewed = this.applications.filter(app => 
      app.status === 'interviewing' || app.interviewStages.length > 0
    ).length;
    return Math.round((interviewed / this.applications.length) * 100);
  }

  private calculateOfferRate(): number {
    if (this.applications.length === 0) return 0;
    const offers = this.applications.filter(app => app.status === 'offer').length;
    return Math.round((offers / this.applications.length) * 100);
  }

  private calculateSuccessRate(): number {
    const completed = this.getCompletedApplications();
    if (completed.length === 0) return 0;

    const successful = completed.filter(app => app.wasSuccessful()).length;
    return Math.round((successful / completed.length) * 100);
  }

  private calculateAverageTimeToResponse(): number {
    const completedApps = this.getCompletedApplications();
    if (completedApps.length === 0) return 0;

    const totalDays = completedApps.reduce((sum, app) => sum + app.getDaysInProcess(), 0);
    return Math.round(totalDays / completedApps.length);
  }

  private getIndustryBreakdown(): IndustryStats[] {
    const industryMap = new Map<string, { count: number; successful: number }>();

    this.applications.forEach(app => {
      const industry = app.getIndustry();
      const current = industryMap.get(industry) || { count: 0, successful: 0 };
      
      current.count++;
      if (app.wasSuccessful()) {
        current.successful++;
      }
      
      industryMap.set(industry, current);
    });

    return Array.from(industryMap.entries()).map(([industry, stats]) => ({
      industry,
      count: stats.count,
      successRate: stats.count > 0 ? Math.round((stats.successful / stats.count) * 100) : 0
    }));
  }

  private getSalaryTrends(): SalaryTrend[] {
    const salaryRanges = new Map<string, { ranges: SalaryRange[]; successful: number }>();

    this.applications
      .filter(app => app.salaryRange)
      .forEach(app => {
        const rangeKey = `${Math.floor(app.salaryRange!.min / 10000) * 10000}-${Math.floor(app.salaryRange!.max / 10000) * 10000}`;
        const current = salaryRanges.get(rangeKey) || { ranges: [], successful: 0 };
        
        current.ranges.push(app.salaryRange!);
        if (app.wasSuccessful()) {
          current.successful++;
        }
        
        salaryRanges.set(rangeKey, current);
      });

    return Array.from(salaryRanges.entries()).map(([, data]) => {
      const avgRange = data.ranges.reduce((acc, range) => ({
        min: acc.min + range.min,
        max: acc.max + range.max,
        currency: range.currency,
        period: range.period
      }), { min: 0, max: 0, currency: 'USD', period: 'yearly' as const });

      return {
        range: {
          min: Math.round(avgRange.min / data.ranges.length),
          max: Math.round(avgRange.max / data.ranges.length),
          currency: avgRange.currency,
          period: avgRange.period
        },
        count: data.ranges.length,
        successRate: data.ranges.length > 0 ? Math.round((data.successful / data.ranges.length) * 100) : 0
      };
    });
  }

  private getMonthlyStats(): MonthlyStats[] {
    const monthlyData = new Map<string, { 
      applications: number; 
      offers: number; 
      interviews: number;
    }>();

    this.applications.forEach(app => {
      const monthKey = `${app.applicationDate.getFullYear()}-${String(app.applicationDate.getMonth() + 1).padStart(2, '0')}`;
      const current = monthlyData.get(monthKey) || { 
        applications: 0, 
        offers: 0, 
        interviews: 0 
      };

      current.applications++;
      
      if (app.status === 'offer') current.offers++;
      if (app.status === 'interviewing' || app.interviewStages.length > 0) current.interviews++;

      monthlyData.set(monthKey, current);
    });

    return Array.from(monthlyData.entries()).map(([month, stats]) => ({
      month,
      applications: stats.applications,
      interviews: stats.interviews,
      offers: stats.offers
    }));
  }



  private getAverageSalaryRange(): { min: number; max: number; currency: string } | null {
    const salaryApps = this.applications.filter(app => app.salaryRange);
    if (salaryApps.length === 0) return null;

    const totalMin = salaryApps.reduce((sum, app) => sum + app.salaryRange!.min, 0);
    const totalMax = salaryApps.reduce((sum, app) => sum + app.salaryRange!.max, 0);

    return {
      min: Math.round(totalMin / salaryApps.length),
      max: Math.round(totalMax / salaryApps.length),
      currency: salaryApps[0].salaryRange!.currency
    };
  }

  private getMostCommonRoles(): Array<{ role: string; count: number; averageSalary?: number }> {
    const roleMap = new Map<string, { count: number; salaries: number[] }>();

    this.applications.forEach(app => {
      const current = roleMap.get(app.position) || { count: 0, salaries: [] };
      current.count++;
      
      if (app.salaryRange) {
        const avgSalary = (app.salaryRange.min + app.salaryRange.max) / 2;
        current.salaries.push(avgSalary);
      }
      
      roleMap.set(app.position, current);
    });

    return Array.from(roleMap.entries())
      .map(([role, stats]) => ({
        role,
        count: stats.count,
        averageSalary: stats.salaries.length > 0 
          ? Math.round(stats.salaries.reduce((sum, sal) => sum + sal, 0) / stats.salaries.length)
          : undefined
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }



  // Coaching insights
  generateCoachingInsights(): CoachingInsight[] {
    const insights: CoachingInsight[] = [];
    const analytics = this.generateAnalytics();

    // Success rate insights
    const successRate = this.calculateSuccessRate();
    if (successRate < 10) {
      insights.push({
        type: 'warning',
        category: 'applications',
        title: 'Low Success Rate',
        description: 'Your current success rate is below average. Consider refining your application strategy.',
        actionItems: [
          'Review and improve your resume',
          'Tailor applications more specifically to job requirements',
          'Practice interview skills with mock sessions'
        ],
        priority: 'high'
      });
    }

    // Application volume insights
    if (analytics.totalApplications < 10) {
      insights.push({
        type: 'recommendation',
        category: 'applications',
        title: 'Increase Application Volume',
        description: 'Consider applying to more positions to increase your chances.',
        actionItems: [
          'Set a goal to apply to 5-10 positions per week',
          'Use job search platforms more actively',
          'Network with professionals in your target industry'
        ],
        priority: 'medium'
      });
    }

    // Industry focus insights
    const industryStats = analytics.topIndustries;
    if (industryStats.length > 5) {
      insights.push({
        type: 'recommendation',
        category: 'market',
        title: 'Consider Industry Focus',
        description: 'You\'re applying across many industries. Focusing on 2-3 industries might improve success rates.',
        actionItems: [
          'Identify your top 3 target industries',
          'Tailor your resume for each industry',
          'Build industry-specific knowledge and network'
        ],
        priority: 'medium'
      });
    }

    // Interview performance insights
    const interviewingApps = this.getApplicationsByStatus('interviewing');
    const rejectedAfterInterview = this.applications.filter(app => 
      app.status === 'rejected' && app.interviewStages.length > 0
    );

    if (rejectedAfterInterview.length > interviewingApps.length) {
      insights.push({
        type: 'warning',
        category: 'interviews',
        title: 'Interview Performance Needs Improvement',
        description: 'You\'re getting interviews but not converting them to offers. Focus on interview preparation.',
        actionItems: [
          'Practice common interview questions',
          'Improve your STAR method responses',
          'Work on technical interview skills if applicable',
          'Request feedback from recent interviews'
        ],
        priority: 'high'
      });
    }

    // Salary insights
    const avgSalary = this.getAverageSalaryRange();
    if (avgSalary) {
      const marketRate = this.getMarketRateForRoles();
      if (avgSalary.max < marketRate * 0.9) {
        insights.push({
          type: 'recommendation',
          category: 'market',
          title: 'Salary Expectations May Be Low',
          description: 'Your target salary range appears to be below market rate.',
          actionItems: [
            'Research current market rates for your roles',
            'Consider negotiating higher salaries',
            'Highlight your unique value proposition'
          ],
          priority: 'low'
        });
      }
    }

    return insights;
  }

  private getMarketRateForRoles(): number {
    // Simplified market rate calculation
    // In a real implementation, this would use external salary data
    const commonRoles = this.getMostCommonRoles();
    if (commonRoles.length === 0) return 75000; // Default estimate

    const avgSalaries = commonRoles
      .filter(role => role.averageSalary)
      .map(role => role.averageSalary!);

    if (avgSalaries.length === 0) return 75000;

    return avgSalaries.reduce((sum, sal) => sum + sal, 0) / avgSalaries.length;
  }

  // Utility methods
  getApplicationsInDateRange(startDate: Date, endDate: Date): JobApplicationModel[] {
    return this.applications.filter(app => 
      app.applicationDate >= startDate && app.applicationDate <= endDate
    );
  }

  searchApplications(query: string): JobApplicationModel[] {
    const queryLower = query.toLowerCase();
    return this.applications.filter(app => 
      app.company.toLowerCase().includes(queryLower) ||
      app.position.toLowerCase().includes(queryLower) ||
      app.jobDescription.toLowerCase().includes(queryLower)
    );
  }

  getApplicationsByCompany(company: string): JobApplicationModel[] {
    return this.applications.filter(app => 
      app.company.toLowerCase() === company.toLowerCase()
    );
  }

  getApplicationsByPosition(position: string): JobApplicationModel[] {
    return this.applications.filter(app => 
      app.position.toLowerCase().includes(position.toLowerCase())
    );
  }

  // Export/Import methods
  exportData(): any {
    return {
      applications: this.applications.map(app => app.toJSON()),
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
  }

  importData(data: any): void {
    if (!data.applications || !Array.isArray(data.applications)) {
      throw new Error('Invalid import data format');
    }

    this.applications = data.applications.map((appData: any) => 
      JobApplicationModel.fromJSON(appData)
    );
  }

  // Statistics methods
  getStatistics(): {
    total: number;
    active: number;
    completed: number;
    successRate: number;
    averageTimeToResponse: number;
    thisMonth: number;
    lastMonth: number;
  } {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    return {
      total: this.applications.length,
      active: this.getActiveApplications().length,
      completed: this.getCompletedApplications().length,
      successRate: this.calculateSuccessRate(),
      averageTimeToResponse: this.calculateAverageTimeToResponse(),
      thisMonth: this.getApplicationsInDateRange(thisMonth, now).length,
      lastMonth: this.getApplicationsInDateRange(lastMonth, lastMonthEnd).length
    };
  }
}