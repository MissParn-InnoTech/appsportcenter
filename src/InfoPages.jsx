// src/components/InfoPages.jsx
// หน้า Home / About / Contact ของ ACT Sport Center
// ใช้ได้ 2 แบบ:
//   1) <InfoPages />                     → มีแถบเมนู HOME | ABOUT | CONTACT ในตัว
//   2) import { HomeSection, AboutSection, ContactSection } → ผูกกับเมนูเดิมของแอป

import { useState } from "react";
import { Home, Info, Phone, MapPin, Facebook, Instagram } from "lucide-react";

const PHONE_DISPLAY = "02-807-9556 ต่อ 91";
const PHONE_TEL = "tel:028079556,91";

export function HomeSection() {
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-bold text-[#181818] leading-snug">
        ยินดีต้อนรับสู่ศูนย์กีฬา โรงเรียนอัสสัมชัญธนบุรี 🏀⚽🏊‍♂️
      </h1>
      <p className="font-semibold text-[#C81E3A]">
        ศูนย์กีฬาที่รวมการพัฒนาทักษะกีฬา สุนทรียภาพแห่งโรงเรียนอัสสัมชัญธนบุรี!
      </p>
      <p className="text-gray-700 leading-relaxed">
        เรามุ่งมั่นขับเคลื่อนศักยภาพของเยาวชนสู่ความสำเร็จ ด้วยหลักสูตรฝึกอบรมกีฬาที่หลากหลาย
        อาทิ บาสเกตบอล ฟุตซอล และว่ายน้ำ จากทีมผู้ฝึกสอนมืออาชีพด้วยมาตรฐานสากล
        บนพื้นที่และสิ่งอำนวยความสะดวกที่ได้มาตรฐาน ปลอดภัย และครบครัน
      </p>
      <p className="text-gray-700 leading-relaxed">
        ร่วมสร้างสุขภาวะที่ดี พัฒนาทักษะ และเปิดประสบการณ์การแข่งขันกีฬาไปกับเราที่นี่!
      </p>
      <div className="rounded-xl border border-[#C81E3A]/30 bg-[#C81E3A]/5 p-4">
        <p className="font-semibold text-[#181818]">📌 ติดต่อสอบถามคอร์สเรียนและกิจกรรม:</p>
        <a href={PHONE_TEL} className="mt-1 inline-flex items-center gap-2 text-[#C81E3A] font-medium">
          <Phone size={16} /> โทร. {PHONE_DISPLAY}
        </a>
      </div>
    </section>
  );
}

export function AboutSection() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-[#181818]">ACT Sport Center</h1>
      <blockquote className="border-l-4 border-[#C81E3A] pl-4 italic font-medium text-[#7A1220]">
        "มุ่งมั่นพัฒนาทักษะ สร้างสรรค์สุนทรียภาพ ขับเคลื่อนเยาวชนสู่ความเป็นเลิศด้านกีฬาและสุขภาวะที่ดี"
      </blockquote>
      <p className="text-gray-700 leading-relaxed">
        ศูนย์กีฬาโรงเรียนอัสสัมชัญธนบุรี (ACT Sport Center) เป็นศูนย์รวมการเรียนรู้และพัฒนาทักษะด้านกีฬา
        ดนตรี และสุนทรียภาพอย่างครบวงจร ตั้งอยู่ภายในบริเวณโรงเรียนอัสสัมชัญธนบุรี
        เรามุ่งเน้นการสร้างสภาพแวดล้อมที่ส่งเสริมการเรียนรู้นอกห้องเรียน
        เพื่อให้เด็กรอบด้านมีพัฒนาการทางร่างกาย จิตใจ และอารมณ์อย่างสมดุล
      </p>
      <p className="text-gray-700 leading-relaxed">
        ด้วยโครงสร้างพื้นฐานและสิ่งอำนวยความสะดวกที่ทันสมัย ได้มาตรฐานระดับสากล และปลอดภัย
        ACT Sport Center จึงพร้อมรองรับทั้งการฝึกซ้อม การเรียนการสอน และการจัดการแข่งขันกีฬาในระดับเยาวชน
        โดยเปิดให้บริการสำหรับนักเรียนภายในสถานศึกษา และเยาวชนบุคคลภายนอกที่สนใจพัฒนาศักยภาพของตนเอง
      </p>
    </section>
  );
}

export function ContactSection() {
  const Row = ({ icon: Icon, label, children }) => (
    <li className="flex gap-3 rounded-xl bg-white p-4 shadow-sm border border-gray-100">
      <Icon className="shrink-0 text-[#C81E3A]" size={20} />
      <div>
        <p className="text-sm font-semibold text-[#181818]">{label}</p>
        <div className="text-gray-700 text-sm leading-relaxed">{children}</div>
      </div>
    </li>
  );

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-bold text-[#181818]">ช่องทางการติดต่อ (Contact Us)</h1>
      <ul className="space-y-3">
        <Row icon={MapPin} label="ที่ตั้ง">
          ศูนย์กีฬา ACT Sport Center โรงเรียนอัสสัมชัญธนบุรี เลขที่ 92 ถนนอัสสัมชัญ
          แขวงบางไผ่ เขตบางแค กรุงเทพมหานคร 10160
        </Row>
        <Row icon={Phone} label="เบอร์โทรศัพท์">
          <a href={PHONE_TEL} className="text-[#C81E3A] font-medium">{PHONE_DISPLAY}</a>
        </Row>
        <Row icon={Facebook} label="Facebook">ACT Sport Center</Row>
        <Row icon={Instagram} label="Instagram">
          <a
            href="https://www.instagram.com/act_sport_center"
            target="_blank"
            rel="noreferrer"
            className="text-[#C81E3A] font-medium"
          >
            @act_sport_center
          </a>
        </Row>
      </ul>
    </section>
  );
}

const TABS = [
  { key: "home", label: "HOME", icon: Home, Component: HomeSection },
  { key: "about", label: "ABOUT", icon: Info, Component: AboutSection },
  { key: "contact", label: "CONTACT", icon: Phone, Component: ContactSection },
];

export default function InfoPages({ initialTab = "home" }) {
  const [tab, setTab] = useState(initialTab);
  const Active = TABS.find((t) => t.key === tab)?.Component ?? HomeSection;

  return (
    <div className="w-full">
      <nav className="sticky top-0 z-10 flex bg-[#181818]">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold tracking-wide transition-colors ${
              tab === key
                ? "text-white border-b-2 border-[#C81E3A] bg-[#C81E3A]/20"
                : "text-gray-400 border-b-2 border-transparent hover:text-white"
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </nav>
      <main className="p-4">
        <Active />
      </main>
    </div>
  );
}
