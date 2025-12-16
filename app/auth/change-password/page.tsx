"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

export default function ChangePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
        toast.error("Passwords do not match");
        return;
    }
    
    setLoading(true);
    try {
        const res = await fetch("/api/auth/change-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ newPassword: password })
        });
        
        const json = await res.json();
        
        if (res.ok) {
            toast.success("Password changed successfully. Please login again.");
            setTimeout(() => {
                signOut({ callbackUrl: "/auth/login" });
            }, 1500);
        } else {
            toast.error(json.error || "Failed to update password");
        }
    } catch (e) {
        toast.error("An error occurred");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                    <Lock className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Change Password</h2>
                <p className="text-gray-500 text-sm mt-2">
                    For security reasons, you act is required to change your temporary password.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <input 
                        type="password" 
                        required 
                        minLength={8}
                        className="w-full border-gray-300 rounded-lg p-2.5 border focus:ring-2 focus:ring-blue-500 outline-none"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                    <input 
                        type="password" 
                        required 
                        minLength={8}
                        className="w-full border-gray-300 rounded-lg p-2.5 border focus:ring-2 focus:ring-blue-500 outline-none"
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                    />
                </div>
                
                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition flex items-center justify-center"
                >
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Update Password
                </button>
            </form>
        </div>
    </div>
  );
}
