"use client";

import React, { useEffect, useState, useRef } from "react";
import { Tour, FloatButton, Modal, Button } from "antd";
import type { TourProps } from "antd";
import { HelpCircle, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export function TourGuide() {
  const [open, setOpen] = useState(false);
  const [hasSeenTour, setHasSeenTour] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const router = useRouter();

  // Check tour status on mount
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch("/api/user/tour-status");
        if (res.ok) {
          const data = await res.json();
          setHasSeenTour(data.hasSeenTour);
          if (data.hasSeenTour === false) {
             // Delay slightly to ensure elements are mounted
             setTimeout(() => setOpen(true), 1500);
          }
        }
      } catch (e) {
        console.error("Failed to check tour status", e);
      }
    }
    checkStatus();
  }, []);

  const handleClose = async () => {
    setOpen(false);
    // Update status
    if (!hasSeenTour) {
        try {
            await fetch("/api/user/tour-status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ hasSeenTour: true }),
            });
            setHasSeenTour(true);
        } catch (e) {
            console.error("Failed to update tour status", e);
        }
    }
  };

  const handleFinish = () => {
    handleClose();
    setShowCelebration(true);
  };

  const steps: TourProps['steps'] = [
    {
      title: "Quick Find",
      description: "Need a document or an employee's contact? Use the global search to find files, policies, or team members instantly.",
      target: () => document.getElementById("tour-search-bar") as HTMLElement,
    },
    {
      title: "Stay Updated",
      description: "Check the bell icon for alerts on leave approvals, pending training modules, or company-wide announcements.",
      target: () => document.getElementById("tour-notifications") as HTMLElement,
    },
    {
      title: "Personal Settings",
      description: "Click here to update your personal details under My Profile or securely Sign Out of the session.",
      target: () => document.getElementById("tour-profile") as HTMLElement,
    },
    {
      title: "Your Daily Overview",
      description: "This is your home base. View your upcoming tasks, company news, and a snapshot of your HR status.",
      target: () => document.getElementById("tour-dashboard") as HTMLElement,
    },
    {
        title: "The Directory",
        description: "Browse your team, view reporting lines, and find colleague information across the organization.",
        target: () => document.getElementById("tour-employees") as HTMLElement,
    },
    {
        title: "Time Off Management",
        description: "Request vacation days, check your remaining balance, and track the status of your leave history.",
        target: () => document.getElementById("tour-leaves") as HTMLElement,
    },
    {
        title: "Earnings & Tax",
        description: "Access your monthly payslips, download tax documents.",
        target: () => document.getElementById("tour-payroll") as HTMLElement,
    },
    {
        title: "Company Property",
        description: "View the hardware assigned to you and report any issues or requests.",
        target: () => document.getElementById("tour-assets") as HTMLElement,
    },
    {
        title: "Skill Development",
        description: "Enroll in new courses, complete mandatory compliance training, and track your certifications.",
        target: () => document.getElementById("tour-training") as HTMLElement,
    },
    {
        title: "Compliance & Rules",
        description: "Read and digitally sign your non-disclosure agreements and stay up to date with the latest company policies.",
        target: () => document.getElementById("tour-nda-policies") as HTMLElement,
    },
    {
        title: "Events & Deadlines",
        description: "View company holidays, team birthdays, and important HR deadlines in one place.",
        target: () => document.getElementById("tour-calendar") as HTMLElement,
    },
  ];

  return (
    <>
      <Tour
        open={open}
        onClose={handleClose}
        steps={steps}
        onFinish={handleFinish}
        indicatorsRender={(current, total) => (
          <span>
            {current + 1} / {total}
          </span>
        )}
      />

      {/* Floating Help Button */}
      <FloatButton
        icon={<HelpCircle size={20} />}
        type="primary"
        style={{ right: 24, bottom: 24 }}
        tooltip="Restart Tour"
        onClick={() => setOpen(true)}
      />

      {/* Completion Celebration Modal */}
      <Modal
        open={showCelebration}
        footer={null}
        onCancel={() => setShowCelebration(false)}
        centered
        className="text-center"
      >
        <div className="flex flex-col items-center justify-center p-6 space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
                <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">You're all set!</h2>
            <p className="text-slate-600">
                You've completed the tour. Use the Help Center if you need any assistance in the future.
            </p>
            <Button type="primary" size="large" onClick={() => setShowCelebration(false)} className="bg-cyan-600 hover:bg-cyan-700 w-full mt-4">
                Get Started
            </Button>
            <div className="text-xs text-slate-400 mt-2">
                <a href="/help" className="underline hover:text-cyan-600">Visit Help Center</a>
            </div>
        </div>
      </Modal>
    </>
  );
}
