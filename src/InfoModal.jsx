cd ~/Downloads/act-sport-center-app && mkdir -p src/components && cat > src/components/InfoModal.jsx <<'EOF'
// src/components/InfoModal.jsx
import { useEffect } from "react";
import { X, Phone, MapPin, Facebook, Instagram } from "lucide-react";

const RED = "#C81E3A";
const PHONE_DISPLAY = "02-807-9556 ต่อ 91";
const PHONE_TEL = "tel:028079556,91";

function HomeContent() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white leading-snug">
        ยินดีต้อนรับสู่ศูนย์กีฬา โรงเรียนอัสสัมชัญธนบุรี 🏀⚽🏊‍♂️
      </h2>
      <p className="font-semibold" style={{ color: RED }}>
        ศูนย์กีฬาที่รวมการพัฒนาทักษะกีฬา สุนทรียภาพแห่งโรงเรียนอัสสัมชัญธนบุรี!
      </p>
      <p className="text-gray-300 leading-relaxed">
        เรามุ่งมั่นขับเคลื่อนศักยภาพของเยาวชนสู่ความสำเร็จ ด้วยหลักสูตรฝึกอบรมกีฬาที่หลากหลาย
        อาทิ บาสเกตบอล ฟุตซอล และว่ายน้ำ จากทีมผู้ฝึกสอนมืออาชีพด้วยมาตรฐานสากล
        บนพื้นที่และสิ่งอำนวยความสะดวกที่ได้มาตรฐาน ปลอดภัย และครบครัน
      </p>
      <p className="text-gray-300 leading-relaxed">
        ร่วมสร้างสุขภาวะที่ดี พัฒนาทักษะ และเปิดประสบการณ์การแข่งขันกีฬาไปกับเราที่นี่!
      </p>
      <div className="rounded-lg border border-[#C81E3A]/50 bg-[#C81E3A]/10 p-4">
        <p className="font-semibold text-white">📌 ติดต่อสอบถามคอร์สเรียนและกิจกรรม:</p>
        <a href={PHONE_TEL} className="mt-1 inline-flex items-center gap-2 font-medium text-orange-400">
          <Phone size={16} /> โทร. {PHONE_DISPLAY}
        </a>
      </div>
    </div>
  );
}

function AboutContent() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white">
        ACT <span style={{ color: RED }}>Sport Center</span>
      </h2>
      <blockquote className="border-l-4 pl-4 italic font-medium text-orange-300" style={{ borderColor: RED }}>
        "มุ่งมั่นพัฒนาทักษะ สร้างสรรค์สุนทรียภาพ ขับเคลื่อนเยาวชนสู่ความเป็นเลิศด้านกีฬาและสุขภาวะที่ดี"
      </blockquote>
      <p className="text-gray-300 leading-relaxed">
        ศูนย์กีฬาโรงเรียนอัสสัมชัญธนบุรี (ACT Sport Center) เป็นศูนย์รวมการเรียนรู้และพัฒนาทักษะด้านกีฬา
        ดนตรี และสุนทรียภาพอย่างครบวงจร ตั้งอยู่ภายในบริเวณโรงเรียนอัสสัมชัญธนบุรี
        เรามุ่งเน้นการสร้างสภาพแวดล้อมที่ส่งเสริมการเรียนรู้นอกห้องเรียน
        เพื่อให้เด็กรอบด้านมีพัฒนาการทางร่างกาย จิตใจ และอารมณ์อย่างสมดุล
      </p>
      <p className="text-gray-300 leading-relaxed">
        ด้วยโครงสร้างพื้นฐานและสิ่งอำนวยความสะดวกที่ทันสมัย ได้มาตรฐานระดับสากล และปลอดภัย
        ACT Sport Center จึงพร้อมรองรับทั้งการฝึกซ้อม การเรียนการสอน และการจัดการแข่งขันกีฬาในระดับเยาวชน
        โดยเปิดให้บริการสำหรับนักเรียนภายในสถานศึกษา และเยาวชนบุคคลภายนอกที่สนใจพัฒนาศักยภาพของตนเอง
      </p>
    </div>
  );
}

function ContactContent() {
  const Row = ({ icon: Icon, label, children }) => (
    <li className="flex gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
      <Icon className="shrink-0" size={20} style={{ color: RED }} />
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        <div className="text-sm leading-relaxed text-gray-300">{children}</div>
      </div>
    </li>
  );
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">ช่องทางการติดต่อ (Contact Us)</h2>
      <ul className="space-y-3">
        <Row icon={MapPin} label="ที่ตั้ง">
          ศูนย์กีฬา ACT Sport Center โรงเรียนอัสสัมชัญธนบุรี เลขที่ 92 ถนนอัสสัมชัญ
          แขวงบางไผ่ เขตบางแค กรุงเทพมหานคร 10160
        </Row>
        <Row icon={Phone} label="เบอร์โทรศัพท์">
          <a href={PHONE_TEL} className="font-medium text-orange-400">{PHONE_DISPLAY}</a>
        </Row>
        <Row icon={Facebook} label="Facebook">ACT Sport Center</Row>
        <Row icon={Instagram} label="Instagram">
          <a href="https://www.instagram.com/act_sport_center" target="_blank" rel="noreferrer"
             className="font-medium text-orange-400">@act_sport_center</a>
        </Row>
      </ul>
    </div>
  );
}

const PAGES = {
  home: { label: "Home", Content: HomeContent },
  about: { label: "About", Content: AboutContent },
  contact: { label: "Contact", Content: ContactContent },
};

export default function InfoModal({ page, onClose, onChange }) {
  useEffect(() => {
    if (!page) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [page, onClose]);

  if (!page || !PAGES[page]) return null;
  const { Content } = PAGES[page];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-xl border border-[#C81E3A]/60 bg-gradient-to-b from-[#2a1418] to-[#181818] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center gap-1 border-b border-white/10 bg-[#1f1416]/95 px-3 py-2">
          {Object.entries(PAGES).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => onChange?.(key)}
              className={`rounded px-3 py-1.5 text-sm font-semibold transition-colors ${
                page === key ? "bg-[#C81E3A] text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
          <button onClick={onClose} aria-label="ปิด" className="ml-auto rounded p-1.5 text-gray-400 hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <div className="p-6"><Content /></div>
      </div>
    </div>
  );
}
EOF
head -1 src/components/InfoModal.jsx
