"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { User, Mail, Phone, MapPin, Calendar, Briefcase, Award, FileText } from "lucide-react"
import BankDetailsForm from "./bank-details-form"
import Image from "next/image"

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("personal")

  // Mock user data
  const user = {
    name: "Vivek Miskin",
    role: "Senior Developer",
    department: "Engineering",
    email: "vivek.miskin@example.com",
    phone: "+1 234 567 890",
    location: "Bangalore, India",
    joinDate: "Jan 15, 2023",
    employeeId: "EMP-2023-001"
  }

  const tabs = [
    { id: "personal", label: "Personal Info" },
    { id: "bank", label: "Bank Details" },
    { id: "documents", label: "Documents" },
  ]

  return (
    <div className="space-y-6">
      {/* Header Profile Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-bl-full -z-0 opacity-50"></div>

        <div className="relative z-10 w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white shadow-lg overflow-hidden shrink-0">
          <Image 
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" 
            alt={user.name}
            fill
            className="object-cover"
          />
        </div>

        <div className="flex-1 text-center md:text-left z-10">
          <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
          <p className="text-gray-500 font-medium">{user.role} • {user.department}</p>
          
          <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-4">
            <div className="flex items-center text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full">
              <Mail className="w-4 h-4 mr-2 text-blue-500" />
              {user.email}
            </div>
            <div className="flex items-center text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full">
              <Phone className="w-4 h-4 mr-2 text-green-500" />
              {user.phone}
            </div>
            <div className="flex items-center text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full">
              <MapPin className="w-4 h-4 mr-2 text-red-500" />
              {user.location}
            </div>
          </div>
        </div>

        <div className="absolute top-6 right-6 z-10 hidden md:block text-right">
             <div className="text-sm text-gray-400 font-medium">Employee ID</div>
             <div className="text-lg font-bold text-gray-700 font-mono">{user.employeeId}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === "personal" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-blue-500" /> Work Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                     <div>
                        <span className="block text-xs font-medium text-gray-500 uppercase">Department</span>
                        <span className="block text-gray-900 mt-1">{user.department}</span>
                     </div>
                     <div>
                        <span className="block text-xs font-medium text-gray-500 uppercase">Role</span>
                        <span className="block text-gray-900 mt-1">{user.role}</span>
                     </div>
                     <div>
                        <span className="block text-xs font-medium text-gray-500 uppercase">Joining Date</span>
                        <span className="block text-gray-900 mt-1 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" /> {user.joinDate}
                        </span>
                     </div>
                </div>

                <div className="border-t border-gray-100 my-6"></div>

                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-500" /> Skills & Experience
                </h3>
                <div className="flex flex-wrap gap-2">
                    {["React", "Next.js", "TypeScript", "Node.js", "UI/UX Design"].map((skill) => (
                        <span key={skill} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium border border-blue-100">
                            {skill}
                        </span>
                    ))}
                </div>
            </div>
        )}

        {activeTab === "bank" && (
            <BankDetailsForm />
        )}

        {activeTab === "documents" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No Documents Uploaded</h3>
                <p className="mt-1">Upload your PAN, Aadhar, and other documents here.</p>
                <button className="mt-4 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-xs text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    Upload Document
                </button>
            </div>
        )}
      </motion.div>
    </div>
  )
}
