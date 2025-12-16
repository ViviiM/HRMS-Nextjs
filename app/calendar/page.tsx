"use client";

import { useState } from "react";
// import { format } from "date-fns";
import { Card, Badge, Calendar as AntCalendar, List, Tag } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";

// Mock holidays
const holidays = [
    { date: "2025-01-01", name: "New Year's Day", type: "Public" },
    { date: "2025-01-26", name: "Republic Day", type: "National" },
    { date: "2025-03-14", name: "Holi", type: "Festival" },
    { date: "2025-04-18", name: "Good Friday", type: "Public" },
    { date: "2025-05-01", name: "Labor Day", type: "Public" },
    { date: "2025-08-15", name: "Independence Day", type: "National" },
    { date: "2025-10-02", name: "Gandhi Jayanti", type: "National" },
    { date: "2025-10-24", name: "Dussehra", type: "Festival" },
    { date: "2025-11-12", name: "Diwali", type: "Festival" },
    { date: "2025-12-25", name: "Christmas", type: "Public" },
];

export default function CalendarPage() {
  const [value, setValue] = useState(() => dayjs());
  const [selectedValue, setSelectedValue] = useState(() => dayjs());

  const onSelect = (newValue: Dayjs) => {
    setValue(newValue);
    setSelectedValue(newValue);
  };

  const onPanelChange = (newValue: Dayjs) => {
    setValue(newValue);
  };

  const dateCellRender = (value: Dayjs) => {
    const formatted = value.format("YYYY-MM-DD");
    const holiday = holidays.find(h => h.date === formatted);
    if (holiday) {
        return (
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-6"></div>
            </div>
        );
    }
    return null;
  };

  const selectedHoliday = holidays.find(h => h.date === selectedValue.format("YYYY-MM-DD"));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
           <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Holiday Calendar 2025</h1>
           <p className="text-slate-500 mt-1">View upcoming holidays and events</p>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-8">
          {/* Calendar View */}
          <div className="flex-1 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <AntCalendar 
                  value={value} 
                  onSelect={onSelect} 
                  onPanelChange={onPanelChange} 
                  cellRender={dateCellRender}
                  fullscreen={false} 
              />
          </div>

          {/* Details & List */}
          <div className="lg:w-1/3 space-y-4">
               {/* Selected Day */}
               <Card title={selectedValue.format("MMMM D, YYYY")} className="shadow-sm">
                   {selectedHoliday ? (
                       <div>
                           <h3 className="text-lg font-bold text-blue-800">{selectedHoliday.name}</h3>
                           <Tag color="blue" className="mt-2">{selectedHoliday.type}</Tag>
                       </div>
                   ) : (
                       <p className="text-gray-400">No holiday on this date.</p>
                   )}
               </Card>

               <Card title="Upcoming Holidays" className="shadow-sm">
                   <List
                        dataSource={holidays.filter(h => dayjs(h.date).isAfter(dayjs())).slice(0, 5)}
                        renderItem={(item) => (
                            <List.Item>
                                <List.Item.Meta
                                    title={item.name}
                                    description={dayjs(item.date).format("dddd, MMMM D")}
                                />
                                <Tag>{item.type}</Tag>
                            </List.Item>
                        )}
                   />
               </Card>
          </div>
      </div>
    </div>
  );
}
