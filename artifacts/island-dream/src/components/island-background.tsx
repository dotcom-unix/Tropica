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
          <filter id="soft-blur">
            <feGaussianBlur stdDeviation="22" />
          </filter>
          <filter id="cloud-blur">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <filter id="water-softness">
            <feTurbulence type="fractalNoise" baseFrequency=".008 .06" numOctaves="2" seed="8" result="noise" />
            <feColorMatrix in="noise" type="saturate" values="0" result="monoNoise" />
            <feComponentTransfer in="monoNoise" result="softNoise">
              <feFuncA type="table" tableValues="0 .13" />
            </feComponentTransfer>
            <feBlend in="SourceGraphic" in2="softNoise" mode="soft-light" />
          </filter>
          <pattern id="wave-lines" width="260" height="72" patternUnits="userSpaceOnUse">
            <path d="M-40 35 C 10 14, 55 14, 105 34 S 200 56, 300 28" fill="none" stroke="#baf5e8" strokeOpacity=".18" strokeWidth="4" />
            <path d="M-80 58 C 0 42, 45 43, 110 58 S 215 73, 340 48" fill="none" stroke="#e2fff3" strokeOpacity=".09" strokeWidth="2" />
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
        <path d="M0 608 C180 582 305 602 450 625 C620 652 735 604 880 616 C1040 629 1160 588 1300 608 C1430 627 1515 596 1600 612 L1600 720 L0 720 Z" fill="#54c8bd" opacity=".28" />
        <path d="M0 656 C160 631 300 655 464 675 C610 693 760 654 902 666 C1075 681 1184 640 1340 659 C1450 673 1528 654 1600 662 L1600 1000 L0 1000 Z" fill="#0a6f87" opacity=".58" />

        {/* Shallow aqua shelf and distant foam at the shoreline */}
        <path d="M0 626 C190 599 312 624 452 646 C610 671 742 624 883 637 C1038 651 1168 612 1303 630 C1432 647 1528 619 1600 630 L1600 690 C1450 679 1320 701 1170 678 C1000 653 895 699 735 673 C580 649 445 692 280 661 C168 640 84 654 0 668 Z" fill="#72d6c0" opacity=".24" />
        <path d="M0 641 C130 623 260 636 392 657 S 650 664 786 648 S 1030 630 1160 645 S 1410 664 1600 641" fill="none" stroke="#d8f5d1" strokeOpacity=".48" strokeWidth="5" />
        <path d="M20 649 C115 635 192 644 275 655 M486 663 C575 672 638 669 715 659 M1018 648 C1102 640 1180 647 1262 658 M1430 659 C1490 665 1542 659 1590 651" fill="none" stroke="#fff5ce" strokeOpacity=".58" strokeWidth="2.5" strokeLinecap="round" />

        {/* Sun path across the water */}
        <path d="M940 617 C1080 600 1260 604 1420 626 L1420 704 C1280 692 1110 690 965 705 Z" fill="url(#shore-glow)" opacity=".4" filter="url(#soft-blur)" />
        <path d="M1010 629 C1080 624 1140 625 1210 629 M1260 631 C1312 632 1352 636 1390 642 M1080 652 C1152 647 1195 649 1248 654 M1290 665 C1334 663 1366 666 1402 671 M1130 683 C1168 680 1200 682 1230 686" fill="none" stroke="#fff6c7" strokeOpacity=".62" strokeWidth="5" strokeLinecap="round" />

        {/* Animated ocean texture */}
        <rect y="618" width="1600" height="382" fill="url(#wave-lines)" opacity=".66" className="island-wave-texture" filter="url(#water-softness)" />
        <g fill="none" strokeLinecap="round">
          <path d="M-20 716 C120 683 260 725 405 710 S 690 686 842 718 S 1132 741 1288 712 S 1480 696 1620 713" stroke="#a6efe0" strokeOpacity=".34" strokeWidth="7" className="island-wave island-wave-one" />
          <path d="M-40 786 C110 756 248 790 368 782 M470 779 C610 750 720 767 842 788 M1000 796 C1120 768 1210 776 1335 792 M1450 786 C1510 775 1572 778 1640 789" stroke="#c3f5e7" strokeOpacity=".25" strokeWidth="4" className="island-wave island-wave-two" />
          <path d="M-30 868 C145 836 316 890 510 858 S 840 842 1008 873 S 1310 902 1630 854" stroke="#b9f1df" strokeOpacity=".2" strokeWidth="6" className="island-wave island-wave-three" />
          <path d="M-25 944 C130 916 280 958 430 939 M610 934 C760 908 870 930 1008 947 M1190 950 C1325 923 1450 952 1625 925" stroke="#d3f6e7" strokeOpacity=".14" strokeWidth="4" className="island-wave island-wave-two" />
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