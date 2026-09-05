"use client";

import * as React from "react";
import Image from "next/image";

export function BackgroundClouds() {
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden -z-10 select-none"
      aria-hidden="true"
    >

      <div className="absolute inset-0 bg-gradient-to-b from-[#60a5fa]/90 via-[#7dd3fc] via-[#bae6fd] to-[#e0f2fe]" />

      <div className="absolute -top-32 right-0 sm:right-20 w-[600px] sm:w-[900px] h-[600px] sm:h-[900px] rounded-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-300/40 via-yellow-200/20 to-transparent blur-3xl pointer-events-none" />

      <div className="realistic-sun-glow absolute -top-24 sm:-top-32 right-0 sm:right-16 w-[450px] sm:w-[720px] aspect-square mix-blend-screen pointer-events-none">
        <Image
          src="/assets/sun-flare.png"
          alt="Realistic Sun"
          fill
          className="object-contain scale-110"
          priority
        />
      </div>

      <div className="absolute top-10 sm:top-14 right-28 sm:right-64 w-16 sm:w-24 h-16 sm:h-24 rounded-full bg-white shadow-[0_0_90px_35px_rgba(255,255,255,0.95)] blur-[1.5px] pointer-events-none" />

      <div className="absolute -top-40 right-10 sm:right-40 w-[700px] sm:w-[1100px] h-[700px] sm:h-[1100px] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/30 via-yellow-100/15 to-transparent blur-2xl pointer-events-none" />

      <svg className="absolute w-0 h-0" aria-hidden="true">
        <defs>
          <filter id="cloud-puff-filter" x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence type="fractalNoise" baseFrequency="0.013" numOctaves="4" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="32" xChannelSelector="R" yChannelSelector="G" />
            <feGaussianBlur stdDeviation="2.5" />
          </filter>

          <filter id="cloud-wisp-filter" x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence type="fractalNoise" baseFrequency="0.017" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="26" xChannelSelector="R" yChannelSelector="G" />
            <feGaussianBlur stdDeviation="2" />
          </filter>

          <radialGradient id="cloud-core-grad-1" cx="50%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="60%" stopColor="#ffffff" stopOpacity="0.98" />
            <stop offset="85%" stopColor="#f0f9ff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="cloud-core-grad-2" cx="45%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="55%" stopColor="#f8fafc" stopOpacity="0.95" />
            <stop offset="85%" stopColor="#e0f2fe" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>

      <div className="cloud-stream-ltr-1 absolute top-[2%] left-0 w-[420px] sm:w-[680px] h-[200px] sm:h-[300px]">
        <svg viewBox="0 0 520 240" className="w-full h-full filter drop-shadow-[0_16px_32px_rgba(255,255,255,0.95)]">
          <g filter="url(#cloud-puff-filter)">
            <ellipse cx="260" cy="150" rx="190" ry="52" fill="url(#cloud-core-grad-1)" />
            <circle cx="160" cy="125" r="62" fill="#ffffff" />
            <circle cx="235" cy="85" r="78" fill="#ffffff" />
            <circle cx="325" cy="105" r="68" fill="#ffffff" />
            <circle cx="390" cy="140" r="50" fill="#ffffff" />
          </g>
        </svg>
      </div>

      <div className="cloud-stream-rtl-1 absolute top-[8%] left-0 w-[480px] sm:w-[740px] h-[200px] sm:h-[280px]">
        <svg viewBox="0 0 560 220" className="w-full h-full filter drop-shadow-[0_14px_28px_rgba(255,255,255,0.9)]">
          <g filter="url(#cloud-wisp-filter)">
            <ellipse cx="290" cy="120" rx="220" ry="46" fill="url(#cloud-core-grad-2)" />
            <circle cx="180" cy="95" r="58" fill="#ffffff" />
            <circle cx="270" cy="70" r="65" fill="#ffffff" />
            <circle cx="365" cy="88" r="55" fill="#ffffff" />
            <circle cx="435" cy="115" r="42" fill="#ffffff" />
          </g>
        </svg>
      </div>

      <div className="cloud-stream-ltr-2 absolute top-[18%] left-0 w-[440px] sm:w-[700px] h-[210px] sm:h-[290px]">
        <svg viewBox="0 0 500 230" className="w-full h-full filter drop-shadow-[0_16px_30px_rgba(255,255,255,0.9)]">
          <g filter="url(#cloud-puff-filter)">
            <ellipse cx="250" cy="145" rx="180" ry="48" fill="url(#cloud-core-grad-1)" />
            <circle cx="150" cy="120" r="58" fill="#ffffff" />
            <circle cx="225" cy="85" r="72" fill="#ffffff" />
            <circle cx="310" cy="105" r="64" fill="#ffffff" />
            <circle cx="370" cy="135" r="46" fill="#ffffff" />
          </g>
        </svg>
      </div>

      <div className="cloud-stream-rtl-2 absolute top-[28%] left-0 w-[400px] sm:w-[620px] h-[190px] sm:h-[260px]">
        <svg viewBox="0 0 480 210" className="w-full h-full filter drop-shadow-[0_12px_24px_rgba(255,255,255,0.85)]">
          <g filter="url(#cloud-wisp-filter)">
            <ellipse cx="240" cy="115" rx="175" ry="42" fill="url(#cloud-core-grad-2)" />
            <circle cx="150" cy="92" r="52" fill="#ffffff" />
            <circle cx="230" cy="68" r="60" fill="#ffffff" />
            <circle cx="315" cy="85" r="50" fill="#ffffff" />
            <circle cx="375" cy="110" r="38" fill="#ffffff" />
          </g>
        </svg>
      </div>

      <div className="cloud-stream-ltr-3 absolute top-[40%] left-0 w-[460px] sm:w-[740px] h-[220px] sm:h-[310px]">
        <svg viewBox="0 0 530 250" className="w-full h-full filter drop-shadow-[0_16px_32px_rgba(255,255,255,0.92)]">
          <g filter="url(#cloud-puff-filter)">
            <ellipse cx="265" cy="155" rx="195" ry="54" fill="url(#cloud-core-grad-1)" />
            <circle cx="165" cy="130" r="64" fill="#ffffff" />
            <circle cx="245" cy="90" r="80" fill="#ffffff" />
            <circle cx="335" cy="110" r="70" fill="#ffffff" />
            <circle cx="400" cy="145" r="52" fill="#ffffff" />
          </g>
        </svg>
      </div>

      <div className="cloud-stream-rtl-3 absolute top-[52%] left-0 w-[440px] sm:w-[680px] h-[200px] sm:h-[280px]">
        <svg viewBox="0 0 510 220" className="w-full h-full filter drop-shadow-[0_14px_28px_rgba(255,255,255,0.88)]">
          <g filter="url(#cloud-wisp-filter)">
            <ellipse cx="260" cy="120" rx="190" ry="45" fill="url(#cloud-core-grad-2)" />
            <circle cx="165" cy="95" r="55" fill="#ffffff" />
            <circle cx="250" cy="72" r="62" fill="#ffffff" />
            <circle cx="340" cy="88" r="52" fill="#ffffff" />
            <circle cx="395" cy="115" r="40" fill="#ffffff" />
          </g>
        </svg>
      </div>

      <div className="cloud-stream-ltr-4 absolute top-[64%] left-0 w-[420px] sm:w-[660px] h-[200px] sm:h-[280px]">
        <svg viewBox="0 0 490 220" className="w-full h-full filter drop-shadow-[0_14px_28px_rgba(255,255,255,0.85)]">
          <g filter="url(#cloud-puff-filter)">
            <ellipse cx="245" cy="140" rx="175" ry="46" fill="url(#cloud-core-grad-1)" />
            <circle cx="150" cy="115" r="55" fill="#ffffff" />
            <circle cx="220" cy="82" r="68" fill="#ffffff" />
            <circle cx="305" cy="100" r="60" fill="#ffffff" />
            <circle cx="360" cy="130" r="44" fill="#ffffff" />
          </g>
        </svg>
      </div>

      <div className="cloud-stream-rtl-4 absolute top-[74%] left-0 w-[460px] sm:w-[720px] h-[210px] sm:h-[290px]">
        <svg viewBox="0 0 520 230" className="w-full h-full filter drop-shadow-[0_14px_28px_rgba(255,255,255,0.88)]">
          <g filter="url(#cloud-wisp-filter)">
            <ellipse cx="265" cy="125" rx="195" ry="46" fill="url(#cloud-core-grad-2)" />
            <circle cx="170" cy="100" r="56" fill="#ffffff" />
            <circle cx="255" cy="75" r="64" fill="#ffffff" />
            <circle cx="345" cy="92" r="54" fill="#ffffff" />
            <circle cx="405" cy="120" r="42" fill="#ffffff" />
          </g>
        </svg>
      </div>

      <div className="cloud-stream-ltr-5 absolute top-[84%] left-0 w-[450px] sm:w-[700px] h-[210px] sm:h-[290px]">
        <svg viewBox="0 0 500 230" className="w-full h-full filter drop-shadow-[0_16px_30px_rgba(255,255,255,0.9)]">
          <g filter="url(#cloud-puff-filter)">
            <ellipse cx="250" cy="145" rx="180" ry="48" fill="url(#cloud-core-grad-1)" />
            <circle cx="155" cy="120" r="58" fill="#ffffff" />
            <circle cx="230" cy="85" r="72" fill="#ffffff" />
            <circle cx="315" cy="105" r="64" fill="#ffffff" />
            <circle cx="375" cy="135" r="46" fill="#ffffff" />
          </g>
        </svg>
      </div>

      <div className="cloud-stream-rtl-5 absolute top-[92%] left-0 w-[480px] sm:w-[750px] h-[220px] sm:h-[300px]">
        <svg viewBox="0 0 540 240" className="w-full h-full filter drop-shadow-[0_14px_28px_rgba(255,255,255,0.85)]">
          <g filter="url(#cloud-wisp-filter)">
            <ellipse cx="270" cy="130" rx="200" ry="48" fill="url(#cloud-core-grad-2)" />
            <circle cx="175" cy="105" r="58" fill="#ffffff" />
            <circle cx="260" cy="78" r="66" fill="#ffffff" />
            <circle cx="350" cy="95" r="56" fill="#ffffff" />
            <circle cx="415" cy="125" r="44" fill="#ffffff" />
          </g>
        </svg>
      </div>
    </div>
  );
}
