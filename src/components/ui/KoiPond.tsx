"use client";

import React from "react";

export default function KoiPond() {
  return (
    <div
      className="relative shrink-0 w-full select-none"
      style={{ maxWidth: 300 }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 300 180"
        className="w-full h-auto"
        style={{
          borderRadius: 14,
          border: "1px solid rgba(0,212,255,0.18)",
          boxShadow:
            "0 0 30px rgba(0,212,255,0.08), 0 0 80px rgba(0,212,255,0.03), inset 0 0 40px rgba(0,0,0,0.4)",
        }}
      >
        <defs>
          {/* Pond water gradient */}
          <radialGradient id="pondWater" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#0d1a2d" />
            <stop offset="50%" stopColor="#0a1525" />
            <stop offset="100%" stopColor="#060d18" />
          </radialGradient>

          {/* Water surface shimmer */}
          <linearGradient id="waterShimmer" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(0,212,255,0.04)" />
            <stop offset="50%" stopColor="rgba(0,212,255,0.01)" />
            <stop offset="100%" stopColor="rgba(0,212,255,0.06)" />
          </linearGradient>

          {/* Koi gradients */}
          <linearGradient id="koiOrangeBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF8C42" />
            <stop offset="40%" stopColor="#FF6B35" />
            <stop offset="100%" stopColor="#D9431E" />
          </linearGradient>
          <linearGradient id="koiOrangeHead" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FF9E5A" />
            <stop offset="100%" stopColor="#FF6B35" />
          </linearGradient>
          <linearGradient id="koiOrangeTail" x1="100%" y1="50%" x2="0%" y2="50%">
            <stop offset="0%" stopColor="#FF6B35" />
            <stop offset="100%" stopColor="#FFAA66" />
          </linearGradient>

          <linearGradient id="koiWhiteBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F8F8FA" />
            <stop offset="40%" stopColor="#E8E8EE" />
            <stop offset="100%" stopColor="#C8C8D4" />
          </linearGradient>
          <linearGradient id="koiWhiteHead" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E8E8EE" />
          </linearGradient>

          {/* Lily pad gradient */}
          <radialGradient id="lilyGrad" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#2d6b3f" />
            <stop offset="100%" stopColor="#1a4a2a" />
          </radialGradient>

          {/* Rock gradient */}
          <linearGradient id="rockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2a2d3a" />
            <stop offset="100%" stopColor="#1a1c28" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="pondGlow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="koiShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="rgba(0,0,0,0.3)" />
          </filter>

          {/* Koi Orange definition (reusable template) */}
          <g id="koiOrangeShape">
            {/* Tail fin */}
            <g style={{ transformOrigin: "-14px 0px", animation: "tailWag 0.6s ease-in-out infinite" }}>
              <path
                d="M-14,0 C-19,-3 -26,-8 -30,-11 C-26,-5 -20,0 -14,0 C-20,0 -26,5 -30,11 C-26,8 -19,3 -14,0 Z"
                fill="url(#koiOrangeTail)"
                opacity="0.85"
              />
              {/* Tail rays */}
              <line x1="-14" y1="0" x2="-28" y2="-9" stroke="rgba(255,180,130,0.4)" strokeWidth="0.4" />
              <line x1="-14" y1="0" x2="-26" y2="-6" stroke="rgba(255,180,130,0.3)" strokeWidth="0.3" />
              <line x1="-14" y1="0" x2="-28" y2="9" stroke="rgba(255,180,130,0.4)" strokeWidth="0.4" />
              <line x1="-14" y1="0" x2="-26" y2="6" stroke="rgba(255,180,130,0.3)" strokeWidth="0.3" />
            </g>

            {/* Body core */}
            <ellipse cx="0" cy="0" rx="15" ry="7" fill="url(#koiOrangeBody)" />

            {/* Body highlight */}
            <ellipse cx="1" cy="-2" rx="13" ry="4.5" fill="rgba(255,255,255,0.08)" />

            {/* Head */}
            <ellipse cx="14" cy="0" rx="6.5" ry="7.5" fill="url(#koiOrangeHead)" />

            {/* White pattern spots (Kohaku-style) */}
            <ellipse cx="-5" cy="2" rx="6" ry="3.5" fill="rgba(255,250,245,0.5)" />
            <ellipse cx="2" cy="-4" rx="5" ry="2.5" fill="rgba(255,250,245,0.4)" />
            <ellipse cx="-10" cy="-1" rx="3" ry="2" fill="rgba(255,250,245,0.3)" />

            {/* Dorsal fin */}
            <g style={{ transformOrigin: "2px -6px", animation: "dorsalFlutter 1.4s ease-in-out infinite" }}>
              <path
                d="M-6,-6.5 C-2,-13 6,-13 10,-6 C7,-8 3,-9 -6,-6.5 Z"
                fill="rgba(255,120,60,0.55)"
              />
            </g>

            {/* Pectoral fins */}
            <g style={{ transformOrigin: "7px 5px", animation: "finFlutter 0.9s ease-in-out infinite" }}>
              <path
                d="M7,5 C11,13 17,15 13,5.5 Z"
                fill="rgba(255,100,40,0.5)"
              />
              <path
                d="M3,4.5 C6,10 11,11 9,4.5 Z"
                fill="rgba(255,110,50,0.4)"
              />
            </g>

            {/* Eye */}
            <circle cx="18.5" cy="-2" r="1.8" fill="#0a0a15" />
            <circle cx="18.9" cy="-2.4" r="0.6" fill="rgba(255,255,255,0.55)" />

            {/* Barbels (whiskers) */}
            <path d="M20,1.5 C24,4 26,2 25.5,0" stroke="rgba(255,180,140,0.5)" strokeWidth="0.5" fill="none" />
            <path d="M20,-1.5 C24,-4 26,-2 25.5,0" stroke="rgba(255,180,140,0.5)" strokeWidth="0.5" fill="none" />

            {/* Subtle scale lines */}
            <path d="M-8,0 C-4,-5 4,-5 8,0" stroke="rgba(255,255,255,0.08)" strokeWidth="0.3" fill="none" />
            <path d="M-6,3 C-2,-1 6,0 10,3" stroke="rgba(255,255,255,0.06)" strokeWidth="0.3" fill="none" />
            <path d="M-6,-3 C-2,-7 6,-7 10,-3" stroke="rgba(255,255,255,0.06)" strokeWidth="0.3" fill="none" />
          </g>

          {/* Koi White definition */}
          <g id="koiWhiteShape">
            {/* Tail fin */}
            <g style={{ transformOrigin: "-14px 0px", animation: "tailWag 0.75s ease-in-out infinite 0.2s" }}>
              <path
                d="M-14,0 C-20,-3 -28,-9 -33,-12 C-28,-5 -22,0 -14,0 C-22,0 -28,5 -33,12 C-28,9 -20,3 -14,0 Z"
                fill="rgba(220,220,235,0.8)"
              />
              <line x1="-14" y1="0" x2="-31" y2="-10" stroke="rgba(200,200,220,0.4)" strokeWidth="0.4" />
              <line x1="-14" y1="0" x2="-28" y2="-7" stroke="rgba(200,200,220,0.3)" strokeWidth="0.3" />
              <line x1="-14" y1="0" x2="-31" y2="10" stroke="rgba(200,200,220,0.4)" strokeWidth="0.4" />
              <line x1="-14" y1="0" x2="-28" y2="7" stroke="rgba(200,200,220,0.3)" strokeWidth="0.3" />
            </g>

            {/* Body */}
            <ellipse cx="0" cy="0" rx="14" ry="6.5" fill="url(#koiWhiteBody)" />

            {/* Head */}
            <ellipse cx="13" cy="0" rx="6" ry="7" fill="url(#koiWhiteHead)" />

            {/* Red pattern spots (classic Sanke-style) */}
            <ellipse cx="-3" cy="3" rx="4.5" ry="2.5" fill="rgba(220,50,30,0.7)" />
            <ellipse cx="5" cy="-3.5" rx="3.5" ry="2" fill="rgba(220,50,30,0.6)" />
            <ellipse cx="-9" cy="-2" rx="3" ry="1.8" fill="rgba(220,50,30,0.5)" />

            {/* Black spots */}
            <circle cx="-6" cy="1" r="1.2" fill="rgba(15,15,25,0.5)" />
            <circle cx="8" cy="3" r="0.8" fill="rgba(15,15,25,0.4)" />
            <circle cx="-1" cy="-4" r="1" fill="rgba(15,15,25,0.35)" />

            {/* Dorsal fin */}
            <g style={{ transformOrigin: "2px -6px", animation: "dorsalFlutter 1.6s ease-in-out infinite 0.3s" }}>
              <path
                d="M-5,-6 C-1,-12 7,-12 10,-5.5 C7,-7.5 3,-8.5 -5,-6 Z"
                fill="rgba(200,200,220,0.45)"
              />
            </g>

            {/* Pectoral fins */}
            <g style={{ transformOrigin: "6px 4.5px", animation: "finFlutter 1.1s ease-in-out infinite 0.15s" }}>
              <path
                d="M6,4.5 C10,12 16,14 12,5 Z"
                fill="rgba(220,220,240,0.4)"
              />
              <path
                d="M2,4 C5,9 10,10 8,4 Z"
                fill="rgba(220,220,240,0.35)"
              />
            </g>

            {/* Eye */}
            <circle cx="17" cy="-2" r="1.7" fill="#0a0a15" />
            <circle cx="17.4" cy="-2.4" r="0.55" fill="rgba(255,255,255,0.55)" />

            {/* Barbels */}
            <path d="M19,1.5 C23,4 25,2 24.5,0" stroke="rgba(220,220,240,0.4)" strokeWidth="0.5" fill="none" />
            <path d="M19,-1.5 C23,-4 25,-2 24.5,0" stroke="rgba(220,220,240,0.4)" strokeWidth="0.5" fill="none" />

            {/* Subtle metallic shimmer */}
            <ellipse cx="2" cy="-2" rx="10" ry="3.5" fill="rgba(255,255,255,0.12)" />
          </g>
        </defs>

        {/* ===== POND BACKGROUND ===== */}
        <rect x="0" y="0" width="300" height="180" rx="14" fill="url(#pondWater)" />

        {/* Inner shadow / depth */}
        <rect
          x="2"
          y="2"
          width="296"
          height="176"
          rx="12"
          fill="none"
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="2"
        />

        {/* Water shimmer overlay */}
        <rect x="0" y="0" width="300" height="180" rx="14" fill="url(#waterShimmer)" />

        {/* ===== ROCKS ===== */}
        {/* Top edge rocks */}
        <g fill="url(#rockGrad)" opacity="0.8">
          <path d="M15,4 C20,2 28,2 32,6 C30,8 22,8 15,4 Z" />
          <path d="M55,2 C62,0 72,3 75,7 C68,8 58,7 55,2 Z" />
          <path d="M110,3 C115,1 122,3 125,6 C120,8 113,6 110,3 Z" />
          <path d="M200,2 C208,0 216,3 218,7 C212,8 204,6 200,2 Z" />
          <path d="M250,3 C256,1 264,2 266,6 C260,7 253,5 250,3 Z" />
        </g>

        {/* Bottom edge rocks */}
        <g fill="url(#rockGrad)" opacity="0.7">
          <path d="M30,174 C38,172 46,175 48,178 C40,179 32,177 30,174 Z" />
          <path d="M100,173 C108,171 116,174 118,177 C110,178 102,176 100,173 Z" />
          <path d="M180,175 C188,173 196,176 198,179 C190,179 182,177 180,175 Z" />
          <path d="M260,172 C268,170 276,173 278,176 C270,178 262,176 260,172 Z" />
        </g>

        {/* Left edge small rocks */}
        <g fill="url(#rockGrad)" opacity="0.6">
          <path d="M4,40 C2,48 4,56 7,58 C9,52 8,44 4,40 Z" />
          <path d="M3,90 C1,98 3,106 6,108 C8,102 7,94 3,90 Z" />
          <path d="M4,140 C2,148 5,156 8,158 C10,152 9,144 4,140 Z" />
        </g>

        {/* ===== BAMBOO ===== */}
        <g transform="translate(270, 55)">
          {/* Stalk 1 */}
          <rect x="0" y="-20" width="3.5" height="80" rx="1.5" fill="#2a4a22" />
          <line x1="0" y1="0" x2="3.5" y2="0" stroke="#1a3015" strokeWidth="0.8" />
          <line x1="0" y1="20" x2="3.5" y2="20" stroke="#1a3015" strokeWidth="0.8" />
          <line x1="0" y1="40" x2="3.5" y2="40" stroke="#1a3015" strokeWidth="0.8" />
          {/* Leaves */}
          <path d="M3.5,-10 C10,-15 16,-8 12,-4" fill="#3a6a30" opacity="0.8" />
          <path d="M3.5,5 C10,2 14,8 10,12" fill="#3a6a30" opacity="0.7" />

          {/* Stalk 2 */}
          <rect x="6" y="-10" width="3" height="70" rx="1.5" fill="#2d5025" />
          <line x1="6" y1="10" x2="9" y2="10" stroke="#1a3015" strokeWidth="0.7" />
          <line x1="6" y1="30" x2="9" y2="30" stroke="#1a3015" strokeWidth="0.7" />
          <line x1="6" y1="50" x2="9" y2="50" stroke="#1a3015" strokeWidth="0.7" />
          <path d="M9,0 C14,3 16,-3 12,-6" fill="#3a6a30" opacity="0.7" />
        </g>

        {/* ===== STONE LANTERN ===== */}
        <g transform="translate(255, 38)" opacity="0.75">
          {/* Base */}
          <rect x="-5" y="14" width="10" height="3" rx="1" fill="#353545" />
          {/* Pillar */}
          <rect x="-2.5" y="2" width="5" height="13" rx="1" fill="#404055" />
          {/* Chamber */}
          <rect x="-4" y="-4" width="8" height="7" rx="1" fill="#3a3a4a" />
          {/* Lantern window (dark) */}
          <rect x="-2.5" y="-2.5" width="5" height="4.5" rx="0.5" fill="#1a1a25" />
          {/* Roof */}
          <path d="M-7,-4 L7,-4 L4,-9 L-4,-9 Z" fill="#3a3a4a" />
          {/* Top knob */}
          <circle cx="0" cy="-10" r="1.5" fill="#404055" />
          {/* Warm glow from lantern */}
          <circle cx="0" cy="0" r="6" fill="rgba(255,180,80,0.12)" className="lantern-glow" />
          <circle cx="0" cy="0" r="3" fill="rgba(255,200,100,0.18)" />
        </g>

        {/* ===== LILY PADS ===== */}
        {/* Lily pad 1 */}
        <g transform="translate(65, 130)" style={{ animation: "lilyBob 5s ease-in-out infinite" }}>
          <ellipse cx="0" cy="0" rx="10" ry="7" fill="url(#lilyGrad)" />
          {/* Wedge cutout */}
          <path
            d="M0,0 L10,0 A10,7 0 0,1 5,7 Z"
            fill="url(#pondWater)"
            opacity="0.9"
          />
          {/* Pad veins */}
          <line x1="-6" y1="0" x2="10" y2="0" stroke="#1a3a20" strokeWidth="0.4" opacity="0.5" />
          <line x1="0" y1="-6" x2="0" y2="4" stroke="#1a3a20" strokeWidth="0.3" opacity="0.4" />
          <line x1="-4" y1="-3" x2="6" y2="2" stroke="#1a3a20" strokeWidth="0.3" opacity="0.3" />
          <line x1="4" y1="-3" x2="-6" y2="2" stroke="#1a3a20" strokeWidth="0.3" opacity="0.3" />
          {/* Small flower bud */}
          <circle cx="2" cy="-5" r="2.5" fill="rgba(255,140,180,0.6)" />
          <circle cx="2" cy="-5" r="1.2" fill="rgba(255,180,200,0.7)" />
        </g>

        {/* Lily pad 2 (smaller) */}
        <g transform="translate(190, 42)" style={{ animation: "lilyBob 6s ease-in-out infinite 1.5s" }}>
          <ellipse cx="0" cy="0" rx="7" ry="5" fill="url(#lilyGrad)" />
          <path
            d="M0,0 L7,0 A7,5 0 0,1 3.5,5 Z"
            fill="url(#pondWater)"
            opacity="0.9"
          />
          <line x1="-4" y1="0" x2="7" y2="0" stroke="#1a3a20" strokeWidth="0.3" opacity="0.5" />
          <line x1="0" y1="-4" x2="0" y2="3" stroke="#1a3a20" strokeWidth="0.3" opacity="0.4" />
        </g>

        {/* Lily pad 3 */}
        <g transform="translate(240, 155)" style={{ animation: "lilyBob 7s ease-in-out infinite 3s" }}>
          <ellipse cx="0" cy="0" rx="8" ry="5.5" fill="url(#lilyGrad)" opacity="0.8" />
          <path
            d="M0,0 L8,0 A8,5.5 0 0,1 4,5.5 Z"
            fill="url(#pondWater)"
            opacity="0.9"
          />
          <line x1="-5" y1="0" x2="8" y2="0" stroke="#1a3a20" strokeWidth="0.3" opacity="0.4" />
        </g>

        {/* ===== WATER RIPPLES ===== */}
        {/* Ripple 1 - center */}
        <circle
          cx="150"
          cy="90"
          r="2"
          fill="none"
          stroke="rgba(0,212,255,0.25)"
          strokeWidth="0.6"
          style={{ animation: "ripple1 4s ease-out infinite" }}
        />
        <circle
          cx="150"
          cy="90"
          r="2"
          fill="none"
          stroke="rgba(0,212,255,0.15)"
          strokeWidth="0.5"
          style={{ animation: "ripple1 4s ease-out infinite 1.5s" }}
        />

        {/* Ripple 2 */}
        <circle
          cx="80"
          cy="60"
          r="1"
          fill="none"
          stroke="rgba(0,212,255,0.2)"
          strokeWidth="0.5"
          style={{ animation: "ripple2 5s ease-out infinite 0.8s" }}
        />
        <circle
          cx="80"
          cy="60"
          r="1"
          fill="none"
          stroke="rgba(0,212,255,0.12)"
          strokeWidth="0.4"
          style={{ animation: "ripple2 5s ease-out infinite 2.5s" }}
        />

        {/* Ripple 3 */}
        <circle
          cx="220"
          cy="120"
          r="1"
          fill="none"
          stroke="rgba(0,212,255,0.18)"
          strokeWidth="0.5"
          style={{ animation: "ripple3 6s ease-out infinite 2s" }}
        />
        <circle
          cx="220"
          cy="120"
          r="1"
          fill="none"
          stroke="rgba(0,212,255,0.1)"
          strokeWidth="0.4"
          style={{ animation: "ripple3 6s ease-out infinite 4s" }}
        />

        {/* Ripple 4 - near lily pad */}
        <circle
          cx="65"
          cy="135"
          r="1"
          fill="none"
          stroke="rgba(0,212,255,0.15)"
          strokeWidth="0.4"
          style={{ animation: "ripple2 5.5s ease-out infinite 3.5s" }}
        />

        {/* ===== WATER SURFACE REFLECTIONS ===== */}
        <line
          x1="40"
          y1="50"
          x2="55"
          y2="45"
          stroke="rgba(0,212,255,0.06)"
          strokeWidth="0.8"
          style={{ animation: "reflectionShimmer 3s ease-in-out infinite" }}
        />
        <line
          x1="160"
          y1="30"
          x2="180"
          y2="28"
          stroke="rgba(0,212,255,0.05)"
          strokeWidth="0.7"
          style={{ animation: "reflectionShimmer 3.5s ease-in-out infinite 1s" }}
        />
        <line
          x1="100"
          y1="150"
          x2="115"
          y2="148"
          stroke="rgba(0,212,255,0.04)"
          strokeWidth="0.6"
          style={{ animation: "reflectionShimmer 4s ease-in-out infinite 2s" }}
        />

        {/* ===== KOI FISH ===== */}
        {/* Koi 1 - Orange (swimming clockwise elliptical loop) */}
        <g
          filter="url(#koiShadow)"
          style={{
            animation: "swimKoi1 16s ease-in-out infinite",
            transformOrigin: "0px 0px",
            willChange: "transform",
          }}
        >
          <use href="#koiOrangeShape" />
        </g>

        {/* Koi 2 - White (swimming counter-clockwise, different path) */}
        <g
          filter="url(#koiShadow)"
          style={{
            animation: "swimKoi2 14s ease-in-out infinite",
            transformOrigin: "0px 0px",
            willChange: "transform",
          }}
        >
          <use href="#koiWhiteShape" />
        </g>

        {/* Koi 3 - Smaller orange koi */}
        <g
          filter="url(#koiShadow)"
          opacity="0.75"
          style={{
            animation: "swimKoi3 20s ease-in-out infinite",
            transformOrigin: "0px 0px",
            willChange: "transform",
          }}
        >
          <g transform="scale(0.65)">
            <use href="#koiOrangeShape" />
          </g>
        </g>
      </svg>

      {/* ===== CSS ANIMATIONS ===== */}
      <style>{`
        /* Tail wagging */
        @keyframes tailWag {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(7deg); }
          75% { transform: rotate(-7deg); }
        }

        /* Dorsal fin flutter */
        @keyframes dorsalFlutter {
          0%, 100% { transform: rotate(0deg); }
          30% { transform: rotate(-5deg); }
          70% { transform: rotate(5deg); }
        }

        /* Pectoral fin flutter */
        @keyframes finFlutter {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(12deg); }
          50% { transform: rotate(-10deg); }
          80% { transform: rotate(6deg); }
        }

        /* Koi 1 swimming path — wide clockwise ellipse */
        @keyframes swimKoi1 {
          0%   { transform: translate(70px, 90px) rotate(280deg); }
          8%   { transform: translate(90px, 70px) rotate(315deg); }
          16%  { transform: translate(120px, 58px) rotate(350deg); }
          25%  { transform: translate(155px, 55px) rotate(15deg); }
          33%  { transform: translate(190px, 60px) rotate(55deg); }
          41%  { transform: translate(215px, 75px) rotate(90deg); }
          50%  { transform: translate(228px, 95px) rotate(130deg); }
          58%  { transform: translate(220px, 115px) rotate(165deg); }
          66%  { transform: translate(195px, 130px) rotate(200deg); }
          75%  { transform: translate(155px, 135px) rotate(235deg); }
          83%  { transform: translate(115px, 128px) rotate(265deg); }
          91%  { transform: translate(85px, 110px) rotate(290deg); }
          100% { transform: translate(70px, 90px) rotate(280deg); }
        }

        /* Koi 2 swimming path — tighter counter-clockwise ellipse */
        @keyframes swimKoi2 {
          0%   { transform: translate(220px, 80px) rotate(100deg); }
          10%  { transform: translate(205px, 65px) rotate(70deg); }
          20%  { transform: translate(180px, 58px) rotate(40deg); }
          30%  { transform: translate(150px, 60px) rotate(10deg); }
          40%  { transform: translate(120px, 72px) rotate(340deg); }
          50%  { transform: translate(105px, 90px) rotate(310deg); }
          60%  { transform: translate(115px, 108px) rotate(280deg); }
          70%  { transform: translate(145px, 118px) rotate(250deg); }
          80%  { transform: translate(180px, 112px) rotate(220deg); }
          90%  { transform: translate(210px, 98px) rotate(160deg); }
          100% { transform: translate(220px, 80px) rotate(100deg); }
        }

        /* Koi 3 swimming path — gentle meander */
        @keyframes swimKoi3 {
          0%   { transform: translate(40px, 45px) rotate(10deg); }
          12%  { transform: translate(80px, 50px) rotate(25deg); }
          25%  { transform: translate(130px, 42px) rotate(15deg); }
          37%  { transform: translate(180px, 48px) rotate(-5deg); }
          50%  { transform: translate(230px, 55px) rotate(-20deg); }
          62%  { transform: translate(260px, 50px) rotate(-10deg); }
          75%  { transform: translate(210px, 42px) rotate(170deg); }
          87%  { transform: translate(140px, 48px) rotate(180deg); }
          100% { transform: translate(40px, 45px) rotate(10deg); }
        }

        /* Water ripple pulses */
        @keyframes ripple1 {
          0%   { r: 2; opacity: 0.6; }
          100% { r: 35; opacity: 0; }
        }
        @keyframes ripple2 {
          0%   { r: 1.5; opacity: 0.5; }
          100% { r: 25; opacity: 0; }
        }
        @keyframes ripple3 {
          0%   { r: 1; opacity: 0.45; }
          100% { r: 30; opacity: 0; }
        }

        /* Lily pad gentle bobbing */
        @keyframes lilyBob {
          0%, 100% { transform: translate(0px, 0px) rotate(0deg); }
          25% { transform: translate(1px, -1px) rotate(0.5deg); }
          50% { transform: translate(0px, -2px) rotate(0deg); }
          75% { transform: translate(-1px, -1px) rotate(-0.5deg); }
        }

        /* Water surface reflection shimmer */
        @keyframes reflectionShimmer {
          0%, 100% { opacity: 0.04; }
          50% { opacity: 0.08; }
        }

        /* Lantern glow pulse */
        .lantern-glow {
          animation: lanternPulse 3s ease-in-out infinite;
        }
        @keyframes lanternPulse {
          0%, 100% { opacity: 0.08; r: 5; }
          50% { opacity: 0.18; r: 7; }
        }
      `}</style>
    </div>
  );
}
