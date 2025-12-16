"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, UploadCloud, FileText, CheckCircle, Clock, AlertTriangle, Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Tag } from "antd";

export default function DocumentsTab() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { register, handleSubmit, reset } = useForm();
  
  const fetchDocuments = async () => {
     try {
         const res = await fetch("/api/profile/documents");
         const json = await res.json();
         if(json.success) setDocuments(json.data);
     } catch(e) { console.error(e); } 
     finally { setLoading(false); }
  };

  useEffect(() => {
     fetchDocuments();
  }, []);

  const onUpload = async (data: any) => {
     setUploading(true);
     const formData = new FormData();
     formData.append("file", data.file[0]);
     formData.append("type", data.type);
     
     try {
         const res = await fetch("/api/profile/documents", {
             method: "POST",
             body: formData
         });
         
         if(res.ok) {
             toast.success("Document uploaded successfully");
             reset();
             fetchDocuments();
         } else {
             const json = await res.json();
             toast.error(json.error || "Upload failed");
         }
     } catch(e) {
         toast.error("Error uploading file");
     } finally {
         setUploading(false);
     }
  };

  if(loading) return <div className="p-10 text-center text-gray-400">Loading documents...</div>;

  return (
    <div>
       <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-800">My Documents</h3>
      </div>
      
      {/* Upload Section */}
      <div className="bg-blue-50/50 border border-dashed border-blue-200 rounded-xl p-6 mb-8">
          <h4 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
              <UploadCloud className="w-5 h-5" /> Upload New Document
          </h4>
          <form onSubmit={handleSubmit(onUpload)} className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold text-blue-700 uppercase mb-1">Document Type</label>
                  <select {...register("type", { required: true })} className="w-full border-blue-200 rounded-lg text-sm p-2.5 bg-white">
                      <option value="">Select Type</option>
                      <option value="Resume">Resume</option>
                      <option value="ID Proof">ID Proof (Aadhaar/PAN)</option>
                      <option value="Address Proof">Address Proof</option>
                      <option value="Education Certificate">Education Certificate</option>
                      <option value="Other">Other</option>
                  </select>
              </div>
              <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold text-blue-700 uppercase mb-1">File</label>
                  <input type="file" {...register("file", { required: true })} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200" />
              </div>
              <button 
                type="submit" 
                disabled={uploading} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm shadow-blue-200 transition disabled:opacity-50 flex items-center gap-2"
              >
                  {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Upload
              </button>
          </form>
      </div>

      {/* List Section */}
      <div className="space-y-3">
          {documents.map(doc => (
              <div key={doc.Id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition">
                  <div className="flex items-start gap-4 mb-3 md:mb-0">
                      <div className="p-2.5 bg-gray-100 rounded-lg text-gray-500">
                          <FileText className="w-6 h-6" />
                      </div>
                      <div>
                          <h5 className="font-bold text-gray-800">{doc.Name}</h5>
                          <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                              <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-medium">{doc.Document_Type__c}</span>
                              <span>•</span>
                              <span>{format(new Date(doc.CreatedDate), 'MMM d, yyyy')}</span>
                          </div>
                      </div>
                  </div>

                  <div className="flex items-center gap-4 self-end md:self-auto">
                      <Tag color={doc.Status__c === 'Verified' ? 'green' : 'orange'}>
                          {doc.Status__c}
                      </Tag>
                      
                      {doc.File_URL__c && (
                          <a 
                            href={doc.File_URL__c} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Download"
                          >
                              <Download className="w-5 h-5" />
                          </a>
                      )}
                  </div>
              </div>
          ))}

          {documents.length === 0 && !loading && (
              <div className="text-center py-10 text-gray-400 text-sm">No documents uploaded yet.</div>
          )}
      </div>
    </div>
  );
}
