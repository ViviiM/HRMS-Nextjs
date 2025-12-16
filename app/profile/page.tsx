import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { redirect } from "next/navigation";
import ProfileContainer from "./components/profile-container";
import { headers } from 'next/headers';

async function getProfileData(session: any) {
  // Option 1: Call the API Route (Good for separation, adds Network overhead)
  // Option 2: Direct logic call (Better for Efficiency in Server Component)
  // Let's use fetch to API for consistency with Client Components if we need revalidation later.
  // Note: Absolute URL needed for server-side fetch
  
  // Actually, we can just invoke the logic OR easier: Client Component fetches it?
  // Server Components + Data Fetching is best.
  // Let's rely on the API Route we built.
  
  try {
     const res = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/profile`, {
        headers: {
            // Forward cookies for auth
             cookie: (await headers()).get("cookie") || "" 
        }
     });
     
     if(res.ok) {
         return (await res.json()).data;
     }
  } catch (e) {
      console.error(e);
  }
  return null;
}

export default async function ProfilePageRoot() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  const profileData = await getProfileData(session);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="mb-8">
           <h1 className="text-3xl font-bold text-slate-900 tracking-tight">My Profile</h1>
           <p className="text-slate-500 mt-1">Manage your personal information and preferences</p>
       </div>

       <div className="">
           <ProfileContainer initialData={profileData} />
       </div>
    </div>
  );
}
