import Link from 'next/link';
import { FileText } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      {/* Left - Form */}
      <div className="w-full lg:w-1/2 flex flex-col">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#003366] dark:bg-blue-500 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-[#003366] dark:text-blue-400">PitchDeck AI</span>
          </Link>
        </div>
        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
      {/* Right - Branding */}
      <div className="hidden lg:flex w-1/2 bg-[#003366] dark:bg-blue-950 items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <FileText className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">
            Generate Pitch Books with AI
          </h2>
          <p className="text-blue-200 text-lg">
            Upload your template, enter company details, and let AI create a professional pitch book in minutes.
          </p>
        </div>
      </div>
    </div>
  );
}
