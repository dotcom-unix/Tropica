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
        <rect y="618" width="1600" height="382" fill="url(#wave-lines)" opacity=".66" className="island-wave-texture" />
        <g fill="none" strokeLinecap="round">
          <path d="M-20 716 C120 683 260 725 405 710 S 690 686 842 718 S 1132 741 1288 712 S 1480 696 1620 713" stroke="#a6efe0" strokeOpacity=".34" strokeWidth="7" className="island-wave island-wave-one" />
          <path d="M-40 786 C110 756 248 790 368 782 M470 779 C610 750 720 767 842 788 M1000 796 C1120 768 1210 776 1335 792 M1450 786 C1510 775 1572 778 1640 789" stroke="#c3f5e7" strokeOpacity=".25" strokeWidth="4" className="island-wave island-wave-two" />
          <path d="M-30 868 C145 836 316 890 510 858 S 840 842 1008 873 S 1310 902 1630 854" stroke="#b9f1df" strokeOpacity=".2" strokeWidth="6" className="island-wave island-wave-three" />
          <path d="M-25 944 C130 916 280 958 430 939 M610 934 C760 908 870 930 1008 947 M1190 950 C1325 923 1450 952 1625 925" stroke="#d3f6e7" strokeOpacity=".14" strokeWidth="4" className="island-wave island-wave-two" />
        </g>

        {/* Foreground palm tree */}
        <g transform="translate(80 225) scale(.62)" filter="url(#palm-shadow)" opacity=".86">
          <path d="M190 1030 C210 890 224 740 267 595 C286 531 322 462 357 407" fill="none" stroke="url(#palm-trunk)" strokeWidth="39" strokeLinecap="round" />
          <path d="M206 1030 C236 860 260 710 286 600 C305 520 339 451 365 405" fill="none" stroke="#b77742" strokeOpacity=".35" strokeWidth="7" strokeLinecap="round" />
          <g fill="none" stroke="#263b2b" strokeWidth="14" strokeLinecap="round">
            <path d="M360 405 C280 370 192 365 85 393" />
            <path d="M362 405 C260 326 188 273 93 254" />
            <path d="M365 403 C340 299 344 212 385 115" />
            <path d="M370 405 C425 303 505 242 606 205" />
            <path d="M371 408 C475 371 579 374 680 425" />
          </g>
          <g fill="none" stroke="#4c713e" strokeWidth="6" strokeLinecap="round" opacity=".92">
            <path d="M355 404 C260 388 177 390 75 430" />
            <path d="M358 399 C262 300 182 235 112 214" />
            <path d="M365 400 C350 287 363 190 426 85" />
            <path d="M372 402 C451 292 540 238 638 231" />
            <path d="M378 410 C494 386 585 408 690 474" />
          </g>
          <g fill="none" stroke="#6e9149" strokeWidth="4" strokeLinecap="round" opacity=".82">
            <path d="M302 389 l-42 -31 M275 385 l-49 -12 M245 383 l-48 7 M215 386 l-44 24 M185 394 l-38 35" />
            <path d="M315 367 l-30 -52 M295 349 l-39 -46 M274 331 l-42 -37 M252 315 l-42 -28 M228 300 l-40 -18" />
            <path d="M357 352 l-25 -54 M351 320 l-20 -55 M348 287 l-11 -56 M350 251 l4 -58 M358 216 l18 -55" />
            <path d="M400 361 l31 -52 M426 337 l42 -46 M453 314 l49 -36 M482 292 l57 -28 M515 274 l60 -16" />
            <path d="M418 416 l57 -19 M452 422 l61 -5 M490 431 l64 11 M530 442 l62 26 M567 454 l59 39" />
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