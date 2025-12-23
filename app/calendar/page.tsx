"use client";
import { useState, useEffect } from "react";
import { Card, Badge, Calendar as AntCalendar, List, Tag, Button, Modal, Form, Input, DatePicker, Select, message, Spin } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useSession } from "next-auth/react";
import { Calendar as CalendarIcon, Plus } from "lucide-react";

export default function CalendarPage() {
  const { data: session } = useSession();
  const [value, setValue] = useState(() => dayjs());
  const [selectedValue, setSelectedValue] = useState(() => dayjs());
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // Check role
  const isHR = (session?.user as any)?.role === 'HR' || (session?.user as any)?.role === 'Admin';

  const fetchHolidays = async () => {
    setLoading(true);
    try {
        const res = await fetch('/api/calendar');
        const data = await res.json();
        if(data.success) {
            setHolidays(data.data);
        } else {
            message.error("Failed to load holidays");
        }
    } catch(e) {
        console.error(e);
        message.error("Error fetching calendar data");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const onSelect = (newValue: Dayjs) => {
    setValue(newValue);
    setSelectedValue(newValue);
  };

  const onPanelChange = (newValue: Dayjs) => {
    setValue(newValue);
  };

  const dateCellRender = (value: Dayjs) => {
    const formatted = value.format("YYYY-MM-DD");
    // Find all events for this day
    const events = holidays.filter(h => h.date === formatted);
    
    if (events.length > 0) {
        return (
            <ul className="list-none m-0 p-0">
               {events.map((ev, i) => (
                   <li key={i}>
                       <Badge status={ev.source === 'Google' ? 'processing' : 'error'} text={ev.name} />
                   </li>
               ))}
            </ul>
        );
    }
    return null;
  };

  const handleCreateHoliday = async (values: any) => {
      setSubmitting(true);
      try {
          const payload = {
              name: values.name,
              date: values.date.format('YYYY-MM-DD'),
              type: values.type,
              description: values.description
          };
          
          const res = await fetch('/api/calendar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });
          
          if(res.ok) {
              message.success("Holiday created successfully");
              setIsModalOpen(false);
              form.resetFields();
              fetchHolidays();
          } else {
              const err = await res.json();
              message.error(err.error || "Failed to create holiday");
          }
      } catch(e) {
          message.error("Error creating holiday");
      } finally {
          setSubmitting(false);
      }
  };

  const selectedEvents = holidays.filter(h => h.date === selectedValue.format("YYYY-MM-DD"));
  const upcomingHolidays = holidays.filter(h => dayjs(h.date).isAfter(dayjs())).slice(0, 5);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex justify-between items-center">
         <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Calendar</h1>
            <p className="text-slate-500 mt-1">Holidays, Leave Events, and Important Dates (Synced with Google Calendar)</p>
         </div>
         {isHR && (
             <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)} className="bg-blue-600">
                 Add Holiday
             </Button>
         )}
      </div>
      
      {loading ? (
          <div className="flex justify-center h-64 items-center">
              <Spin size="large" />
          </div>
      ) : (
          <div className="flex flex-col lg:flex-row gap-8">
              {/* Calendar View */}
              <div className="flex-1 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <AntCalendar 
                      value={value} 
                      onSelect={onSelect} 
                      onPanelChange={onPanelChange} 
                      cellRender={dateCellRender}
                  />
              </div>

              {/* Details & List */}
              <div className="lg:w-1/3 space-y-4">
                  {/* Selected Day */}
                  <Card title={selectedValue.format("MMMM D, YYYY")} className="shadow-sm">
                      {selectedEvents.length > 0 ? (
                          <div className="space-y-3">
                              {selectedEvents.map((ev, i) => (
                                  <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                      <div className="flex justify-between items-start">
                                         <h3 className="font-bold text-slate-800">{ev.name}</h3>
                                         <Tag color={ev.source === 'Google' ? 'blue' : 'red'}>{ev.type}</Tag>
                                      </div>
                                      {ev.description && <p className="text-sm text-slate-500 mt-1">{ev.description}</p>}
                                      <span className="text-xs text-slate-400 block mt-2">Source: {ev.source}</span>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <p className="text-gray-400 text-center py-4">No events for this date.</p>
                      )}
                  </Card>

                  <Card title="Upcoming Events" className="shadow-sm">
                      <List
                            dataSource={upcomingHolidays}
                            renderItem={(item) => (
                                <List.Item>
                                    <List.Item.Meta
                                        avatar={<div className={`w-2 h-full ${item.source === 'Google' ? 'bg-blue-500' : 'bg-red-500'} rounded-full mr-2`}></div>}
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
      )}

      {/* Add Holiday Modal */}
      <Modal
        title="Add New Holiday"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
          <Form form={form} layout="vertical" onFinish={handleCreateHoliday}>
              <Form.Item name="name" label="Holiday Name" rules={[{ required: true, message: 'Please enter holiday name' }]}>
                  <Input placeholder="e.g. Annual Company Retreat" />
              </Form.Item>
              
              <Form.Item name="date" label="Date" rules={[{ required: true, message: 'Please select date' }]}>
                  <DatePicker className="w-full" />
              </Form.Item>
              
              <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                  <Select>
                      <Select.Option value="Public">Public Holiday</Select.Option>
                      <Select.Option value="National">National Holiday</Select.Option>
                      <Select.Option value="Festival">Festival</Select.Option>
                      <Select.Option value="Company">Company Event</Select.Option>
                  </Select>
              </Form.Item>
              
              <Form.Item name="description" label="Description">
                  <Input.TextArea placeholder="Optional details..." />
              </Form.Item>
              
              <div className="flex justify-end gap-2 pt-4">
                  <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
                  <Button type="primary" htmlType="submit" loading={submitting}>Create Holiday</Button>
              </div>
          </Form>
      </Modal>
    </div>
  );
}
