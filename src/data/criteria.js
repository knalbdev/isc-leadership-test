export const CRITERIA = [
  {
    key: 'inisiatif',
    label: 'Inisiatif & Kreativitas',
    shortLabel: 'Inisiatif',
    desc: 'Kemampuan memulai dan menghasilkan ide baru',
    max: 20,
    questions: [
      'Ceritakan satu ide yang pernah kamu eksekusi sendiri tanpa disuruh — hasilnya seperti apa?',
      'Kalau ada masalah di sekolah yang belum ada yang tangani, apa langkah pertama yang kamu ambil?',
      'Bagaimana cara kamu memunculkan ide segar di tengah kebiasaan yang sudah lama berjalan?',
    ],
  },
  {
    key: 'keputusan',
    label: 'Pengambilan Keputusan & Visi',
    shortLabel: 'Keputusan',
    desc: 'Ketepatan analisis dan wawasan ke depan',
    max: 20,
    questions: [
      'Ceritakan saat kamu harus ambil keputusan penting dalam waktu yang sangat terbatas.',
      'Kalau terpilih, apa 3 hal pertama yang ingin kamu wujudkan di OSIS dan kenapa?',
      'Bagaimana cara kamu memastikan keputusan yang kamu buat tidak merugikan pihak manapun?',
    ],
  },
  {
    key: 'menggerakkan',
    label: 'Menggerakkan & Motivasi',
    shortLabel: 'Menggerakkan',
    desc: 'Kemampuan memimpin dan menginspirasi orang lain',
    max: 20,
    questions: [
      'Ceritakan pengalaman berhasil mengajak teman-teman bergerak bersama menuju satu tujuan.',
      'Bagaimana cara kamu memotivasi anggota tim yang mulai kehilangan semangat atau arah?',
      'Apa yang kamu lakukan saat menjadi pemimpin tapi keputusanmu tidak disetujui mayoritas tim?',
    ],
  },
  {
    key: 'komunikasi',
    label: 'Komunikasi & Presentasi',
    shortLabel: 'Komunikasi',
    desc: 'Kejelasan penyampaian dan kepercayaan diri',
    max: 20,
    questions: [
      'Dalam 60 detik, jelaskan kenapa kamu cocok jadi pengurus OSIS.',
      'Bagaimana cara kamu menyampaikan keputusan yang tidak semua orang sukai?',
      'Ceritakan pengalaman jadi penengah saat ada konflik antara teman di organisasi.',
    ],
  },
  {
    key: 'integritas',
    label: 'Tanggung Jawab & Integritas',
    shortLabel: 'Integritas',
    desc: 'Komitmen, kejujuran, dan akuntabilitas',
    max: 20,
    questions: [
      'Ceritakan saat kamu buat kesalahan dalam organisasi — apa yang kamu lakukan setelahnya?',
      'Kalau ada tekanan untuk tutupi kesalahan demi nama baik tim, apa sikapmu?',
      'Bagaimana cara kamu seimbangkan tanggung jawab di OSIS dengan kewajiban akademik?',
    ],
  },
];

export const MAX_TOTAL = CRITERIA.reduce((s, c) => s + c.max, 0); // 100
