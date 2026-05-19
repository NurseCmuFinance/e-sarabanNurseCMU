
import React, { useEffect, useState } from 'react';
import { getRunningConfig } from '../services/mockService';

// --- DATA DEFINITIONS ---

// 50 Characters Data using High-Quality Emojis
export const CHARACTERS = [
    { id: '1', name: 'หมี (Bear)', emoji: '🐻' },
    { id: '2', name: 'สุนัข (Dog)', emoji: '🐶' },
    { id: '3', name: 'แมว (Cat)', emoji: '🐱' },
    { id: '4', name: 'สิงโต (Lion)', emoji: '🦁' },
    { id: '5', name: 'เสือ (Tiger)', emoji: '🐯' },
    { id: '6', name: 'วัว (Cow)', emoji: '🐮' },
    { id: '7', name: 'หมู (Pig)', emoji: '🐷' },
    { id: '8', name: 'กบ (Frog)', emoji: '🐸' },
    { id: '9', name: 'ลิง (Monkey)', emoji: '🐵' },
    { id: '10', name: 'ไก่ (Chicken)', emoji: '🐔' },
    { id: '11', name: 'เพนกวิน (Penguin)', emoji: '🐧' },
    { id: '12', name: 'นก (Bird)', emoji: '🐦' },
    { id: '13', name: 'เป็ด (Duck)', emoji: '🦆' },
    { id: '14', name: 'นกอินทรี (Eagle)', emoji: '🦅' },
    { id: '15', name: 'นกฮูก (Owl)', emoji: '🦉' },
    { id: '16', name: 'ค้างคาว (Bat)', emoji: '🦇' },
    { id: '17', name: 'หมาป่า (Wolf)', emoji: '🐺' },
    { id: '18', name: 'หมูป่า (Boar)', emoji: '🐗' },
    { id: '19', name: 'ม้า (Horse)', emoji: '🐴' },
    { id: '20', name: 'ยูนิคอร์น (Unicorn)', emoji: '🦄' },
    { id: '21', name: 'ผึ้ง (Bee)', emoji: '🐝' },
    { id: '22', name: 'หนอน (Bug)', emoji: '🐛' },
    { id: '23', name: 'ผีเสื้อ (Butterfly)', emoji: '🦋' },
    { id: '24', name: 'หอยทาก (Snail)', emoji: '🐌' },
    { id: '25', name: 'เต่าทอง (Ladybug)', emoji: '🐞' },
    { id: '26', name: 'มด (Ant)', emoji: '🐜' },
    { id: '27', name: 'ยุง (Mosquito)', emoji: '🦟' },
    { id: '28', name: 'จิ้งหรีด (Cricket)', emoji: '🦗' },
    { id: '29', name: 'แมงมุม (Spider)', emoji: '🕷️' },
    { id: '30', name: 'แมงป่อง (Scorpion)', emoji: '🦂' },
    { id: '31', name: 'เต่า (Turtle)', emoji: '🐢' },
    { id: '32', name: 'งู (Snake)', emoji: '🐍' },
    { id: '33', name: 'จิ้งจก (Lizard)', emoji: '🦎' },
    { id: '34', name: 'ทีเร็กซ์ (T-Rex)', emoji: '🦖' },
    { id: '35', name: 'ไดโนเสาร์ (Sauropod)', emoji: '🦕' },
    { id: '36', name: 'ปลาหมึก (Octopus)', emoji: '🐙' },
    { id: '37', name: 'หมึกกล้วย (Squid)', emoji: '🦑' },
    { id: '38', name: 'กุ้ง (Shrimp)', emoji: '🦐' },
    { id: '39', name: 'กุ้งก้ามกราม (Lobster)', emoji: '🦞' },
    { id: '40', name: 'ปู (Crab)', emoji: '🦀' },
    { id: '41', name: 'ปลาปักเป้า (Blowfish)', emoji: '🐡' },
    { id: '42', name: 'ปลา (Fish)', emoji: '🐠' },
    { id: '43', name: 'ปลาทู (Fish)', emoji: '🐟' },
    { id: '44', name: 'โลมา (Dolphin)', emoji: '🐬' },
    { id: '45', name: 'วาฬ (Whale)', emoji: '🐳' },
    { id: '46', name: 'ฉลาม (Shark)', emoji: '🦈' },
    { id: '47', name: 'จระเข้ (Crocodile)', emoji: '🐊' },
    { id: '48', name: 'เสือโคร่ง (Tiger Face)', emoji: '🐅' },
    { id: '49', name: 'เสือดาว (Leopard)', emoji: '🐆' },
    { id: '50', name: 'ม้าลาย (Zebra)', emoji: '🦓' },
];

// Actions - Only 'Walk' and 'Run' triggers horizontal movement
export const ACTIONS = [
    { id: '1', name: 'Walk (เดินเล่น)', cssClass: 'animate-walk', isLocomotion: true },
    { id: '2', name: 'Run (วิ่ง)', cssClass: 'animate-run', isLocomotion: true },
    { id: '3', name: 'Jump (กระโดด)', cssClass: 'animate-jump' },
    { id: '4', name: 'Sit (นั่งนิ่งๆ)', cssClass: 'animate-sit' },
    { id: '5', name: 'Sleep (นอนหลับ)', cssClass: 'animate-sleep' },
    { id: '6', name: 'Eat (กิน)', cssClass: 'animate-eat' },
    { id: '7', name: 'Dance (เต้น)', cssClass: 'animate-dance' },
    { id: '8', name: 'Wave (โบกมือ)', cssClass: 'animate-wave' },
    { id: '9', name: 'Spin (หมุนตัว)', cssClass: 'animate-spin-mascot' },
    { id: '10', name: 'Bounce (เด้งดึ๋ง)', cssClass: 'animate-bounce-mascot' },
    { id: '11', name: 'Float (ลอยตัว)', cssClass: 'animate-float' },
    { id: '12', name: 'Shake (สั่นกลัว)', cssClass: 'animate-shake' },
    { id: '13', name: 'Heartbeat (หัวใจเต้น)', cssClass: 'animate-heartbeat' },
    { id: '14', name: 'Wobble (โยกเยก)', cssClass: 'animate-wobble' },
    { id: '15', name: 'Jello (ดุ๊กดิ๊ก)', cssClass: 'animate-jello' },
    { id: '16', name: 'Tada (ทาด้า!)', cssClass: 'animate-tada' },
    { id: '17', name: 'Swing (แกว่งไปมา)', cssClass: 'animate-swing' },
    { id: '18', name: 'Glitch (กระตุก)', cssClass: 'animate-glitch' },
    { id: '19', name: 'Fade In/Out (ผลุบโผล่)', cssClass: 'animate-fade' },
    { id: '20', name: 'Zoom (ซูมเข้าออก)', cssClass: 'animate-zoom' },
    { id: '21', name: 'Flip (ตีลังกา)', cssClass: 'animate-flip' },
    { id: '22', name: 'Roll (กลิ้ง)', cssClass: 'animate-roll', isLocomotion: true },
    { id: '23', name: 'Teleport (วาร์ป)', cssClass: 'animate-teleport' },
    { id: '24', name: 'Slide (สไลด์)', cssClass: 'animate-slide', isLocomotion: true },
    { id: '25', name: 'Beg (อ้อน)', cssClass: 'animate-beg' },
    { id: '26', name: 'Panic (ตื่นตระหนก)', cssClass: 'animate-panic' },
    { id: '27', name: 'Sneak (ย่องเบา)', cssClass: 'animate-sneak', isLocomotion: true },
    { id: '28', name: 'Dizzy (มึนหัว)', cssClass: 'animate-dizzy' },
    { id: '29', name: 'Happy (ดีใจ)', cssClass: 'animate-happy' },
    { id: '30', name: 'Angry (โกรธ)', cssClass: 'animate-angry' },
];

const Mascot: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [autoState, setAutoState] = useState<{ charId: string, actionId: string } | null>(null);

  useEffect(() => {
    const checkConfig = async () => {
        try {
            const c = await getRunningConfig();
            setConfig(c);
            setEnabled(c.mascotEnabled || false);
        } catch (e) { console.error(e); }
    };
    
    checkConfig();
    const interval = setInterval(checkConfig, 5000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
      // Determine if we need auto-rotation logic
      const needsAuto = config?.mascotAutoRotate || config?.mascotId === 'random' || config?.mascotAction === 'random';
      
      if (!needsAuto) {
          setAutoState(null);
          return;
      }

      const updateAuto = () => {
          const intervalMins = Math.max(1, config.mascotInterval || 5);
          const timeSlot = Math.floor(Date.now() / (intervalMins * 60 * 1000));
          const seed = timeSlot * 12345;
          
          const randomCharIndex = (seed % CHARACTERS.length);
          const randomActionIndex = ((seed * 7) % ACTIONS.length);
          
          setAutoState({
              charId: CHARACTERS[randomCharIndex].id,
              actionId: ACTIONS[randomActionIndex].id
          });
      };

      updateAuto();
      const timer = setInterval(updateAuto, 10000);
      return () => clearInterval(timer);
  }, [config]);

  if (!enabled) return null;

  // Resolve Character
  let finalCharId = config?.mascotId || '1';
  if (finalCharId === 'random' && autoState) {
      finalCharId = autoState.charId;
  }

  // Resolve Action
  let finalActionId = config?.mascotAction || '1';
  if (finalActionId === 'random' && autoState) {
      finalActionId = autoState.actionId;
  }

  const selectedChar = CHARACTERS.find(c => c.id === finalCharId) || CHARACTERS[0];
  const selectedAction = ACTIONS.find(a => a.id === finalActionId) || ACTIONS[0];

  return (
    // Located at top right via Layout.tsx container
    <div className={`absolute top-0 right-0 h-full w-full pointer-events-none overflow-visible flex items-center justify-end pr-4`}>
        {/* Container for Patrol Animation: Limited width to stay in header right side */}
        <div className={`relative h-12 w-48 ${selectedAction.isLocomotion ? 'animate-patrol-header' : ''}`}>
            {/* The Mascot Itself */}
            <div className={`absolute top-0 right-0 ${selectedAction.cssClass} origin-center transition-all duration-500`}>
                <div className="text-4xl drop-shadow-md filter cursor-pointer pointer-events-auto" title={selectedChar.name}>
                    {selectedChar.emoji}
                </div>
                {/* Speech Bubbles */}
                {selectedAction.name.includes('Beg') && <div className="absolute -top-3 right-0 bg-white px-1.5 py-0.5 rounded text-[10px] border shadow-sm font-bold text-slate-700 whitespace-nowrap">Please!</div>}
                {selectedAction.name.includes('Sleep') && <div className="absolute -top-4 right-0 text-slate-500 font-bold animate-pulse text-sm whitespace-nowrap">Zzz...</div>}
                {selectedAction.name.includes('Eat') && <div className="absolute top-0 -right-2 text-orange-500 font-bold text-lg">♥</div>}
            </div>
        </div>
        
        <style>{`
            /* Header Patrol: Move left from right edge, but stop before hitting date */
            @keyframes patrol-header {
                0% { transform: translateX(0) scaleX(1); }
                45% { transform: translateX(-150px) scaleX(1); }
                50% { transform: translateX(-150px) scaleX(-1); }
                95% { transform: translateX(0) scaleX(-1); }
                100% { transform: translateX(0) scaleX(1); }
            }
            .animate-patrol-header { animation: patrol-header 20s linear infinite; }

            /* Action Animations (Scaled down translations for smaller header) */
            @keyframes walk { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
            .animate-walk { animation: walk 0.6s ease-in-out infinite; }

            @keyframes run { 0%, 100% { transform: skewX(-5deg) translateY(0); } 50% { transform: skewX(5deg) translateY(-8px); } }
            .animate-run { animation: run 0.3s linear infinite; }

            @keyframes jump { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px) scaleY(1.1); } }
            .animate-jump { animation: jump 0.8s ease-in-out infinite; }

            @keyframes sit { 0% { transform: translateY(5px) scaleY(0.9); } 100% { transform: translateY(5px) scaleY(0.9); } }
            .animate-sit { animation: sit 1s linear infinite; }

            @keyframes sleep { 0%, 100% { transform: translateY(8px) scaleY(0.7) scaleX(1.2); opacity: 0.8; } 50% { transform: translateY(8px) scaleY(0.75) scaleX(1.15); opacity: 0.9; } }
            .animate-sleep { animation: sleep 3s ease-in-out infinite; }

            @keyframes eat { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(15deg); } 75% { transform: rotate(-10deg); } }
            .animate-eat { animation: eat 0.5s linear infinite; }

            @keyframes dance { 0%, 100% { transform: translateY(0) rotate(0); } 25% { transform: translateY(-5px) rotate(-15deg); } 75% { transform: translateY(-2px) rotate(15deg); } }
            .animate-dance { animation: dance 1s linear infinite; }

            @keyframes wave { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(20deg); } }
            .animate-wave { animation: wave 1s ease-in-out infinite; transform-origin: bottom center; }

            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            .animate-spin-mascot { animation: spin 2s linear infinite; }

            @keyframes bounce { 0%, 100% { transform: translateY(0); } 25% { transform: translateY(-10px); } 50% { transform: translateY(0); } 75% { transform: translateY(-5px); } }
            .animate-bounce-mascot { animation: bounce 1.5s ease-in-out infinite; }

            @keyframes float { 0%, 100% { transform: translateY(-5px); } 50% { transform: translateY(-15px); } }
            .animate-float { animation: float 3s ease-in-out infinite; }

            @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }
            .animate-shake { animation: shake 0.2s linear infinite; }

            @keyframes heartbeat { 0%, 100% { transform: scale(1); } 25% { transform: scale(1.2); } 50% { transform: scale(1); } 75% { transform: scale(1.2); } }
            .animate-heartbeat { animation: heartbeat 1.5s ease-in-out infinite; }

            @keyframes wobble { 0%, 100% { transform: translateX(0%); } 15% { transform: translateX(-25%) rotate(-5deg); } 30% { transform: translateX(20%) rotate(3deg); } 45% { transform: translateX(-15%) rotate(-3deg); } 60% { transform: translateX(10%) rotate(2deg); } 75% { transform: translateX(-5%) rotate(-1deg); } }
            .animate-wobble { animation: wobble 2s infinite; }

            @keyframes jello { 0%, 100% { transform: scale3d(1, 1, 1); } 30% { transform: scale3d(1.25, 0.75, 1); } 40% { transform: scale3d(0.75, 1.25, 1); } 50% { transform: scale3d(1.15, 0.85, 1); } 65% { transform: scale3d(0.95, 1.05, 1); } 75% { transform: scale3d(1.05, 0.95, 1); } }
            .animate-jello { animation: jello 2s infinite; }

            @keyframes tada { 0% { transform: scale3d(1, 1, 1); } 10%, 20% { transform: scale3d(0.9, 0.9, 0.9) rotate3d(0, 0, 1, -3deg); } 30%, 50%, 70%, 90% { transform: scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, 3deg); } 40%, 60%, 80% { transform: scale3d(1.1, 1.1, 1.1) rotate3d(0, 0, 1, -3deg); } 100% { transform: scale3d(1, 1, 1); } }
            .animate-tada { animation: tada 2s infinite; }

            @keyframes swing { 20% { transform: rotate3d(0, 0, 1, 15deg); } 40% { transform: rotate3d(0, 0, 1, -10deg); } 60% { transform: rotate3d(0, 0, 1, 5deg); } 80% { transform: rotate3d(0, 0, 1, -5deg); } 100% { transform: rotate3d(0, 0, 1, 0deg); } }
            .animate-swing { animation: swing 2s infinite; transform-origin: top center; }

            @keyframes glitch { 0% { transform: translate(0); opacity: 1; } 20% { transform: translate(-1px, 1px); opacity: 0.8; } 40% { transform: translate(-1px, -1px); opacity: 1; } 60% { transform: translate(1px, 1px); opacity: 0.8; } 80% { transform: translate(1px, -1px); opacity: 1; } 100% { transform: translate(0); opacity: 1; } }
            .animate-glitch { animation: glitch 0.3s linear infinite; }

            @keyframes fade { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }
            .animate-fade { animation: fade 2s ease-in-out infinite; }

            @keyframes zoom { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.5); } }
            .animate-zoom { animation: zoom 2s ease-in-out infinite; }

            @keyframes flip { 0% { transform: perspective(400px) rotate3d(0, 1, 0, 0deg); } 100% { transform: perspective(400px) rotate3d(0, 1, 0, 360deg); } }
            .animate-flip { animation: flip 2s linear infinite; }

            @keyframes roll { 0% { transform: rotate(0deg) translateX(0); } 100% { transform: rotate(360deg) translateX(50px); } }
            .animate-roll { animation: roll 3s linear infinite; }

            @keyframes teleport { 0%, 100% { transform: scale(1); opacity: 1; } 45% { transform: scale(0.1); opacity: 0; } 55% { transform: scale(0.1); opacity: 0; margin-left: 50px; } 90% { transform: scale(1); opacity: 1; margin-left: 50px; } }
            .animate-teleport { animation: teleport 3s ease-in-out infinite; }

            @keyframes slide { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(50px) skewX(-20deg); } }
            .animate-slide { animation: slide 2s ease-in-out infinite; }

            @keyframes beg { 0%, 100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-5px) rotate(-10deg); } }
            .animate-beg { animation: beg 1s ease-in-out infinite; }

            @keyframes panic { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
            .animate-panic { animation: panic 0.1s linear infinite; }

            @keyframes sneak { 0%, 100% { transform: translateY(0); opacity: 1; } 50% { transform: translateY(5px); opacity: 0.6; } }
            .animate-sneak { animation: sneak 3s ease-in-out infinite; }

            @keyframes dizzy { 0% { transform: rotate(0deg); } 100% { transform: rotate(-360deg); } }
            .animate-dizzy { animation: dizzy 1s linear infinite; }

            @keyframes happy { 0%, 100% { transform: translateY(0); } 25% { transform: translateY(-10px) rotate(-10deg); } 75% { transform: translateY(-10px) rotate(10deg); } }
            .animate-happy { animation: happy 0.5s ease-in-out infinite; }

            @keyframes angry { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2) translateX(2px); filter: hue-rotate(90deg); } }
            .animate-angry { animation: angry 0.2s linear infinite; }
        `}</style>
    </div>
  );
};

export default Mascot;
