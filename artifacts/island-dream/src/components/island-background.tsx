export function IslandBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Warm Sky Gradient */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-accent/10 to-transparent"></div>
      
      {/* Sun glow */}
      <div className="absolute top-20 right-20 w-64 h-64 bg-accent/20 rounded-full blur-[80px]"></div>
      
      {/* Warm coral atmospheric haze */}
      <div className="absolute top-40 left-10 w-96 h-96 bg-secondary/10 rounded-full blur-[100px]"></div>
      
      {/* Deep teal ocean reflection base */}
      <div className="absolute bottom-[-10%] left-[-10%] w-[120%] h-[400px] bg-primary/5 rounded-[100%] blur-[60px]"></div>
      
      {/* Animated waves */}
      <div className="absolute bottom-0 left-0 w-full leading-none opacity-50">
        <svg viewBox="0 0 1440 320" className="w-[200%] h-auto text-primary/20 fill-current animate-[wave-move_20s_infinite_linear] origin-bottom" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d="M0,224L60,213.3C120,203,240,181,360,186.7C480,192,600,224,720,240C840,256,960,256,1080,240C1200,224,1320,192,1380,176L1440,160L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"></path>
          {/* Duplicate path shifted right for seamless loop */}
          <path transform="translate(1440, 0)" d="M0,224L60,213.3C120,203,240,181,360,186.7C480,192,600,224,720,240C840,256,960,256,1080,240C1200,224,1320,192,1380,176L1440,160L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"></path>
        </svg>
      </div>
      
      <div className="absolute bottom-0 left-0 w-full leading-none">
        <svg viewBox="0 0 1440 320" className="w-[200%] h-auto text-primary/15 fill-current animate-[wave-move_15s_infinite_linear_reverse] origin-bottom transform translate-y-2" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d="M0,160L48,176C96,192,192,224,288,229.3C384,235,480,213,576,192C672,171,768,149,864,154.7C960,160,1056,192,1152,208C1248,224,1344,224,1392,224L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          <path transform="translate(1440, 0)" d="M0,160L48,176C96,192,192,224,288,229.3C384,235,480,213,576,192C672,171,768,149,864,154.7C960,160,1056,192,1152,208C1248,224,1344,224,1392,224L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>
      
      <style>{`
        @keyframes wave-move {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
