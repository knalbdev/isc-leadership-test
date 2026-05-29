import { jsPDF } from 'jspdf';
import { getById } from './utils/storage.js';
import { showToast } from './utils/toast.js';
import { GROUPS, GROUP_COLORS } from './data/groups.js';
import { CRITERIA, MAX_TOTAL } from './data/criteria.js';

const ASSESSOR_NAME = 'Setianing Budi, S.Kom.';

const C = {
  white:   [255, 255, 255],
  black:   [15,  23,  42 ],
  stone:   [87,  83,  78 ],
  muted:   [168, 162, 158],
  line:    [231, 229, 228],
  bg:      [250, 250, 249],
  teal:    [13,  118, 110],
  tealL:   [204, 240, 238],
  teal2:   [15,  138, 129],
  emerald: [22,  163, 74 ],
  amber:   [217, 119, 6  ],
  rose:    [225, 29,  72 ],
  sky:     [3,   105, 161],
};

function statusColor(status) {
  if (status === 'Hadir') return C.emerald;
  if (status === 'Sakit') return C.amber;
  return C.rose;
}

function statusBg(status) {
  if (status === 'Hadir') return [220, 252, 231];
  if (status === 'Sakit') return [254, 243, 199];
  return [255, 228, 230];
}

function grade(total) {
  if (total >= 80) return ['Sangat Baik', 'A', C.emerald];
  if (total >= 65) return ['Baik',        'B', C.teal   ];
  if (total >= 50) return ['Cukup',       'C', C.amber  ];
  return                  ['Kurang',      'D', C.rose   ];
}

function t(doc, text, x, y, { size = 10, color = C.black, bold = false, align = 'left' } = {}) {
  doc.setFontSize(size);
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setTextColor(...color);
  doc.text(String(text), x, y, { align });
}

function rect(doc, x, y, w, h, color, r = 0) {
  doc.setFillColor(...color);
  r > 0 ? doc.roundedRect(x, y, w, h, r, r, 'F') : doc.rect(x, y, w, h, 'F');
}

function hline(doc, x1, y1, x2, color = C.line) {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.3);
  doc.line(x1, y1, x2, y1);
}

async function loadLogo() {
  try {
    const resp = await fetch('/logo.png');
    if (!resp.ok) return null;
    const blob = await resp.blob();
    const dataUrl = await new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
    // Get natural dimensions to preserve aspect ratio
    const ratio = await new Promise(resolve => {
      const img = new Image();
      img.onload  = () => resolve(img.naturalWidth / img.naturalHeight);
      img.onerror = () => resolve(1);
      img.src = dataUrl;
    });
    return { dataUrl, ratio };
  } catch { return null; }
}

export async function generatePDF(candidateId) {
  const entry = getById(candidateId);
  if (!entry) { showToast('Data tidak ditemukan!', 'error'); return; }

  const logo = await loadLogo();

  const doc    = new jsPDF({ unit: 'mm', format: 'a4' });
  const W      = 210;
  const margin = 18;

  // ── Background ───────────────────────────────────────────────────────
  rect(doc, 0, 0, W, 297, C.white);

  // ── Top strip ─────────────────────────────────────────────────────────
  rect(doc, 0, 0, W, 4, C.teal);

  // ── Header ────────────────────────────────────────────────────────────
  let logoEndX = margin;
  if (logo) {
    const maxH = 14; // mm, fixed height
    const w    = Math.min(maxH * logo.ratio, 30); // width by ratio, cap 30mm
    const h    = w / logo.ratio;
    const logoY = 8 + (maxH - h) / 2; // vertically center within 14mm zone
    try {
      doc.addImage(logo.dataUrl, 'PNG', margin, logoY, w, h);
      logoEndX = margin + w + 4;
    } catch { /* silent */ }
  }

  t(doc, 'RAPOR PENILAIAN WAWANCARA', logoEndX, 15, { size: 15, color: C.black, bold: true });
  t(doc, 'ISC Leadership Test · OSIS Akhwat 2026/2027', logoEndX, 22, { size: 8, color: C.muted });

  hline(doc, margin, 28, W - margin);

  // ── Candidate info ────────────────────────────────────────────────────
  let y = 36;

  t(doc, 'KANDIDAT', margin, y, { size: 6.5, color: C.muted, bold: true });
  y += 6;
  t(doc, entry.name, margin, y, { size: 14, color: C.black, bold: true });
  y += 7;

  // Pills
  const pills = [
    { label: entry.groupName ?? `Kelompok ${entry.groupId}`, bg: C.tealL,           fg: C.teal },
    { label: entry.level,                                    bg: [219, 234, 254],    fg: C.sky  },
    { label: entry.status,                                   bg: statusBg(entry.status), fg: statusColor(entry.status) },
  ];

  let px = margin;
  pills.forEach(({ label, bg, fg }) => {
    if (!label) return;
    const pw = doc.getTextWidth(label) + 8;
    rect(doc, px, y - 4, pw, 6.5, bg, 2);
    t(doc, label, px + 4, y + 0.8, { size: 7.5, color: fg, bold: true });
    px += pw + 3;
  });
  y += 8;

  if (entry.savedAt) {
    const d = new Date(entry.savedAt).toLocaleDateString('id-ID', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    });
    t(doc, `Dinilai pada: ${d}`, margin, y, { size: 7.5, color: C.muted });
    y += 5.5;
  }
  t(doc, `Assessor: ${ASSESSOR_NAME}`, margin, y, { size: 7.5, color: C.muted });
  y += 8;
  hline(doc, margin, y, W - margin);
  y += 8;

  // ── Scores ────────────────────────────────────────────────────────────
  if (entry.status === 'Hadir') {
    t(doc, 'RINCIAN NILAI', margin, y, { size: 6.5, color: C.muted, bold: true });
    y += 7;

    CRITERIA.forEach(c => {
      const value = entry[c.key] ?? 0;

      // Row card — compact 12 mm height
      rect(doc, margin, y, W - margin * 2, 12, C.bg, 3);
      // Accent strip inset 1 mm top/bottom (avoids fighting the card's rounded corners)
      rect(doc, margin + 0.5, y + 1, 2, 10, C.teal2, 1);

      // Label
      t(doc, c.label, margin + 6, y + 8, { size: 9, color: C.black });

      // Progress bar (thin, 2.5 mm)
      const bx = 113, bw = 55, bh = 2.5, by = y + 4.5;
      rect(doc, bx, by, bw, bh, C.line, 1);
      if (value > 0) {
        rect(doc, bx, by, Math.max(1.5, (value / c.max) * bw), bh, C.teal, 1);
      }

      // Score — same baseline as label
      t(doc, `${value}`, W - margin - 9, y + 8, { size: 11, color: C.teal, bold: true, align: 'right' });
      t(doc, `/${c.max}`, W - margin - 2, y + 8, { size: 7, color: C.muted });

      y += 13; // 12 mm row + 1 mm gap
    });

    // Total box — score and /MAX right-aligned to same anchor → clean stacked column
    y += 4;
    rect(doc, margin, y, W - margin * 2, 30, C.teal, 4);

    t(doc, 'TOTAL NILAI', margin + 8, y + 10, { size: 8.5, color: C.tealL, bold: true });
    const [gradeTxt, gradeLetter] = grade(entry.totalNilai);
    t(doc, `${gradeTxt} (${gradeLetter})`, margin + 8, y + 19, { size: 10, color: [180, 230, 225] });

    const rx = W - margin - 5; // right-edge anchor (5 mm padding from box right)
    t(doc, `${entry.totalNilai}`, rx, y + 22, { size: 26, color: C.white, bold: true, align: 'right' });
    // /MAX baseline y+27, bottom ≈ y+27.6, box ends y+30 → 2.4 mm clearance ✓
    t(doc, `/ ${MAX_TOTAL}`, rx, y + 27, { size: 8.5, color: [160, 210, 205], align: 'right' });

    y += 38;

  } else {
    rect(doc, margin, y, W - margin * 2, 20, C.bg, 4);
    t(doc, 'Peserta tidak mengikuti sesi wawancara.', W / 2, y + 9, { size: 10, color: C.stone, align: 'center' });
    t(doc, `Status: ${entry.status}`, W / 2, y + 16, { size: 8.5, color: C.muted, align: 'center' });
    y += 28;
  }

  // ── Notes ─────────────────────────────────────────────────────────────
  if (entry.catatan?.trim()) {
    y += 4;
    t(doc, 'CATATAN OBSERVER', margin, y, { size: 6.5, color: C.muted, bold: true });
    y += 5;
    hline(doc, margin, y, W - margin, C.line);
    y += 5;
    const lines = doc.splitTextToSize(entry.catatan, W - margin * 2 - 4);
    lines.forEach(ln => { t(doc, ln, margin + 2, y, { size: 9, color: C.stone }); y += 5.5; });
  }

  // ── Footer ────────────────────────────────────────────────────────────
  hline(doc, margin, 272, W - margin);
  t(doc, `ISC Leadership Test · OSIS Akhwat 2026/2027 · Assessor: ${ASSESSOR_NAME}`, margin, 277, { size: 7, color: C.muted });
  t(doc, `Digenerate: ${new Date().toLocaleString('id-ID')}`, W - margin, 277, { size: 7, color: C.muted, align: 'right' });

  rect(doc, 0, 293, W, 4, C.teal);

  doc.save(`Rapor_${entry.name.replace(/\s+/g, '_')}_ISC.pdf`);
  showToast(`Rapor <strong>${entry.name}</strong> berhasil diunduh!`, 'success');
}
