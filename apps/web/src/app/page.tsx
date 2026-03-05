import Link from 'next/link';
import { ArrowRight, BarChart3, FileText, Sparkles, Zap, Shield, Clock } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#003366] rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-[#003366]">PitchDeck AI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-600 hover:text-gray-900">Features</a>
            <a href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900">How It Works</a>
            <a href="#pricing" className="text-sm text-gray-600 hover:text-gray-900">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm font-medium text-gray-700 hover:text-gray-900">
              Log in
            </Link>
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 bg-[#003366] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#003366]/90 transition-colors"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Sparkles className="w-4 h-4" />
            AI-Powered Document Generation
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Generate Investment Banking{' '}
            <span className="text-[#003366]">Pitch Books</span>{' '}
            in Minutes
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            Stop spending hours on formatting. Our AI analyses your templates, pulls live financial data,
            and generates compliance-aware pitch books that match your firm&apos;s standards.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 bg-[#003366] text-white font-medium px-6 py-3 rounded-lg hover:bg-[#003366]/90 transition-colors text-lg"
            >
              Start Building <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 font-medium px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors text-lg"
            >
              See How It Works
            </a>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y bg-gray-50 py-12 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-[#003366]">&lt; 5 min</div>
            <div className="text-sm text-gray-600 mt-1">Generation Time</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[#003366]">100%</div>
            <div className="text-sm text-gray-600 mt-1">Template Fidelity</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[#003366]">Live Data</div>
            <div className="text-sm text-gray-600 mt-1">Yahoo Finance + SEC</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[#003366]">HITL</div>
            <div className="text-sm text-gray-600 mt-1">Human-in-the-Loop</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Everything You Need</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From template analysis to final export, our AI handles the entire pitch book pipeline.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: FileText, title: 'Template Analysis', desc: 'Upload your firm\'s .pptx template. We extract layouts, colours, fonts, and placeholder positions automatically.' },
              { icon: BarChart3, title: 'Live Financial Data', desc: 'Pulls real-time data from Yahoo Finance and SEC EDGAR. Company financials, filings, and news — all automated.' },
              { icon: Sparkles, title: 'AI Content Planning', desc: 'Gemini generates structured slide-by-slide content adapted to your pitch book type and transaction context.' },
              { icon: Zap, title: 'Instant Generation', desc: 'Complete pitch book drafts in under 5 minutes. Multiple pitch book types: Company Overview, Market Update, Transaction Summary.' },
              { icon: Shield, title: 'Compliance Aware', desc: 'Human-in-the-loop design. AI generates drafts, you review and refine. Full audit trail of data sources.' },
              { icon: Clock, title: 'AI Chat Editor', desc: 'After generation, chat with AI to refine slides. Make changes, add details, or restructure — all through natural language.' },
            ].map((feature, i) => (
              <div key={i} className="p-6 rounded-xl border bg-white hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-[#003366]" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-lg text-gray-600">Four steps from input to presentation.</p>
          </div>
          <div className="space-y-8">
            {[
              { step: '01', title: 'Upload Template', desc: 'Upload your firm\'s reference .pptx file. Our template analyser extracts every layout rule, colour, and font specification.' },
              { step: '02', title: 'Provide Details', desc: 'Enter the company name, ticker, transaction type, and pitch book type. Add any additional context or instructions.' },
              { step: '03', title: 'AI Generates', desc: 'Our agentic pipeline fetches live data, plans content with Gemini, and assembles slides matching your template exactly.' },
              { step: '04', title: 'Review & Export', desc: 'Review the generated slides, chat with AI to make edits, then export as a .pptx file ready for presentation.' },
            ].map((item, i) => (
              <div key={i} className="flex gap-6 items-start bg-white p-6 rounded-xl border">
                <div className="flex-shrink-0 w-12 h-12 bg-[#003366] rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-gray-600">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Save Hours on Pitch Books?</h2>
          <p className="text-lg text-gray-600 mb-8">
            Join investment banking professionals who are using AI to generate pitch books faster.
          </p>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 bg-[#003366] text-white font-medium px-8 py-4 rounded-lg hover:bg-[#003366]/90 transition-colors text-lg"
          >
            Get Started Free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#003366] rounded flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-[#003366]">PitchDeck AI</span>
          </div>
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} PitchDeck AI. Built for investment banking professionals.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm text-gray-500 hover:text-gray-700">Privacy</a>
            <a href="#" className="text-sm text-gray-500 hover:text-gray-700">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
