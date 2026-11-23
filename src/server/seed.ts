import { db, logActivity, createNotification } from './db.ts';
import { hashPassword } from './auth.ts';

export function seedDatabaseIfEmpty(): void {
  const categoryCount = db.prepare(`SELECT COUNT(*) AS count FROM categories`).get() as { count: number };
  if (categoryCount.count > 0) {
    return;
  }

  const seedCategories = [
    {
      name: 'Software Engineering',
      slug: 'software-engineering',
      description: 'Pengembangan aplikasi web, mobile, backend API, dan infrastruktur cloud.',
      iconName: 'Code2',
    },
    {
      name: 'UI/UX & Product Design',
      slug: 'ui-ux-design',
      description: 'Riset pengguna, wireframing, design system, dan prototipe antarmuka digital.',
      iconName: 'Palette',
    },
    {
      name: 'Data & Analytics',
      slug: 'data-analytics',
      description: 'Pengolahan data bisnis, SQL, visualisasi dashboard, dan machine learning terapan.',
      iconName: 'BarChart3',
    },
    {
      name: 'Digital Marketing',
      slug: 'digital-marketing',
      description: 'Strategi kampanye digital, SEO/SEM, content growth, dan manajemen media sosial.',
      iconName: 'Megaphone',
    },
    {
      name: 'Product Management',
      slug: 'product-management',
      description: 'Perencanaan roadmap produk, penulisan PRD, dan koordinasi lintas tim teknologi.',
      iconName: 'Layers',
    },
    {
      name: 'Finance & Accounting',
      slug: 'finance-accounting',
      description: 'Analisis keuangan, pembukuan korporat, audit internal, dan pelaporan pajak.',
      iconName: 'Calculator',
    },
    {
      name: 'Human Resources',
      slug: 'human-resources',
      description: 'Rekrutmen talenta, people operations, program pelatihan, dan budaya kerja.',
      iconName: 'Users',
    },
    {
      name: 'Business Development',
      slug: 'business-development',
      description: 'Kemitraan strategis B2B, riset pasar, dan ekspansi klien enterprise.',
      iconName: 'TrendingUp',
    },
  ];

  const insertCat = db.prepare(
    `INSERT INTO categories (name, slug, description, icon_name) VALUES (?, ?, ?, ?)`
  );
  const categoryIdMap = new Map<string, number>();
  for (const cat of seedCategories) {
    const res = insertCat.run(cat.name, cat.slug, cat.description, cat.iconName);
    categoryIdMap.set(cat.slug, Number(res.lastInsertRowid));
  }

  const demoPasswordHash = hashPassword('MagangKeren2026!');

  const insertUser = db.prepare(
    `INSERT INTO users (email, password_hash, full_name, role, status, avatar_url) VALUES (?, ?, ?, ?, 'active', ?)`
  );
  const insertCompany = db.prepare(
    `INSERT INTO company_profiles (user_id, company_name, slug, industry, company_size, location, website, description, logo_url, banner_url, verified_status, verified_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const companiesData = [
    {
      email: 'hr@finpay.id',
      repName: 'Raka Mahendra',
      companyName: 'FinPay Nusantara',
      slug: 'finpay-nusantara',
      industry: 'Fintech & Pembayaran Digital',
      size: '201-500 Karyawan',
      location: 'Jakarta Selatan',
      website: 'https://finpay.id',
      description:
        'FinPay Nusantara membangun infrastruktur pembayaran digital dan manajemen kas terpadu untuk ribuan UMKM dan perusahaan ritel di seluruh Indonesia.',
      verifiedStatus: 'verified',
      verifiedAt: '2026-10-10T08:00:00Z',
    },
    {
      email: 'talent@nusacloud.id',
      repName: 'Dinda Larasati',
      companyName: 'NusaCloud Tech',
      slug: 'nusacloud-tech',
      industry: 'Cloud Infrastructure & SaaS',
      size: '51-200 Karyawan',
      location: 'Bandung',
      website: 'https://nusacloud.id',
      description:
        'Penyedia layanan komputasi awan lokal, orkestrasi kontainer, dan sistem keamanan siber dengan pusat data berstandar tier-3 di Jawa Barat.',
      verifiedStatus: 'verified',
      verifiedAt: '2026-10-14T09:30:00Z',
    },
    {
      email: 'people@kopikita.co.id',
      repName: 'Arif Budiman',
      companyName: 'KopiKita Digital',
      slug: 'kopikita-digital',
      industry: 'Retail Tech & F&B',
      size: '501-1000 Karyawan',
      location: 'Jakarta Pusat',
      website: 'https://kopikita.co.id',
      description:
        'Jaringan kopi modern berbasis teknologi aplikasi pemesanan, rantai pasok petani lokal, dan analitik pelanggan real-time.',
      verifiedStatus: 'verified',
      verifiedAt: '2026-10-18T11:00:00Z',
    },
    {
      email: 'careers@svaramedia.id',
      repName: 'Sinta Wijaya',
      companyName: 'Svara Media',
      slug: 'svara-media',
      industry: 'Media Digital & Edukasi',
      size: '51-200 Karyawan',
      location: 'Yogyakarta',
      website: 'https://svaramedia.id',
      description:
        'Platform jurnalisme data, siniar edukatif, dan produksi konten kreatif bagi generasi muda profesional Indonesia.',
      verifiedStatus: 'verified',
      verifiedAt: '2026-10-20T14:00:00Z',
    },
    {
      email: 'studio@aksaradesign.id',
      repName: 'Farhan Hakim',
      companyName: 'Aksara Studio',
      slug: 'aksara-studio',
      industry: 'Product Design & Konsultan Digital',
      size: '11-50 Karyawan',
      location: 'Surabaya',
      website: 'https://aksaradesign.id',
      description:
        'Studio desain produk digital yang berfokus pada sistem desain, riset pengalaman pengguna, dan aplikasi finansial serta kesehatan.',
      verifiedStatus: 'verified',
      verifiedAt: '2026-10-24T10:15:00Z',
    },
    {
      email: 'hr@logischain.id',
      repName: 'Gita Permata',
      companyName: 'LogisChain Indonesia',
      slug: 'logischain-indonesia',
      industry: 'Supply Chain & Logistics SaaS',
      size: '201-500 Karyawan',
      location: 'Tangerang',
      website: 'https://logischain.id',
      description:
        'Mengoptimalkan distribusi logistik nasional dengan pelacakan armada berbasis AI dan manajemen gudang otomatis.',
      verifiedStatus: 'verified',
      verifiedAt: '2026-11-01T08:45:00Z',
    },
    {
      email: 'rekrutmen@bimakarya.co.id',
      repName: 'Hendra Kusuma',
      companyName: 'Bima Karya Energi',
      slug: 'bima-karya-energi',
      industry: 'Clean Energy & IoT',
      size: '51-200 Karyawan',
      location: 'Jakarta Utara',
      website: 'https://bimakarya.co.id',
      description:
        'Perusahaan teknologi energi surya komersial dan pemantauan efisiensi daya gedung berbasis sensor IoT.',
      verifiedStatus: 'pending',
      verifiedAt: null,
    },
  ];

  const companyIdMap = new Map<string, number>();
  const companyUserIdMap = new Map<string, number>();
  for (const c of companiesData) {
    const uRes = insertUser.run(c.email, demoPasswordHash, c.repName, 'perusahaan', null);
    const uid = Number(uRes.lastInsertRowid);
    const cRes = insertCompany.run(
      uid,
      c.companyName,
      c.slug,
      c.industry,
      c.size,
      c.location,
      c.website,
      c.description,
      null,
      '/src/assets/images/company_modern_office_1795414992957.jpg',
      c.verifiedStatus,
      c.verifiedAt
    );
    companyIdMap.set(c.slug, Number(cRes.lastInsertRowid));
    companyUserIdMap.set(c.slug, uid);
  }

  const insertInternship = db.prepare(
    `INSERT INTO internships (
      company_id, category_id, title, location, work_mode, duration_months,
      stipend_amount, stipend_label, description, responsibilities_json,
      qualifications_json, benefits_json, required_skills_json, target_majors_json,
      deadline, moderation_status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`
  );

  const internshipsSeed = [
    {
      companySlug: 'finpay-nusantara',
      categorySlug: 'software-engineering',
      title: 'Frontend Engineer Intern (React & TypeScript)',
      location: 'Jakarta Selatan',
      workMode: 'Hybrid',
      durationMonths: 6,
      stipendAmount: 4500000,
      stipendLabel: 'Rp 4.500.000 / bulan',
      description:
        'Bergabunglah dengan tim Core Merchant Dashboard FinPay Nusantara untuk membangun antarmuka analitik transaksi yang cepat, aksesibel, dan responsif bagi ratusan ribu pelaku usaha.',
      responsibilities: [
        'Mengembangkan komponen UI modular menggunakan React 19, TypeScript, dan Tailwind CSS.',
        'Berkolaborasi dengan tim Product Design dan Backend Engineer dalam integrasi REST API.',
        'Menulis unit test dan melakukan optimasi performa rendering pada tabel data skala besar.',
        'Berpartisipasi aktif dalam code review mingguan dan sprint planning.',
      ],
      qualifications: [
        'Mahasiswa aktif semester 6–8 atau fresh graduate jurusan Teknik Informatika, Ilmu Komputer, atau Sistem Informasi.',
        'Memahami dasar React, TypeScript/JavaScript modern (ES6+), dan manajemen state.',
        'Terbiasa menggunakan Git serta memiliki portofolio proyek web di GitHub.',
      ],
      benefits: [
        'Uang saku bulanan kompetitif + tunjangan makan siang',
        'Mentorship 1-on-1 bersama Senior Staff Engineer',
        'Perangkat kerja MacBook selama masa magang',
        'Jalur evaluasi langsung menuju posisi Full-Time Junior Engineer',
      ],
      requiredSkills: ['React', 'TypeScript', 'Tailwind CSS', 'Git', 'REST API'],
      targetMajors: ['Teknik Informatika', 'Ilmu Komputer', 'Sistem Informasi'],
      deadline: '2026-12-20',
      createdAt: '2026-11-21T09:00:00Z',
    },
    {
      companySlug: 'nusacloud-tech',
      categorySlug: 'software-engineering',
      title: 'Backend & Cloud Platform Intern',
      location: 'Bandung',
      workMode: 'WFH',
      durationMonths: 4,
      stipendAmount: 4000000,
      stipendLabel: 'Rp 4.000.000 / bulan',
      description:
        'Membantu tim Infrastruktur NusaCloud dalam merancang microservice berkinerja tinggi, sistem antrean tugas, dan otomasi deployment Kubernetes.',
      responsibilities: [
        'Merancang dan memelihara endpoint API menggunakan Node.js/Go dan PostgreSQL.',
        'Menyusun skrip otomasi monitoring kesehatan layanan dan log agregasi.',
        'Mendokumentasikan spesifikasi OpenAPI untuk konsumsi tim internal dan mitra.',
      ],
      qualifications: [
        'Mahasiswa tingkat akhir atau lulusan baru bidang Ilmu Komputer, Teknik Elektro, atau setara.',
        'Memahami konsep basis data relasional SQL dan desain RESTful API.',
        'Familiar dengan dasar Linux, Docker, dan kontrol versi Git.',
      ],
      benefits: [
        'Uang saku Rp 4.000.000/bulan + subsidi internet bulanan',
        'Akses penuh ke sandbox cloud dan sertifikasi internal',
        'Jam kerja fleksibel jarak jauh (100% WFH)',
      ],
      requiredSkills: ['Node.js', 'PostgreSQL', 'SQL', 'Docker', 'REST API'],
      targetMajors: ['Teknik Informatika', 'Ilmu Komputer', 'Teknik Elektro'],
      deadline: '2026-12-28',
      createdAt: '2026-11-20T14:30:00Z',
    },
    {
      companySlug: 'aksara-studio',
      categorySlug: 'ui-ux-design',
      title: 'UI/UX & Product Design Intern',
      location: 'Surabaya',
      workMode: 'Hybrid',
      durationMonths: 4,
      stipendAmount: 3500000,
      stipendLabel: 'Rp 3.500.000 / bulan',
      description:
        'Berperan langsung dalam proyek desain aplikasi fintech dan edtech klien Aksara Studio, mulai dari user interview hingga penyusunan design system di Figma.',
      responsibilities: [
        'Melakukan riset usability testing dan merangkum temuan menjadi user flow yang jelas.',
        'Merancang wireframe low-fidelity hingga prototipe interaktif high-fidelity di Figma.',
        'Merapikan token warna, tipografi, dan komponen UI pada Design System tim.',
      ],
      qualifications: [
        'Mahasiswa DKV, Sistem Informasi, Teknik Informatika, atau jurusan relevan.',
        'Mahir menggunakan Figma (Auto Layout, Variants, Interactive Prototyping).',
        'Memiliki portofolio studi kasus UI/UX minimal 2 proyek.',
      ],
      benefits: [
        'Uang saku bulanan + bonus proyek selesai',
        'Review portofolio intensif bersama Lead Product Designer',
        'Sertifikat penyelesaian proyek klien nyata',
      ],
      requiredSkills: ['Figma', 'UI/UX Design', 'User Research', 'Prototyping', 'Design System'],
      targetMajors: ['Desain Komunikasi Visual', 'Sistem Informasi', 'Teknik Informatika'],
      deadline: '2026-12-18',
      createdAt: '2026-11-19T11:20:00Z',
    },
    {
      companySlug: 'kopikita-digital',
      categorySlug: 'data-analytics',
      title: 'Business Intelligence & Data Analyst Intern',
      location: 'Jakarta Pusat',
      workMode: 'WFO',
      durationMonths: 6,
      stipendAmount: 3800000,
      stipendLabel: 'Rp 3.800.000 / bulan',
      description:
        'Mengubah jutaan data transaksi harian dari ratusan gerai KopiKita menjadi insight strategis untuk efisiensi stok bahan baku dan retensi pelanggan.',
      responsibilities: [
        'Menulis kueri SQL kompleks untuk menarik data penjualan dan perilaku pengguna aplikasi.',
        'Membangun dashboard pemantauan KPI mingguan menggunakan Looker Studio / Metabase.',
        'Membantu tim CRM melakukan segmentasi pelanggan untuk kampanye promosi terarah.',
      ],
      qualifications: [
        'Mahasiswa jurusan Statistika, Matematika, Sistem Informasi, Teknik Industri, atau Ekonomi.',
        'Menguasai SQL dan pengolahan data di Excel / Python (Pandas).',
        'Teliti dan mampu mempresentasikan temuan data secara ringkas.',
      ],
      benefits: [
        'Uang saku Rp 3.800.000/bulan',
        'Voucher kopi harian dan makan siang kantor',
        'Kesempatan konversi ke program Management Trainee Data',
      ],
      requiredSkills: ['SQL', 'Python', 'Data Visualization', 'Excel', 'Analytics'],
      targetMajors: ['Statistika', 'Matematika', 'Sistem Informasi', 'Teknik Industri'],
      deadline: '2026-12-25',
      createdAt: '2026-11-18T16:10:00Z',
    },
    {
      companySlug: 'svara-media',
      categorySlug: 'digital-marketing',
      title: 'Growth & Content Marketing Intern',
      location: 'Yogyakarta',
      workMode: 'Hybrid',
      durationMonths: 3,
      stipendAmount: 2500000,
      stipendLabel: 'Rp 2.500.000 / bulan',
      description:
        'Mengembangkan jangkauan pembaca dan pendengar Svara Media melalui optimasi SEO artikel, kampanye media sosial, dan analisis performa konten.',
      responsibilities: [
        'Menyusun kalender editorial dan copywriting untuk Instagram, LinkedIn, dan newsletter mingguan.',
        'Melakukan riset kata kunci SEO untuk meningkatkan trafik organik situs.',
        'Membuat laporan performa kampanye bulanan dan rekomendasi eksperimen A/B.',
      ],
      qualifications: [
        'Mahasiswa Ilmu Komunikasi, Manajemen Pemasaran, Sastra, atau bidang terkait.',
        'Memiliki kemampuan menulis bahasa Indonesia yang rapi, persuasif, dan bebas salah ketik.',
        'Memahami metrik dasar engagement media sosial dan Google Analytics.',
      ],
      benefits: [
        'Uang saku Rp 2.500.000/bulan',
        'Akses pelatihan penulisan editorial dan SEO profesional',
        'Lingkungan kerja kreatif dan fleksibel di Yogyakarta',
      ],
      requiredSkills: ['Copywriting', 'SEO', 'Social Media', 'Google Analytics', 'Content Strategy'],
      targetMajors: ['Ilmu Komunikasi', 'Manajemen', 'Sastra Indonesia'],
      deadline: '2026-12-15',
      createdAt: '2026-11-17T10:00:00Z',
    },
    {
      companySlug: 'finpay-nusantara',
      categorySlug: 'product-management',
      title: 'Associate Product Manager Intern',
      location: 'Jakarta Selatan',
      workMode: 'Hybrid',
      durationMonths: 6,
      stipendAmount: 5000000,
      stipendLabel: 'Rp 5.000.000 / bulan',
      description:
        'Mendampingi Product Manager dalam merumuskan fitur pembayaran QRIS generasi berikutnya, mulai dari analisis kebutuhan merchant hingga peluncuran produk.',
      responsibilities: [
        'Menyusun Product Requirement Document (PRD) dan user stories yang terukur.',
        'Menganalisis funnel adopsi fitur dan mengumpulkan umpan balik dari tim operasional.',
        'Memfasilitasi sinkronisasi lintas fungsi antara tim Engineering, Design, dan Legal.',
      ],
      qualifications: [
        'Mahasiswa semester akhir atau fresh graduate dari semua jurusan (diutamakan Bisnis, Sistem Informasi, Teknik).',
        'Memiliki kemampuan berpikir terstruktur dan pengalaman memimpin organisasi/kepanitiaan kampus.',
        'Familiar dengan alat manajemen proyek seperti Jira, Notion, atau Linear.',
      ],
      benefits: [
        'Uang saku Rp 5.000.000/bulan',
        'Sesi mentoring mingguan dengan Head of Product',
        'Surat rekomendasi karier resmi dan peluang full-time',
      ],
      requiredSkills: ['Product Management', 'PRD', 'Analytics', 'Notion', 'User Research'],
      targetMajors: ['Sistem Informasi', 'Teknik Industri', 'Manajemen', 'Teknik Informatika'],
      deadline: '2026-12-30',
      createdAt: '2026-11-22T07:30:00Z',
    },
    {
      companySlug: 'logischain-indonesia',
      categorySlug: 'software-engineering',
      title: 'Full-Stack Web Developer Intern',
      location: 'Tangerang',
      workMode: 'WFO',
      durationMonths: 6,
      stipendAmount: 4200000,
      stipendLabel: 'Rp 4.200.000 / bulan',
      description:
        'Mengembangkan portal pelacakan pengiriman dan manajemen armada berbasis web untuk klien manufaktur dan distributor nasional.',
      responsibilities: [
        'Membangun fitur frontend & backend menggunakan TypeScript, React, dan Express/PostgreSQL.',
        'Mengintegrasikan webhook pembaruan status pengiriman secara real-time.',
        'Memperbaiki bug dan meningkatkan cakupan pengujian otomatis aplikasi.',
      ],
      qualifications: [
        'Mahasiswa Teknik Informatika, Ilmu Komputer, atau Sistem Informasi.',
        'Menguasai JavaScript/TypeScript serta dasar query SQL.',
        'Bersedia bekerja dari kantor BSD Tangerang (tersedia shuttle bus).',
      ],
      benefits: [
        'Uang saku Rp 4.200.000/bulan',
        'Fasilitas antar-jemput dan makan siang gratis',
        'Sertifikat magang berskala enterprise',
      ],
      requiredSkills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'SQL'],
      targetMajors: ['Teknik Informatika', 'Ilmu Komputer', 'Sistem Informasi'],
      deadline: '2026-12-22',
      createdAt: '2026-11-16T08:45:00Z',
    },
    {
      companySlug: 'kopikita-digital',
      categorySlug: 'finance-accounting',
      title: 'Finance & Tax Operations Intern',
      location: 'Jakarta Pusat',
      workMode: 'WFO',
      durationMonths: 3,
      stipendAmount: 3000000,
      stipendLabel: 'Rp 3.000.000 / bulan',
      description:
        'Mendukung tim Keuangan KopiKita dalam proses rekonsiliasi transaksi harian, pencatatan faktur vendor, dan pelaporan pajak bulanan.',
      responsibilities: [
        'Melakukan rekonsiliasi pembayaran digital (e-wallet & QRIS) dengan mutasi bank.',
        'Membantu verifikasi invoice vendor dan pencatatan jurnal akuntansi.',
        'Menyiapkan dokumen pendukung pelaporan PPN dan PPh bulanan.',
      ],
      qualifications: [
        'Mahasiswa Akuntansi, Keuangan, atau Manajemen Keuangan minimal semester 6.',
        'Menguasai Microsoft Excel (VLOOKUP, Pivot Table) dengan sangat baik.',
        'Memiliki ketelitian tinggi dan integritas dalam mengelola data finansial.',
      ],
      benefits: [
        'Uang saku Rp 3.000.000/bulan',
        'Pengalaman praktik sistem ERP akuntansi modern',
        'Surat keterangan magang resmi untuk konversi SKS',
      ],
      requiredSkills: ['Excel', 'Akuntansi', 'Rekonsiliasi', 'Perpajakan'],
      targetMajors: ['Akuntansi', 'Manajemen Keuangan', 'Ekonomi'],
      deadline: '2026-12-19',
      createdAt: '2026-11-15T13:15:00Z',
    },
    {
      companySlug: 'nusacloud-tech',
      categorySlug: 'human-resources',
      title: 'Tech Talent Acquisition & People Intern',
      location: 'Bandung',
      workMode: 'Hybrid',
      durationMonths: 4,
      stipendAmount: 2800000,
      stipendLabel: 'Rp 2.800.000 / bulan',
      description:
        'Terlibat langsung dalam proses pencarian talenta teknologi, penjadwalan wawancara, serta program onboarding karyawan dan pemagang baru.',
      responsibilities: [
        'Melakukan sourcing kandidat bidang engineering melalui LinkedIn dan komunitas kampus.',
        'Menyaring CV awal dan menjadwalkan sesi wawancara bersama manajer teknis.',
        'Membantu penyelenggaraan sesi sharing internal dan survei kepuasan tim.',
      ],
      qualifications: [
        'Mahasiswa Psikologi, Manajemen SDM, atau Ilmu Komunikasi.',
        'Komunikatif, ramah, dan terorganisir dalam mengelola jadwal kandidat.',
        'Tertarik pada industri teknologi dan budaya kerja startup.',
      ],
      benefits: [
        'Uang saku Rp 2.800.000/bulan',
        'Mentoring langsung praktik HR Tech & Employer Branding',
        'Fleksibilitas kerja hybrid di Bandung',
      ],
      requiredSkills: ['Rekrutmen', 'Komunikasi', 'Employer Branding', 'Administrasi HR'],
      targetMajors: ['Psikologi', 'Manajemen', 'Ilmu Komunikasi'],
      deadline: '2026-12-27',
      createdAt: '2026-11-14T09:00:00Z',
    },
    {
      companySlug: 'logischain-indonesia',
      categorySlug: 'business-development',
      title: 'B2B Partnership & Growth Intern',
      location: 'Tangerang',
      workMode: 'Hybrid',
      durationMonths: 3,
      stipendAmount: 3200000,
      stipendLabel: 'Rp 3.200.000 / bulan',
      description:
        'Membantu tim Business Development memetakan prospek perusahaan manufaktur dan e-commerce serta menyusun proposal kemitraan SaaS logistik.',
      responsibilities: [
        'Melakukan riset pasar dan pemetaan calon klien B2B potensial.',
        'Menyiapkan materi presentasi (pitch deck) yang disesuaikan dengan kebutuhan klien.',
        'Mendokumentasikan progres pipeline penjualan di sistem CRM perusahaan.',
      ],
      qualifications: [
        'Mahasiswa Manajemen, Bisnis Digital, Teknik Industri, atau Hubungan Internasional.',
        'Memiliki kemampuan presentasi dan negosiasi yang percaya diri.',
        'Aktif dalam organisasi kemahasiswaan atau kompetisi bisnis.',
      ],
      benefits: [
        'Uang saku Rp 3.200.000/bulan + insentif prospek terkonversi',
        'Pelatihan langsung teknik B2B SaaS consultative selling',
        'Akses jejaring profesional industri logistik nasional',
      ],
      requiredSkills: ['Business Development', 'Pitch Deck', 'CRM', 'Riset Pasar'],
      targetMajors: ['Manajemen', 'Bisnis Digital', 'Teknik Industri'],
      deadline: '2026-12-24',
      createdAt: '2026-11-13T15:00:00Z',
    },
    {
      companySlug: 'svara-media',
      categorySlug: 'ui-ux-design',
      title: 'Visual & Editorial Brand Design Intern',
      location: 'Yogyakarta',
      workMode: 'WFH',
      durationMonths: 3,
      stipendAmount: 2400000,
      stipendLabel: 'Rp 2.400.000 / bulan',
      description:
        'Merancang aset visual artikel jurnalisme data, sampul siniar, serta template grafis kampanye edukatif Svara Media.',
      responsibilities: [
        'Membuat ilustrasi editorial dan infografis data yang mudah dipahami pembaca.',
        'Menjaga konsistensi panduan visual merek di seluruh kanal publikasi.',
        'Berkolaborasi dengan tim redaksi dan video editor untuk proyek mingguan.',
      ],
      qualifications: [
        'Mahasiswa Desain Komunikasi Visual, Seni Rupa, atau Desain Grafis.',
        'Menguasai Figma, Adobe Illustrator, atau tools desain grafis sejenis.',
        'Melampirkan portofolio desain editorial atau infografis.',
      ],
      benefits: [
        'Uang saku Rp 2.400.000/bulan',
        '100% kerja jarak jauh dengan jam kerja fleksibel',
        'Karya dipublikasikan dengan kredit nama desainer',
      ],
      requiredSkills: ['Figma', 'Illustrator', 'Editorial Design', 'Infografis'],
      targetMajors: ['Desain Komunikasi Visual', 'Desain Grafis'],
      deadline: '2026-12-21',
      createdAt: '2026-11-12T10:30:00Z',
    },
    {
      companySlug: 'aksara-studio',
      categorySlug: 'product-management',
      title: 'Digital Product Analyst Intern (Program MBKM)',
      location: 'Surabaya',
      workMode: 'WFH',
      durationMonths: 5,
      stipendAmount: 0,
      stipendLabel: 'Sertifikat & Konversi SKS (Unpaid)',
      description:
        'Program magang pembelajaran terstruktur selama 1 semester penuh untuk mahasiswa yang ingin mendalami metodologi riset produk dan UX metrics.',
      responsibilities: [
        'Mengukur tingkat keterlibatan pengguna pada aplikasi mitra studio.',
        'Menyusun laporan evaluasi fitur dan rekomendasi iterasi desain.',
        'Mengikuti kelas internal mingguan seputar manajemen produk digital.',
      ],
      qualifications: [
        'Mahasiswa aktif semester 5–7 yang mengikuti program konversi SKS kampus.',
        'Memiliki minat kuat di bidang produk digital dan analisis perilaku pengguna.',
        'Komitmen penuh selama 5 bulan masa program.',
      ],
      benefits: [
        'Konversi hingga 20 SKS dan laporan penilaian resmi kampus',
        'Mentoring intensif mingguan dan akses penuh perpustakaan studi kasus studio',
        'Prioritas seleksi magang berbayar periode berikutnya',
      ],
      requiredSkills: ['Product Analysis', 'User Research', 'Notion', 'Figma'],
      targetMajors: ['Sistem Informasi', 'Teknik Informatika', 'Manajemen'],
      deadline: '2026-12-29',
      createdAt: '2026-11-11T12:00:00Z',
    },
  ];

  const internshipIds: number[] = [];
  for (const job of internshipsSeed) {
    const companyId = companyIdMap.get(job.companySlug)!;
    const categoryId = categoryIdMap.get(job.categorySlug)!;
    const res = insertInternship.run(
      companyId,
      categoryId,
      job.title,
      job.location,
      job.workMode,
      job.durationMonths,
      job.stipendAmount,
      job.stipendLabel,
      job.description,
      JSON.stringify(job.responsibilities),
      JSON.stringify(job.qualifications),
      JSON.stringify(job.benefits),
      JSON.stringify(job.requiredSkills),
      JSON.stringify(job.targetMajors),
      job.deadline,
      job.createdAt
    );
    internshipIds.push(Number(res.lastInsertRowid));
  }

  // Seed 2 Mahasiswa accounts
  const nadiaUserRes = insertUser.run(
    'nadia.putri@ui.ac.id',
    demoPasswordHash,
    'Nadia Putri Maharani',
    'mahasiswa',
    '/src/assets/images/testimonial_nadia_putri_1795414994367.jpg'
  );
  const nadiaUid = Number(nadiaUserRes.lastInsertRowid);

  const nadiaProfileRes = db
    .prepare(
      `INSERT INTO student_profiles (
        user_id, university, major, semester, gpa, phone, location, bio,
        skills_json, organizations_json, portfolio_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      nadiaUid,
      'Universitas Indonesia',
      'Teknik Informatika',
      7,
      '3.86',
      '0812-3456-7890',
      'Depok, Jawa Barat',
      'Mahasiswa tingkat akhir Teknik Informatika yang berfokus pada pengembangan antarmuka web modern dengan React dan TypeScript serta arsitektur komponen yang aksesibel.',
      JSON.stringify(['React', 'TypeScript', 'Tailwind CSS', 'Git', 'REST API', 'Figma']),
      JSON.stringify([
        {
          name: 'RISTEK Fakultas Ilmu Komputer UI',
          role: 'Lead of Web Development SIG',
          period: '2024 - 2025',
          description: 'Memimpin 14 anggota dalam membangun platform portal acara kampus dan mentoring React dasar.',
        },
        {
          name: 'COMPFEST 16',
          role: 'Frontend Staff IT Team',
          period: '2024',
          description: 'Mengembangkan halaman registrasi kompetisi nasional dengan ribuan pendaftar aktif.',
        },
      ]),
      'https://github.com/nadiaputri-dev'
    );
  const nadiaStudentId = Number(nadiaProfileRes.lastInsertRowid);

  const bagasUserRes = insertUser.run(
    'bagas.pratama@itb.ac.id',
    demoPasswordHash,
    'Bagas Pratama Wijaya',
    'mahasiswa',
    '/src/assets/images/testimonial_bagas_pratama_1795414993240.jpg'
  );
  const bagasUid = Number(bagasUserRes.lastInsertRowid);

  const bagasProfileRes = db
    .prepare(
      `INSERT INTO student_profiles (
        user_id, university, major, semester, gpa, phone, location, bio,
        skills_json, organizations_json, portfolio_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      bagasUid,
      'Institut Teknologi Bandung',
      'Desain Komunikasi Visual',
      6,
      '3.78',
      '0813-9876-5432',
      'Bandung, Jawa Barat',
      'Desainer produk dan antarmuka digital yang gemar menerjemahkan masalah pengguna yang kompleks menjadi alur interaksi sederhana dan terukur.',
      JSON.stringify(['Figma', 'UI/UX Design', 'User Research', 'Prototyping', 'Design System']),
      JSON.stringify([
        {
          name: 'Inkubator Desain ITB',
          role: 'Koordinator Riset UX',
          period: '2024 - Sekarang',
          description: 'Menyelenggarakan usability testing rutin untuk proyek kolaborasi UMKM Bandung.',
        },
      ]),
      'https://dribbble.com/bagaspratama'
    );
  const bagasStudentId = Number(bagasProfileRes.lastInsertRowid);

  // Sample Applications, Saved Jobs, Interviews & Notifications
  const app1 = db
    .prepare(
      `INSERT INTO applications (internship_id, student_id, cover_letter, portfolio_snapshot_url, status, company_notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'interview', ?, '2026-11-18T10:00:00Z', '2026-11-20T14:00:00Z')`
    )
    .run(
      internshipIds[0], // Frontend Engineer Intern @ FinPay
      nadiaStudentId,
      'Saya sangat antusias melamar posisi Frontend Engineer Intern di FinPay Nusantara. Pengalaman saya memimpin tim Web Development di RISTEK Fasilkom UI dengan React dan TypeScript sangat relevan dengan kebutuhan dashboard merchant FinPay.',
      'https://github.com/nadiaputri-dev',
      'Portofolio GitHub sangat rapi dan komponen UI terstruktur dengan baik. Lanjut ke sesi wawancara teknis.'
    );

  db.prepare(
    `INSERT INTO interview_schedules (application_id, scheduled_at, mode, meeting_link_or_location, interviewer_name, notes, status)
     VALUES (?, '2026-11-26T10:00', 'Online', 'https://meet.google.com/finpay-frontend-intern', 'Raka Mahendra (Engineering Manager)', 'Siapkan salah satu proyek React Anda untuk sesi live walkthrough selama 20 menit.', 'scheduled')`
  ).run(Number(app1.lastInsertRowid));

  db.prepare(
    `INSERT INTO applications (internship_id, student_id, cover_letter, portfolio_snapshot_url, status, company_notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'diproses', ?, '2026-11-19T09:15:00Z', '2026-11-21T11:30:00Z')`
  ).run(
    internshipIds[5], // Associate PM Intern @ FinPay
    nadiaStudentId,
    'Dengan latar belakang teknis Informatika dan pengalaman mengelola tim proyek COMPFEST, saya siap berkontribusi sebagai Associate Product Manager Intern.',
    'https://github.com/nadiaputri-dev',
    'CV sedang ditinjau oleh Lead Product Manager.'
  );

  db.prepare(
    `INSERT INTO applications (internship_id, student_id, cover_letter, portfolio_snapshot_url, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'menunggu_review', '2026-11-21T15:00:00Z', '2026-11-21T15:00:00Z')`
  ).run(
    internshipIds[6], // Full-Stack @ LogisChain
    nadiaStudentId,
    'Tertarik bergabung dalam pengembangan portal pelacakan armada LogisChain menggunakan TypeScript dan PostgreSQL.',
    'https://github.com/nadiaputri-dev'
  );

  db.prepare(
    `INSERT INTO applications (internship_id, student_id, cover_letter, portfolio_snapshot_url, status, company_notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'diterima', ?, '2026-11-14T10:00:00Z', '2026-11-21T16:00:00Z')`
  ).run(
    internshipIds[2], // UI/UX @ Aksara Studio
    bagasStudentId,
    'Portofolio studi kasus desain sistem dan riset UX saya selaras dengan proyek klien Aksara Studio.',
    'https://dribbble.com/bagaspratama',
    'Selamat! Tim Aksara Studio terkesan dengan studi kasus usability testing Anda. Penawaran magang telah disetujui.'
  );

  db.prepare(
    `INSERT INTO applications (internship_id, student_id, cover_letter, portfolio_snapshot_url, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'menunggu_review', '2026-11-22T08:00:00Z', '2026-11-22T08:00:00Z')`
  ).run(
    internshipIds[0], // Bagas also applied to Frontend? Actually let's put Bagas on Aksara & Svara Visual Design + FinPay for rich applicant table!
    bagasStudentId,
    'Saya memiliki pemahaman Figma yang kuat dan dasar implementasi UI berbasis komponen React.',
    'https://dribbble.com/bagaspratama'
  );

  // Saved jobs for Nadia
  db.prepare(`INSERT INTO saved_jobs (user_id, internship_id) VALUES (?, ?)`).run(nadiaUid, internshipIds[1]);
  db.prepare(`INSERT INTO saved_jobs (user_id, internship_id) VALUES (?, ?)`).run(nadiaUid, internshipIds[3]);

  // Notifications
  createNotification(
    nadiaUid,
    'Jadwal Interview Dijadwalkan',
    'FinPay Nusantara mengundang Anda untuk wawancara posisi Frontend Engineer Intern pada 26 Nov 2026 pukul 10:00.',
    'interview',
    '/dashboard'
  );
  createNotification(
    nadiaUid,
    'Lamaran Sedang Diproses',
    'Lamaran Anda untuk Associate Product Manager Intern di FinPay Nusantara telah masuk tahap review tim produk.',
    'status',
    '/dashboard'
  );
  createNotification(
    companyUserIdMap.get('finpay-nusantara')!,
    'Pelamar Baru Diterima',
    'Bagas Pratama Wijaya melamar posisi Frontend Engineer Intern (React & TypeScript).',
    'application',
    '/dashboard'
  );
  createNotification(
    bagasUid,
    'Selamat! Lamaran Diterima',
    'Aksara Studio telah menerima lamaran Anda untuk posisi UI/UX & Product Design Intern.',
    'accepted',
    '/dashboard'
  );

  // Activity Logs
  logActivity(null, 'Sistem MagangKeren', 'system', 'Inisialisasi Platform', 'platform', null, 'Platform MagangKeren siap digunakan dengan 6 mitra terverifikasi dan 12 program magang aktif.');
  logActivity(companyUserIdMap.get('finpay-nusantara')!, 'Raka Mahendra', 'perusahaan', 'Menjadwalkan Interview', 'application', Number(app1.lastInsertRowid), 'Wawancara Frontend Engineer Intern untuk Nadia Putri Maharani.');
  logActivity(companyUserIdMap.get('bima-karya-energi')!, 'Hendra Kusuma', 'perusahaan', 'Mendaftarkan Perusahaan', 'company', companyIdMap.get('bima-karya-energi')!, 'Bima Karya Energi mengajukan verifikasi akun perusahaan.');
}
