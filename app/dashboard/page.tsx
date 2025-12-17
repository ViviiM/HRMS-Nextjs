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
  const [loading, setLoading] = useState(true);

  // Default Stats Structure for UI (mapped from state)
  const currentKpiStats = [
    { title: "Total Employees", value: stats.totalEmployees, trend: 0, icon: Users, color: "blue" as const },
    { title: "Active Leaves", value: stats.activeLeaves, trend: 0, icon: CalendarClock, color: "amber" as const },
    { title: "Pending Approvals", value: stats.pendingApprovals, trend: 0, icon: Clock, color: "red" as const },
    { title: "Available Assets", value: stats.availableAssets, trend: 0, icon: Award, color: "green" as const },
  ];

  useEffect(() => {
    // if (!getAuthToken()) {
    //   router.push("/auth/login")
    // }
    
    fetch('/api/dashboard/stats')
        .then(res => {
          return res.json()
        })
        .then(data => {
          console.log(data);
            if(data.success) setStats(data.data);
            setLoading(false);
        })
        .catch(err => {
            setLoading(false);
            console.log(err);
        });

  }, [router])

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
            <ChartSection />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          <div className="lg:col-span-2 space-y-8">
            <QuickActions />
            <RecentActivities activities={[
                { id: '1', type: 'leave', message: 'John Doe applied for sick leave', timestamp: '2 hours ago', icon: Clock, color: 'amber' },
                { id: '2', type: 'training', message: 'Sarah enrolled in React Advanced', timestamp: '4 hours ago', icon: Award, color: 'blue' },
                { id: '3', type: 'employee', message: 'New employee Mike joined Design', timestamp: '1 day ago', icon: Users, color: 'green' },
            ]} />
          </div>
          <div>
            <StatsOverview stats={[
                {
                    title: "Attendance",
                    items: [
                        { label: "On Time", value: "92%" },
                        { label: "Late", value: "5%" },
                        { label: "Absent", value: "3%" }
                    ]
                },
                {
                    title: "Top Depts",
                    items: [
                        { label: "Engineering", value: "45", sublabel: "Employees" },
                        { label: "Sales", value: "28", sublabel: "Employees" },
                        { label: "HR", value: "8", sublabel: "Employees" }
                    ]
                }
            ]} />
          </div>
        </div>
    </div>
  )
}
