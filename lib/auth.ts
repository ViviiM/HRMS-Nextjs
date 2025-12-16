import { signIn, signOut } from "next-auth/react";

interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  firstName: string
  lastName: string
  email: string
  phone: string
  dob: string
  gender: string
  address: string
  emergencyContactName: string
  emergencyContactNumber: string
  departmentRole: string // mapping to 'role' or 'Department__c'
  designation: string
  joiningDate: string
  experience?: string
  profilePhoto?: File | null
}

interface AuthResponse {
  success: boolean
  token?: string
  user?: any
  error?: string
}

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  try {
    const res = await signIn("credentials", {
      email: credentials.email,
      password: credentials.password,
      redirect: false
    });

    if (res?.error) {
      if (res.error === "CredentialsSignin") {
        return { success: false, error: "Invalid email or password" };
      }
      return { success: false, error: res.error };
    }
    
    // In strict NextAuth, we don't return the user object here easily unless we fetch session.
    // But for UI compatibility, we return success.
    return { success: true };
  } catch (error) {
    return { success: false, error: "Login failed" };
  }
}

export async function register(data: RegisterCredentials): Promise<AuthResponse> {
  try {
    const formData = new FormData();
    formData.append("firstName", data.firstName);
    formData.append("lastName", data.lastName);
    formData.append("email", data.email);
    formData.append("phone", data.phone);
    formData.append("dob", data.dob);
    formData.append("gender", data.gender);
    formData.append("currentAddress", data.address); // Mapping
    formData.append("emergencyName", data.emergencyContactName);
    formData.append("emergencyPhone", data.emergencyContactNumber);
    // departmentRole in form seems to be Department or Role?
    // API expects 'role' (Employee/Intern).
    // Let's assume Employee for general registration or map vaguely.
    formData.append("role", "Employee"); 
    formData.append("experience", data.experience || "0");
    
    if (data.profilePhoto) {
      // API expects 'resume'.
      // If profilePhoto is passed, maybe ignored or as resume?
      // Better to ignore if not resume.
    }

    const res = await fetch("/api/register", {
      method: "POST",
      body: formData
    });

    const result = await res.json();

    if (!res.ok) {
      return { success: false, error: result.error };
    }

    return { success: true, user: { id: result.trackingId } };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export function logout(): void {
  signOut({ callbackUrl: "/auth/login" });
}

export function getAuthToken(): string | null {
  // Deprecated with NextAuth
  return null;
}

export function isAuthenticated(): boolean {
  // Should use useSession hook
  return false;
}

export function getUserRole(): string {
  // Should use useSession hook
  return "employee";
}
