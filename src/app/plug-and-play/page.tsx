'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Zap,
  Layout,
  Shield,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Clock,
  Users,
  TrendingUp,
  Settings,
  Layers,
} from 'lucide-react';

export default function PlugAndPlayLanding() {
  const router = useRouter();

  const features = [
    {
      icon: Zap,
      title: 'No Coding Required',
      description: 'Simply enter your API credentials and start building dashboards immediately.',
    },
    {
      icon: Layout,
      title: 'Drag & Drop Builder',
      description: 'Intuitive drag-and-drop interface to create custom dashboards in minutes.',
    },
    {
      icon: Shield,
      title: 'Secure by Default',
      description: 'All API credentials are encrypted at rest with industry-standard AES-256.',
    },
    {
      icon: Clock,
      title: 'Real-time Sync',
      description: 'Automatic data synchronization keeps your dashboards always up to date.',
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Invite team members with role-based access controls.',
    },
    {
      icon: Settings,
      title: 'Fully Customizable',
      description: 'Configure reports, metrics, and display options to match your needs.',
    },
  ];

  const widgetTypes = [
    'KPI Cards',
    'Bar Charts',
    'Line Charts',
    'Pie Charts',
    'Leaderboards',
    'Data Tables',
    'Gauges',
    'Progress Bars',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <BarChart3 className="w-6 h-6 text-blue-400" />
            </div>
            <span className="text-xl font-bold text-white">KPI Dashboard</span>
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs font-medium rounded-full">
              Plug & Play
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => router.push('/setup')}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-300 text-sm mb-8">
            <Sparkles className="w-4 h-4" />
            No coding required - just connect and customize
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Build Your ServiceTitan
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              KPI Dashboard
            </span>
          </h1>

          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
            Connect your ServiceTitan account, drag and drop widgets, and create
            beautiful dashboards that update in real-time. No developers needed.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/setup')}
              className="flex items-center justify-center gap-2 px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold text-lg transition-all hover:scale-105"
            >
              Start Free Setup
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => router.push('/builder')}
              className="flex items-center justify-center gap-2 px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold text-lg border border-slate-700 transition-colors"
            >
              Try Demo
            </button>
          </div>

          <p className="text-sm text-slate-500 mt-6">
            Free to start. No credit card required.
          </p>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="relative rounded-2xl border border-slate-700 bg-slate-800/50 p-2 shadow-2xl">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-700">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-4 text-sm text-slate-500">Dashboard Builder</span>
            </div>
            <div className="p-4 md:p-8 grid grid-cols-3 md:grid-cols-4 gap-4">
              {/* Mock Dashboard Widgets */}
              <div className="col-span-1 bg-slate-900/80 rounded-xl p-4 border border-slate-700">
                <p className="text-xs text-slate-500 mb-1">Revenue MTD</p>
                <p className="text-2xl font-bold text-white">$125,450</p>
                <p className="text-xs text-green-400 mt-1">+12.5%</p>
              </div>
              <div className="col-span-1 bg-slate-900/80 rounded-xl p-4 border border-slate-700">
                <p className="text-xs text-slate-500 mb-1">Jobs Today</p>
                <p className="text-2xl font-bold text-white">47</p>
                <p className="text-xs text-green-400 mt-1">+5</p>
              </div>
              <div className="col-span-1 bg-slate-900/80 rounded-xl p-4 border border-slate-700">
                <p className="text-xs text-slate-500 mb-1">Booking Rate</p>
                <p className="text-2xl font-bold text-white">82%</p>
                <p className="text-xs text-green-400 mt-1">+3%</p>
              </div>
              <div className="col-span-1 bg-slate-900/80 rounded-xl p-4 border border-slate-700">
                <p className="text-xs text-slate-500 mb-1">Close Rate</p>
                <p className="text-2xl font-bold text-white">78%</p>
                <p className="text-xs text-red-400 mt-1">-2%</p>
              </div>
              <div className="col-span-2 bg-slate-900/80 rounded-xl p-4 border border-slate-700 h-32">
                <p className="text-xs text-slate-500 mb-2">Revenue by Tech</p>
                <div className="flex items-end gap-2 h-16">
                  {[65, 80, 55, 90, 70].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-blue-500 rounded-t"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
              <div className="col-span-2 bg-slate-900/80 rounded-xl p-4 border border-slate-700">
                <p className="text-xs text-slate-500 mb-2">Top Performers</p>
                {['John S.', 'Mike R.', 'Sarah T.'].map((name, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <span className="text-sm text-slate-300">{name}</span>
                    <span className="text-sm text-white font-medium">
                      ${(45 - i * 3).toFixed(0)}K
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              Everything You Need
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              A complete solution for tracking and visualizing your ServiceTitan KPIs
              without writing a single line of code.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="p-6 bg-slate-800/50 border border-slate-700 rounded-2xl hover:border-slate-600 transition-colors"
                >
                  <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-slate-400 text-sm">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Widget Types */}
      <section className="py-20 px-4 bg-slate-800/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Powerful Widget Library
              </h2>
              <p className="text-slate-400 mb-8">
                Choose from a variety of widget types to display your data exactly
                how you want it. Mix and match to create the perfect dashboard.
              </p>
              <div className="flex flex-wrap gap-2">
                {widgetTypes.map((widget, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300"
                  >
                    {widget}
                  </span>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                  <Layers className="w-8 h-8 text-blue-400 mb-4" />
                  <p className="text-2xl font-bold text-white">15+</p>
                  <p className="text-slate-400 text-sm">Widget Types</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                  <TrendingUp className="w-8 h-8 text-green-400 mb-4" />
                  <p className="text-2xl font-bold text-white">Real-time</p>
                  <p className="text-slate-400 text-sm">Data Updates</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              Get Started in Minutes
            </h2>
            <p className="text-slate-400">
              Three simple steps to your custom ServiceTitan dashboard
            </p>
          </div>

          <div className="space-y-8">
            {[
              {
                step: 1,
                title: 'Connect Your Account',
                description:
                  'Enter your ServiceTitan API credentials. We securely connect to your account.',
              },
              {
                step: 2,
                title: 'Select Your Reports',
                description:
                  'Choose which ServiceTitan reports you want to track - technicians, sales, call center, and more.',
              },
              {
                step: 3,
                title: 'Build Your Dashboard',
                description:
                  'Drag and drop widgets to create your perfect dashboard. Customize everything to your needs.',
              },
            ].map((item, index) => (
              <div
                key={index}
                className="flex gap-6 items-start p-6 bg-slate-800/50 border border-slate-700 rounded-2xl"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-xl font-bold text-white">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-slate-400">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-3xl p-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Transform Your Reporting?
            </h2>
            <p className="text-slate-300 mb-8 max-w-xl mx-auto">
              Join hundreds of ServiceTitan users who have streamlined their KPI
              tracking with our plug-and-play dashboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push('/setup')}
                className="flex items-center justify-center gap-2 px-8 py-4 bg-white text-slate-900 rounded-xl font-semibold text-lg hover:bg-slate-100 transition-colors"
              >
                Start Your Free Dashboard
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center justify-center gap-6 mt-8 text-sm text-slate-400">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                Free to start
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                No credit card required
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                5-minute setup
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <span className="font-semibold text-white">KPI Dashboard</span>
          </div>
          <p className="text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} KPI Dashboard. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
