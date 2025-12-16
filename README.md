# MV Portal - Human Resource Management System (HRMS)

MV Portal is a modern, comprehensive Human Resource Management System designed to streamline employee management, leave tracking, payroll processing, and organizational workflows. Built with Next.js 15+ and integrated with Salesforce for robust data management, it offers a secure and responsive interface for both employees and HR administrators.

## 🚀 Key Features

*   **Employee Management**: Centralized directory to manage employee profiles, contact details, and professional information.
*   **Leave Management**: 
    *   Apply for various leave types (Annual, Sick, Casual, Earned, Unpaid).
    *   Real-time leave balance tracking.
    *   Approval workflows for Team Leads and HR.
*   **Payroll System**: View and download monthly payslips, track salary components, and handle financial data securely.
*   **Asset Management**: Track company assets assigned to employees (Laptops, Mobiles, Accessories).
*   **Training & Development**: 
    *   Browse available training courses.
    *   Self-enrollment and progress tracking.
    *   Integration with external training resources.
*   **Document Management**: Securely upload and manage employee documents (Resume, ID Proofs, Contracts).
*   **NDA & Policies**: Digital signing and management of Non-Disclosure Agreements and company policies.
*   **Holiday Calendar**: Interactive calendar viewing upcoming public holidays and events.
*   **Admin Dashboard**: Comprehensive analytics and quick actions for HR admins to oversee operations.

## 🛠️ Tech Stack

### Frontend
*   **Framework**: [Next.js 15+](https://nextjs.org/) (App Router, Server Components)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **Components**: [Ant Design](https://ant.design/), [Radix UI](https://www.radix-ui.com/), [Lucide React](https://lucide.dev/)
*   **State Management**: [Zustand](https://github.com/pmndrs/zustand)
*   **Forms**: React Hook Form, Zod validation
*   **Animations**: Framer Motion

### Backend & Infrastructure
*   **Database**: Salesforce (via JSForce)
*   **Storage**: AWS S3 (for documents and profile photos)
*   **Authentication**: [NextAuth.js](https://next-auth.js.org/) (Custom Salesforce Provider)
*   **Email**: Resend API
*   **Hosting**: Vercel

## 🏁 Getting Started

### Prerequisites
*   Node.js (v18 or higher)
*   npm or yarn
*   A Salesforce Developer/Sandbox account
*   AWS S3 Bucket credentials

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-username/hrms-next-js.git
    cd hrms-next-js
    ```

2.  **Install dependencies**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Configure Environment Variables**
    Create a `.env.local` file in the root directory and add the following keys:

    ```env
    # Salesforce Configuration
    SALESFORCE_LOGIN_URL=https://login.salesforce.com
    SALESFORCE_USERNAME=your_sf_username
    SALESFORCE_PASSWORD=your_sf_password
    SALESFORCE_TOKEN=your_sf_security_token
    
    # AWS S3 Configuration
    AWS_ACCESS_KEY_ID=your_aws_access_key
    AWS_SECRET_ACCESS_KEY=your_aws_secret_key
    AWS_REGION=your_aws_region
    AWS_S3_BUCKET_NAME=your_bucket_name
    
    # NextAuth Configuration
    NEXTAUTH_URL=http://localhost:3000
    NEXTAUTH_SECRET=your_super_secret_key
    
    # Email Service (Resend)
    RESEND_API_KEY=your_resend_api_key
    ```

4.  **Run the development server**
    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📂 Project Structure

```bash
├── app/                  # Next.js App Router
│   ├── api/              # API Route Handlers
│   ├── auth/             # Authentication pages
│   ├── dashboard/        # Dashboard main views
│   ├── employees/        # Employee management views
│   ├── leaves/           # Leave application & history
│   ├── payroll/          # Payroll viewing
│   ├── assets/           # Asset tracking
│   ├── layout.tsx        # Root layout with Sidebar/Header
│   └── page.tsx          # Landing page
├── components/           # Reusable React components
│   ├── layout/           # Sidebar, Header, AppShell
│   └── ...               # Feature-specific components
├── lib/                  # Utilities and configurations
│   ├── auth-config.ts    # NextAuth configuration
│   ├── salesforce.ts     # Salesforce connection logic
│   └── s3.ts             # AWS S3 helpers
├── store/                # Zustand state stores
├── public/               # Static assets
└── types/                # TypeScript type definitions
```

## 🔒 Security

*   **Authentication**: Secure session management via NextAuth.
*   **Data Privacy**: Employee sensitive data (bank details) is encrypted before storage.
*   **Role-Based Access**: Strict separation between Employee and HR Admin capabilities.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.


