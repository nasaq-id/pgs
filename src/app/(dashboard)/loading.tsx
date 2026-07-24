"use client"

import React from "react"

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Header Skeleton */}
      <div className="space-y-2 text-left">
        {/* Category Pill */}
        <div className="h-4 w-28 rounded-full shimmer" />
        
        {/* Title */}
        <div className="h-8 w-60 rounded-xl shimmer mt-2" />
        
        {/* Subtitle */}
        <div className="h-3.5 w-80 rounded-lg shimmer mt-1.5" />
      </div>

      {/* 2. Three Column Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div 
            key={i} 
            className="bg-[oklch(0.96_0.01_250)] dark:bg-[oklch(0.16_0.01_250)] rounded-3xl p-5 shadow-md neumo-card border border-white/40 dark:border-slate-800/40 space-y-4 text-left"
          >
            <div className="flex items-center justify-between">
              {/* Icon container */}
              <div className="h-10 w-10 rounded-xl neumo-inset bg-[oklch(0.94_0.01_250)] dark:bg-[oklch(0.14_0.01_250)] p-2 shrink-0">
                <div className="w-full h-full rounded-md shimmer" />
              </div>
              {/* Corner badge */}
              <div className="h-4.5 w-12 rounded-full shimmer" />
            </div>

            {/* Label & Value */}
            <div className="space-y-2">
              <div className="h-3 w-20 rounded-md shimmer" />
              <div className="h-7 w-28 rounded-lg shimmer" />
            </div>

            {/* Bottom auxiliary bar */}
            <div className="pt-2 border-t border-slate-200/25 dark:border-slate-800/25">
              <div className="h-2 w-36 rounded-full shimmer" />
            </div>
          </div>
        ))}
      </div>

      {/* 3. Large Content Box/Table Card Skeleton */}
      <div className="bg-[oklch(0.96_0.01_250)] dark:bg-[oklch(0.16_0.01_250)] rounded-[2rem] border border-white/40 dark:border-slate-800/40 p-6 shadow-md neumo-card space-y-6 text-left">
        
        {/* Search & Filter Header skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/20 dark:border-slate-800/20 pb-4">
          {/* Title */}
          <div className="space-y-1">
            <div className="h-4 w-32 rounded-md shimmer" />
            <div className="h-3 w-48 rounded-md shimmer" />
          </div>
          {/* Controls */}
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="h-9 w-48 rounded-xl shimmer flex-1 sm:flex-none" />
            <div className="h-9 w-24 rounded-xl shimmer" />
          </div>
        </div>

        {/* Table Rows skeleton */}
        <div className="space-y-3.5">
          {/* Table Header block */}
          <div className="h-10 w-full rounded-xl bg-slate-100/50 dark:bg-slate-900/25 px-4 flex items-center gap-4">
            <div className="h-3 w-8 rounded-md shimmer shrink-0" />
            <div className="h-3 w-24 rounded-md shimmer" />
            <div className="h-3 w-40 rounded-md shimmer flex-1 hidden md:block" />
            <div className="h-3 w-28 rounded-md shimmer" />
            <div className="h-3 w-16 rounded-md shimmer text-right shrink-0" />
          </div>

          {/* 5 Loading Rows with Shimmering blocks */}
          {[1, 2, 3, 4, 5].map((idx) => (
            <div 
              key={idx} 
              className="h-14 w-full rounded-xl border border-slate-100/50 dark:border-slate-900/10 bg-white/30 dark:bg-slate-950/10 px-4 flex items-center gap-4 transition-all"
            >
              {/* Column 1: No */}
              <div className="h-4 w-6 rounded-md shimmer shrink-0" />
              
              {/* Column 2: Name / Detail */}
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full shimmer shrink-0" />
                <div className="space-y-1">
                  <div className="h-3 w-32 rounded-md shimmer" />
                  <div className="h-2 w-20 rounded-md shimmer" />
                </div>
              </div>

              {/* Column 3: Middle info (Description / Detail) */}
              <div className="h-3 w-44 rounded-md shimmer flex-1 hidden md:block" />

              {/* Column 4: Badge state */}
              <div className="h-5.5 w-20 rounded-full shimmer" />

              {/* Column 5: Action trigger */}
              <div className="h-7 w-7 rounded-lg shimmer shrink-0" />
            </div>
          ))}
        </div>

        {/* Pagination placeholder */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200/20 dark:border-slate-800/20">
          <div className="h-3 w-36 rounded-md shimmer" />
          <div className="flex gap-1">
            <div className="h-7.5 w-7.5 rounded-lg shimmer" />
            <div className="h-7.5 w-7.5 rounded-lg shimmer" />
            <div className="h-7.5 w-7.5 rounded-lg shimmer" />
          </div>
        </div>

      </div>

    </div>
  )
}
