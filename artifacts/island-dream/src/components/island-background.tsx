export function IslandBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="day-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#65c8e5" />
            <stop offset="42%" stopColor="#bce9ed" />
            <stop offset="63%" stopColor="#f8dca8" />
            <stop offset="100%" stopColor="#f3b778" />
          </linearGradient>
          <linearGradient id="sea-depth" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2fabb1" />
            <stop offset="35%" stopColor="#117f93" />
            <stop offset="100%" stopColor="#064a69" />
          </linearGradient>
          <linearGradient id="shore-glow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fff6cf" stopOpacity=".95" />
            <stop offset="50%" stopColor="#fff8dc" stopOpacity=".38" />
            <stop offset="100%" stopColor="#fff6cf" stopOpacity=".8" />
          </linearGradient>
          <radialGradient id="sun-glow">
            <stop offset="0%" stopColor="#fffbe4" stopOpacity="1" />
            <stop offset="35%" stopColor="#ffe8a1" stopOpacity=".82" />
            <stop offset="100%" stopColor="#ffd77d" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="palm-trunk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#39251f" />
            <stop offset="50%" stopColor="#70452c" />
            <stop offset="100%" stopColor="#2d2524" />
          </linearGradient>
          <filter id="soft-blur">
            <feGaussianBlur stdDeviation="22" />
          </filter>
          <filter id="cloud-blur">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <filter id="palm-shadow">
            <feDropShadow dx="5" dy="10" stdDeviation="8" floodColor="#073c4e" floodOpacity=".3" />
          </filter>
          <pattern id="wave-lines" width="260" height="72" patternUnits="userSpaceOnUse">
            <path d="M-40 35 C 10 14, 55 14, 105 34 S 200 56, 300 28" fill="none" stroke="#baf5e8" strokeOpacity=".28" strokeWidth="5" />
            <path d="M-80 58 C 0 42, 45 43, 110 58 S 215 73, 340 48" fill="none" stroke="#e2fff3" strokeOpacity=".14" strokeWidth="3" />
          </pattern>
        </defs>

        <rect width="1600" height="1000" fill="url(#day-sky)" />

        {/* Bright tropical haze and sun */}
        <ellipse cx="1240" cy="180" rx="340" ry="260" fill="url(#sun-glow)" />
        <circle cx="1240" cy="178" r="75" fill="#fff9d7" opacity=".95" />
        <circle cx="1240" cy="178" r="110" fill="none" stroke="#fff4bd" strokeOpacity=".32" strokeWidth="18" />

        {/* Soft trade-wind clouds */}
        <g fill="#fffdf5" opacity=".52" filter="url(#cloud-blur)">
          <path d="M130 220 C190 165 265 185 290 228 C335 188 425 204 440 258 C355 280 245 275 125 270 Z" />
          <path d="M730 155 C785 115 850 135 872 174 C922 138 1000 155 1017 207 C927 222 820 214 710 207 Z" />
          <path d="M1360 310 C1420 262 1500 285 1525 330 C1570 300 1630 318 1660 360 C1555 380 1465 370 1345 360 Z" />
        </g>

        {/* Distant island silhouettes */}
        <path d="M0 520 C180 494 260 484 350 505 C438 525 490 514 566 478 C642 442 712 468 788 503 C860 536 970 518 1055 495 C1140 472 1210 473 1298 506 C1380 536 1485 514 1600 490 L1600 650 L0 650 Z" fill="#2a7981" opacity=".3" />
        <path d="M0 555 C170 531 284 537 370 557 C464 578 544 559 640 524 C732 491 812 532 898 559 C1000 591 1095 546 1190 532 C1300 516 1424 562 1600 530 L1600 680 L0 680 Z" fill="#176d79" opacity=".32" />

        {/* Ocean body */}
        <path d="M0 572 C190 545 290 565 420 585 C575 610 694 566 830 577 C1000 591 1115 548 1250 567 C1390 586 1500 552 1600 570 L1600 1000 L0 1000 Z" fill="url(#sea-depth)" />
        <path d="M0 608 C180 582 305 602 450 625 C620 652 735 604 880 616 C1040 629 1160 588 1300 608 C1430 627 1515 596 1600 612 L1600 720 L0 720 Z" fill="#54c8bd" opacity=".35" />
        <path d="M0 656 C160 631 300 655 464 675 C610 693 760 654 902 666 C1075 681 1184 640 1340 659 C1450 673 1528 654 1600 662 L1600 1000 L0 1000 Z" fill="#0a6f87" opacity=".58" />

        {/* Sun path across the water */}
        <path d="M940 617 C1080 600 1260 604 1420 626 L1420 704 C1280 692 1110 690 965 705 Z" fill="url(#shore-glow)" opacity=".56" filter="url(#soft-blur)" />
        <path d="M1000 628 C1130 620 1260 622 1380 636" fill="none" stroke="#fff6c7" strokeOpacity=".75" strokeWidth="8" strokeLinecap="round" />

        {/* Animated ocean texture */}
        <rect y="618" width="1600" height="382" fill="url(#wave-lines)" opacity=".95" className="island-wave-texture" />
        <g fill="none" strokeLinecap="round">
          <path d="M-20 705 C160 665 280 718 455 697 S 760 679 930 710 S 1260 736 1620 687" stroke="#a6efe0" strokeOpacity=".42" strokeWidth="8" className="island-wave island-wave-one" />
          <path d="M-40 790 C155 744 312 800 500 774 S 825 755 1010 793 S 1330 816 1640 770" stroke="#83dfd5" strokeOpacity=".28" strokeWidth="10" className="island-wave island-wave-two" />
          <path d="M-30 890 C180 849 330 901 548 875 S 860 854 1070 895 S 1400 918 1630 870" stroke="#b9f1df" strokeOpacity=".18" strokeWidth="7" className="island-wave island-wave-three" />
        </g>

        {/* Foreground palm tree */}
        <g filter="url(#palm-shadow)">
          <path d="M190 1030 C210 890 224 740 267 595 C286 531 322 462 357 407" fill="none" stroke="url(#palm-trunk)" strokeWidth="39" strokeLinecap="round" />
          <path d="M206 1030 C236 860 260 710 286 600 C305 520 339 451 365 405" fill="none" stroke="#a56b3a" strokeOpacity=".35" strokeWidth="7" strokeLinecap="round" />
          <g fill="none" stroke="#2b3c26" strokeWidth="18" strokeLinecap="round">
            <path d="M360 405 C280 370 192 365 85 393" />
            <path d="M362 405 C260 326 188 273 93 254" />
            <path d="M365 403 C340 299 344 212 385 115" />
            <path d="M370 405 C425 303 505 242 606 205" />
            <path d="M371 408 C475 371 579 374 680 425" />
          </g>
          <g fill="none" stroke="#526b35" strokeWidth="9" strokeLinecap="round" opacity=".85">
            <path d="M355 404 C260 388 177 390 75 430" />
            <path d="M358 399 C262 300 182 235 112 214" />
            <path d="M365 400 C350 287 363 190 426 85" />
            <path d="M372 402 C451 292 540 238 638 231" />
            <path d="M378 410 C494 386 585 408 690 474" />
          </g>
          <ellipse cx="365" cy="405" rx="48" ry="33" fill="#513528" />
          <path d="M325 410 C345 440 382 441 407 413" fill="none" stroke="#8a5833" strokeWidth="9" />
        </g>
      </svg>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_55%_35%,rgba(255,255,255,.18),transparent_35%)]" />

      <style>{`
        @keyframes island-wave-drift {
          0%, 100% { transform: translateX(0) scaleY(1); }
          50% { transform: translateX(-24px) scaleY(1.04); }
        }
        @keyframes island-wave-drift-reverse {
          0%, 100% { transform: translateX(0) scaleY(1); }
          50% { transform: translateX(26px) scaleY(.96); }
        }
        @keyframes island-texture-drift {
          from { transform: translateX(0); }
          to { transform: translateX(-130px); }
        }
        .island-wave-one { animation: island-wave-drift 9s ease-in-out infinite; }
        .island-wave-two { animation: island-wave-drift-reverse 13s ease-in-out infinite; }
        .island-wave-three { animation: island-wave-drift 17s ease-in-out infinite; }
        .island-wave-texture {
          animation: island-texture-drift 24s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .island-wave, .island-wave-texture { animation: none; }
        }
      `}</style>
    </div>
  );
}