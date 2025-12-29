
"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Check, X, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { Popover, Badge, Button, Empty, Spin, message, Tooltip, Tag, Divider, Avatar } from "antd";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

interface Notification {
    Id: string;
    Subject: string;
    Message: string;
    Type: string;
    IsRead: boolean;
    ActionRequired: boolean;
    Status: string;
    CreatedDate: string;
    RelatedRecordId?: string;
    ActionTaken?: string;
}

export function NotificationDropdown() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);
    
    // Polling or initial fetch
    const fetchNotifications = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await fetch("/api/notifications");
            const json = await res.json();
            if (json.success) {
                setNotifications(json.data);
                setUnreadCount(json.data.filter((n: Notification) => !n.IsRead).length);
            }
        } catch (error) {
            console.error(error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        // Initial fetch
        fetchNotifications();
        
        // Poll every 60 seconds (simple realtime substitute)
        const interval = setInterval(() => fetchNotifications(true), 60000);
        return () => clearInterval(interval);
    }, []);

    const markAsRead = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.Id === id ? { ...n, IsRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
        
        try {
            await fetch(`/api/notifications/${id}/read`, { method: "PUT" });
        } catch (e) {
            console.error("Failed to mark read", e);
        }
    };

    const markAllRead = async () => {
        const unreadIds = notifications.filter(n => !n.IsRead).map(n => n.Id);
        if (unreadIds.length === 0) return;

        setNotifications(prev => prev.map(n => ({ ...n, IsRead: true })));
        setUnreadCount(0);

        try {
            await fetch("/api/notifications/read-all", { method: "PUT" });
        } catch (e) {
            console.error(e);
        }
    };

    const handleAction = async (id: string, action: 'Approved' | 'Rejected', comments?: string) => {
        // Optimistic update status
        setNotifications(prev => prev.map(n => n.Id === id ? { ...n, Status: 'Actioned', ActionTaken: action, IsRead: true } : n));
        
        try {
            const res = await fetch(`/api/notifications/${id}/action`, { 
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, comments })
            });
            const json = await res.json();
            if (!json.success) {
                message.error(json.error || "Action failed");
                // Revert? (Complex, assumes success usually)
                fetchNotifications(true); // Re-fetch to correct state
            } else {
                message.success(`Request ${action}`);
            }
        } catch (e) {
            message.error("Network error");
        }
    };

    const content = (
        <div className="w-[380px] sm:w-[420px] max-h-[80vh] flex flex-col bg-white">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white sticky top-0 z-10">
                <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
                <div className="flex gap-2">
                     <Tooltip title="Refresh">
                        <Button type="text" size="small" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={() => fetchNotifications()} />
                     </Tooltip>
                     {unreadCount > 0 && (
                        <Button type="link" size="small" className="text-xs p-0 h-auto" onClick={markAllRead}>
                            Mark all read
                        </Button>
                     )}
                </div>
            </div>

            <div className="overflow-y-auto flex-1 custom-scrollbar">
                {loading && notifications.length === 0 ? (
                    <div className="flex justify-center py-8"><Spin /></div>
                ) : notifications.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No notifications" className="py-8" />
                ) : (
                    <div className="divide-y divide-slate-50">
                        {notifications.map((notif) => (
                            <div 
                                key={notif.Id} 
                                className={`p-4 hover:bg-slate-50 transition-colors relative group ${!notif.IsRead ? 'bg-blue-50/40' : ''}`}
                            >
                                {!notif.IsRead && (
                                    <span className="absolute top-4 right-4 w-2 h-2 bg-blue-500 rounded-full" />
                                )}
                                
                                <div className="flex gap-3">
                                    <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center 
                                        ${notif.Type === 'Leave_Request' ? 'bg-orange-100 text-orange-600' : 
                                          notif.Type === 'Alert' ? 'bg-red-100 text-red-600' :
                                          'bg-blue-100 text-blue-600'}`}>
                                        {notif.Type === 'Leave_Request' ? <AlertCircle className="w-4 h-4"/> : 
                                         notif.Type === 'Alert' ? <AlertCircle className="w-4 h-4"/> : 
                                         <CheckCircle className="w-4 h-4"/>}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex justify-between items-start pr-4">
                                            <p className={`text-sm ${!notif.IsRead ? 'font-semibold text-slate-800' : 'font-medium text-slate-700'}`}>
                                                {notif.Subject}
                                            </p>
                                        </div>
                                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{notif.Message}</p>
                                        
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-[10px] text-slate-400 font-medium">{dayjs(notif.CreatedDate).fromNow()}</span>
                                            
                                            {/* Action Buttons */}
                                            {notif.ActionRequired && notif.Status === 'Pending' && (
                                                <div className="flex gap-2 mt-1">
                                                    <Button 
                                                        size="small" 
                                                        type="primary" 
                                                        danger 
                                                        className="h-7 text-xs flex items-center gap-1 shadow-none"
                                                        onClick={(e) => { e.stopPropagation(); handleAction(notif.Id, 'Rejected'); }}
                                                    >
                                                        <X className="w-3 h-3" /> Reject
                                                    </Button>
                                                    <Button 
                                                        size="small" 
                                                        type="primary" 
                                                        className="h-7 text-xs bg-green-600 hover:bg-green-700 flex items-center gap-1 shadow-none border-none"
                                                        onClick={(e) => { e.stopPropagation(); handleAction(notif.Id, 'Approved'); }}
                                                    >
                                                        <Check className="w-3 h-3" /> Approve
                                                    </Button>
                                                </div>
                                            )}
                                            
                                            {notif.Status === 'Actioned' && (
                                                <Tag color={notif.ActionTaken === 'Approved' ? 'green' : 'red'} className="m-0 text-[10px] px-1.5 border-none bg-opacity-10">
                                                    {notif.ActionTaken}
                                                </Tag>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Mark read handling on click item? Or hover? */}
                                <div 
                                    className="absolute inset-0 z-0 cursor-pointer" 
                                    onClick={() => !notif.IsRead && markAsRead(notif.Id)}
                                />
                                {/* Ensure buttons are clickable by having higher z-index inside */}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <div className="p-2 border-t border-slate-100 bg-slate-50 text-center">
                <Button type="link" size="small" className="text-xs text-slate-500">View All Notifications</Button>
            </div>
        </div>
    );

    return (
        <Popover 
            content={content} 
            trigger="click" 
            placement="bottomRight" 
            open={open}
            onOpenChange={setOpen}
            overlayClassName="notification-popover-no-padding"
            arrow={false}
        >
            <button className="relative p-2 rounded-full text-slate-500 hover:bg-white hover:text-cyan-600 hover:shadow-md transition-all">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-50 animate-pulse"></span>
                )}
            </button>
        </Popover>
    );
}
