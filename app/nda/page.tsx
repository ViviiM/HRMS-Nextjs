"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { NDATable } from "./components/nda-table"
import type { NDA } from "@/types"
import { Tabs, message } from 'antd';

const mockNDAs: NDA[] = [
  {
    id: "1",
    employeeId: "1",
    employeeName: "John Doe",
    templateId: "T-001",
    signDate: "2021-03-15",
    expiryDate: "2026-03-15",
    status: "signed",
    documentUrl: "https://example.com/nda/1.pdf",
  }
]

export default function NDAPage() {
  const router = useRouter()
  const [ndas, setNDAs] = useState<NDA[]>([])
  const [activeTab, setActiveTab] = useState<string>("all")

  useEffect(() => {
    // Auth handled by middleware/layout
    
    // Fetch Real NDAs
    const fetchNDAs = async () => {
        try {
            const res = await fetch('/api/nda');
            const json = await res.json();
            if(json.success && json.data.length > 0) {
                setNDAs(json.data);
            } else {
                setNDAs(mockNDAs); // Fallback to mock if empty (dev purposes) or if API fails
            }
        } catch(e) {
            console.error(e);
            setNDAs(mockNDAs); // Fallback
        }
    };
    fetchNDAs();

  }, [router])

  const getFilteredNDAs = (status: string) => {
      if (status === 'all') return ndas;
      return ndas.filter(n => n.status === status);
  }

  const handleDownload = (nda: NDA) => {
    console.log("[v0] Downloading NDA for", nda.employeeName)
    message.success(`Downloading NDA for ${nda.employeeName}`)
  }

  const pendingCount = ndas.filter((n) => n.status === "pending").length
  const signedCount = ndas.filter((n) => n.status === "signed").length
  const expiredCount = ndas.filter((n) => n.status === "expired").length

  const items = [
    { key: 'all', label: 'All NDAs', children: <NDATable ndas={getFilteredNDAs('all')} onDownload={handleDownload} /> },
    { key: 'pending', label: `Pending (${pendingCount})`, children: <NDATable ndas={getFilteredNDAs('pending')} onDownload={handleDownload} /> },
    { key: 'signed', label: `Signed (${signedCount})`, children: <NDATable ndas={getFilteredNDAs('signed')} onDownload={handleDownload} /> },
    { key: 'expired', label: `Expired (${expiredCount})`, children: <NDATable ndas={getFilteredNDAs('expired')} onDownload={handleDownload} /> },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">NDA Management</h1>
          <p className="text-slate-500 mt-1">Manage employee NDAs and confidentiality agreements</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
            <div className="text-sm font-medium text-slate-500 mb-2">Pending Signatures</div>
            <div className="text-3xl font-bold text-amber-600">{pendingCount}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
            <div className="text-sm font-medium text-slate-500 mb-2">Signed</div>
            <div className="text-3xl font-bold text-emerald-600">{signedCount}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
            <div className="text-sm font-medium text-slate-500 mb-2">Expired</div>
            <div className="text-3xl font-bold text-rose-600">{expiredCount}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <Tabs defaultActiveKey="all" items={items} onChange={setActiveTab} />
        </div>
    </div>
  )
}
