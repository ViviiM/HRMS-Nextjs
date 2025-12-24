import { signIn, signOut } from "next-auth/react";

export interface LoginCredentials {
  employeeId?: string // handling both potentially 
  email?: string
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
  designation: string
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
    const result = await signIn("credentials", {
      redirect: false,
      employeeId: credentials.employeeId,
      email: credentials.email, // fallback
      password: credentials.password,
    });
    console.log('Result' , result)
    if (result?.error) {
      if (result.error === "CredentialsSignin") {
        return { success: false, error: "Invalid Credentials" };
      }
      return { success: false, error: result.error };
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: "Login failed" };
  }
}

export function logout(): void {
  signOut({ callbackUrl: "/auth/login" });
}

// Deprecated or Unused stubs to prevent build breakage if referenced elsewhere
export async function register(data: RegisterCredentials): Promise<AuthResponse> {
    return { success: false, error: "Registration is managed by HR." };
}

export function getAuthToken(): string | null {
  return null;
}

export function isAuthenticated(): boolean {
  return false;
}

export function getUserRole(): string {
  return "employee";
}
