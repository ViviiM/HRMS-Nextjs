"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { KPIStats } from "./components/kpi-stats"
import { QuickActions } from "./components/quick-actions"
import { StatsOverview } from "./components/stats-overview"
import { ChartSection } from "./components/chart-section"
import { RecentActivities } from "./components/recent-activities"
import { Users, Calendar as CalendarClock, Clock, Award } from "lucide-react"

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<any>({
      totalEmployees: 0,
      activeLeaves: 0,
      pendingApprovals: 0,
      availableAssets: 0
  });
  
  const [chartData, setChartData] = useState({
      departmentData: [],
      leaveData: [],
      trainingData: []
  });

  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Default Stats Structure for UI (mapped from state)
  const currentKpiStats = [
    { title: "Total Employees", value: stats.totalEmployees, trend: 0, icon: Users, color: "blue" as const },
    { title: "Active Leaves", value: stats.activeLeaves, trend: 0, icon: CalendarClock, color: "amber" as const },
    { title: "Pending Approvals", value: stats.pendingApprovals, trend: 0, icon: Clock, color: "red" as const },
    { title: "Available Assets", value: stats.availableAssets, trend: 0, icon: Award, color: "green" as const },
  ];

  useEffect(() => {
    fetch('/api/dashboard/stats')
        .then(res => res.json())
        .then(data => {
            if(data.success) {
                const { totalEmployees, activeLeaves, pendingApprovals, availableAssets, departmentData, leaveData, trainingData, recentActivities } = data.data;
                
                setStats({ totalEmployees, activeLeaves, pendingApprovals, availableAssets });
                setChartData({ departmentData, leaveData, trainingData });
                
                // Map recent activities icons
                const validActivities = recentActivities.map((act: any) => {
                    let icon = Clock;
                    let color = 'blue';
                    if(act.type.includes('leave')) { icon = CalendarClock; color='amber'; }
                    else if(act.type.includes('training')) { icon = Award; color='blue'; }
                    else if(act.type.includes('employee')) { icon = Users; color='green'; }
                    
                    return { ...act, icon, color };
                });
                setActivities(validActivities);
            }
            setLoading(false);
        })
        .catch(err => {
            setLoading(false);
            console.error(err);
        });

  }, [router])

  // Process Stats Overview Data
  const topDepts = [...chartData.departmentData]
      .sort((a: any, b: any) => b.employees - a.employees)
      .slice(0, 3)
      .map((d: any) => ({ label: d.name, value: d.employees.toString(), sublabel: "Employees" }));

  // Mock Attendance (since no source yet)
  const attendanceStats = [
      { label: "On Time", value: "92%" },
      { label: "Late", value: "5%" },
      { label: "Absent", value: "3%" }
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">Dashboard Overview</h1>
          <p className="text-slate-500 text-lg">Welcome back! Here's what's happening in your organization today.</p>
        </div>

        {/* KPI Cards */}
        {loading ? (
            <div className="flex gap-4 mb-8">
               {[1,2,3,4].map(i => <div key={i} className="h-32 flex-1 bg-gray-200 animate-pulse rounded-xl"></div>)}
            </div>
        ) : (
            <KPIStats stats={currentKpiStats} />
        )}

        {/* Charts */}
        <div className="mt-8">
            <ChartSection 
                departmentData={chartData.departmentData} 
                leaveData={chartData.leaveData} 
                trainingData={chartData.trainingData} 
            />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          <div className="lg:col-span-2 space-y-8">
            <QuickActions />
            <RecentActivities activities={activities} />
          </div>
          <div>
            <StatsOverview stats={[
                {
                    title: "Attendance",
                    items: attendanceStats
                },
                {
                    title: "Top Depts",
                    items: topDepts.length > 0 ? topDepts : [{ label: "No Data", value: "0" }]
                }
            ]} />
          </div>
        </div>
    </div>
  )
}
