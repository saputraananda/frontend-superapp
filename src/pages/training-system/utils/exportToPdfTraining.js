/**
 * Utility to export a Training Request detail to a professional PDF/Print format.
 * It opens a print window with a beautifully styled corporate A4 document template.
 * The title of the window is set to the request code and date, which defaults the PDF filename.
 */
export function exportToPdfTraining(detailData) {
  if (!detailData || !detailData.training) {
    alert("Data pengajuan tidak valid untuk dicetak");
    return;
  }

  const { training, trainees = [], mentors = [], vendors = [], logs = [] } = detailData;

  const code = training.training_code || `TR-NEW-${training.id || ""}`;
  const dateStr = training.request_date ? training.request_date.split("T")[0] : new Date().toISOString().split("T")[0];
  const title = `Request_Training_${code}_${dateStr}`;

  // Formatting date functions
  const formatDate = (dateInput) => {
    if (!dateInput) return "-";
    const d = new Date(dateInput);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  };

  const formatDateTime = (ts) => {
    if (!ts) return "-";
    const d = new Date(ts);
    return `${d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} ${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;
  };

  // Determine current status meta
  let statusText = "Persiapan";
  let statusCls = "bg-amber-100 text-amber-800 border-amber-200";
  if (training.status === "Pending_Supervisor") {
    statusText = "Menunggu Supervisor";
    statusCls = "bg-amber-50 text-amber-700 border-amber-200";
  } else if (training.status === "Pending_HRD") {
    statusText = "Menunggu HRD";
    statusCls = "bg-blue-50 text-blue-700 border-blue-200";
  } else if (training.status === "Review") {
    statusText = "Review HRD";
    statusCls = "bg-purple-50 text-purple-700 border-purple-200";
  } else if (training.status === "Scheduled") {
    statusText = "Terjadwal";
    statusCls = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (training.status === "Selesai") {
    statusText = "Selesai";
    statusCls = "bg-emerald-100 text-emerald-800 border-emerald-300";
  } else if (training.status === "Rejected_Supervisor") {
    statusText = "Ditolak Supervisor";
    statusCls = "bg-rose-50 text-rose-700 border-rose-200";
  } else if (training.status === "Rejected_HRD") {
    statusText = "Ditolak HRD";
    statusCls = "bg-rose-50 text-rose-700 border-rose-200";
  }

  // Trainees list mapping
  const traineesHtml = trainees.length === 0 
    ? `<div style="color: #94a3b8; font-style: italic; font-size: 11px;">Tidak ada peserta terdaftar</div>`
    : `<ol style="margin: 0; padding-left: 16px; font-size: 11px; color: #334155; line-height: 1.6;">
        ${trainees.map(t => `<li><strong>${t.full_name}</strong> <span style="color: #64748b; font-size: 10px;">(${t.position || "-"})</span></li>`).join("")}
       </ol>`;

  // Mentors/Vendors mapping
  let partnerHtml = "";
  if (training.training_method === "Internal") {
    partnerHtml = `
      <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #e2e8f0;">
        <span style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 4px;">Rekomendasi Mentor (Internal)</span>
        <div style="font-size: 11px; color: #1e293b; font-weight: 700;">
          ${mentors.map(m => m.full_name).join(", ") || "-"}
        </div>
      </div>
    `;
  } else {
    partnerHtml = `
      <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #e2e8f0;">
        <span style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 4px;">Rekomendasi Vendor / Penyelenggara</span>
        <div style="font-size: 11px; color: #1e293b; font-weight: 700;">
          ${vendors.map(v => v.nama_vendor || v.vendor_name).join(", ") || "-"}
        </div>
      </div>
    `;
  }

  // Timeline approval steps
  const spvApproved = !["Pending_Supervisor", "Rejected_Supervisor"].includes(training.status);
  const spvRejected = training.status === "Rejected_Supervisor";
  const hrdApproved = ["Scheduled", "Selesai"].includes(training.status);
  const hrdRejected = training.status === "Rejected_HRD";

  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    
    @page {
      size: A4;
      margin: 0;
    }
    
    * {
      box-sizing: border-box;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      margin: 0;
      padding: 20px;
      color: #1e293b;
      background-color: #f1f5f9;
      font-size: 11px;
      line-height: 1.5;
    }

    .ticket-container {
      width: 100%;
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08);
      position: relative;
      display: flex;
    }

    /* Left Binder Bar */
    .binder-bar {
      width: 16px;
      background: linear-gradient(180deg, #1e293b, #0f172a);
      position: relative;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }

    .binder-notch {
      width: 10px;
      height: 20px;
      background-color: #f1f5f9;
      border-radius: 5px;
      margin: 15px 0;
    }

    /* Ticket Content Wrapper */
    .ticket-content {
      flex: 1;
      padding: 24px;
      position: relative;
    }

    /* Header styling resembling the ticket style */
    .ticket-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: #0f172a;
      border-radius: 12px;
      padding: 16px 20px;
      color: #ffffff;
      margin-bottom: 20px;
    }

    .header-logo-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-icon-box {
      background-color: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 6px;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .header-title-block {
      display: flex;
      flex-direction: column;
    }

    .header-main-title {
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin: 0;
    }

    .header-subtitle {
      font-size: 9px;
      color: #94a3b8;
      margin: 2px 0 0 0;
      font-weight: 600;
      letter-spacing: 0.3px;
    }

    .header-meta-section {
      display: flex;
      gap: 24px;
      align-items: center;
    }

    .meta-stat-box {
      text-align: right;
    }

    .meta-stat-label {
      font-size: 8px;
      font-weight: 800;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 3px;
    }

    .meta-stat-val {
      font-size: 11px;
      font-weight: 700;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      border: 1px solid transparent;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    }

    /* Grid layouts */
    .row-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 16px;
    }

    /* Card Panels */
    .panel-card {
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px;
      box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.03);
    }

    .panel-card-title {
      font-size: 10px;
      font-weight: 800;
      color: #1e3a8a; /* Deep blue accent */
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 6px;
    }

    .field-row {
      display: flex;
      margin-bottom: 6px;
      font-size: 11px;
    }

    .field-label {
      width: 40%;
      color: #64748b;
      font-weight: 600;
    }

    .field-val {
      width: 60%;
      color: #1e293b;
      font-weight: 700;
    }

    /* Requirements block */
    .req-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }

    .req-item {
      background-color: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      padding: 10px;
    }

    .req-item-title {
      font-size: 9px;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }

    .req-item-content {
      font-size: 10px;
      color: #334155;
      text-align: justify;
      white-space: pre-wrap;
    }

    /* Approval timeline */
    .timeline-wrapper {
      margin-top: 18px;
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
    }

    .timeline-title {
      font-size: 10px;
      font-weight: 800;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 14px;
    }

    .timeline-steps {
      display: flex;
      justify-content: space-between;
      position: relative;
    }

    .timeline-line {
      position: absolute;
      top: 14px;
      left: 10%;
      right: 10%;
      height: 2px;
      background-color: #e2e8f0;
      z-index: 1;
    }

    .timeline-step {
      width: 20%;
      text-align: center;
      position: relative;
      z-index: 2;
    }

    .step-circle {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background-color: #f1f5f9;
      border: 2px solid #cbd5e1;
      color: #94a3b8;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 8px auto;
      font-weight: 800;
      font-size: 11px;
      box-shadow: 0 0 0 4px #ffffff;
      transition: all 0.2s;
    }

    .step-circle.active {
      background-color: #d97706;
      border-color: #d97706;
      color: #ffffff;
    }

    .step-circle.success {
      background-color: #10b981;
      border-color: #10b981;
      color: #ffffff;
    }

    .step-circle.danger {
      background-color: #ef4444;
      border-color: #ef4444;
      color: #ffffff;
    }

    .step-label {
      font-size: 9px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .step-user {
      font-size: 10px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 2px;
    }

    .step-date {
      font-size: 8px;
      color: #94a3b8;
      margin-top: 1px;
    }

    /* Print utility */
    .no-print-bar {
      background-color: #0f172a;
      color: #ffffff;
      padding: 10px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 1000;
      margin-bottom: 20px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .bar-title {
      font-weight: 700;
      font-size: 12px;
    }

    .btn-group {
      display: flex;
      gap: 10px;
    }

    .btn {
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }

    .btn-primary {
      background-color: #d97706;
      color: #ffffff;
    }

    .btn-primary:hover {
      background-color: #b45309;
    }

    .btn-secondary {
      background-color: #475569;
      color: #ffffff;
    }

    .btn-secondary:hover {
      background-color: #334155;
    }

    @media print {
      .no-print-bar {
        display: none !important;
      }
      body {
        background-color: #f1f5f9 !important;
        padding: 20px !important;
        margin: 0 !important;
      }
      .ticket-container {
        border-radius: 20px !important;
        box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08) !important;
      }
    }
  </style>
</head>
<body>

  <!-- No-print preview header bar for screen rendering -->
  <div class="no-print-bar">
    <div class="bar-title">Preview Tiket Permintaan Training (${code})</div>
    <div class="btn-group">
      <button class="btn btn-primary" onclick="window.print()">🖨️ Cetak / Simpan PDF</button>
      <button class="btn btn-secondary" onclick="window.close()">Tutup</button>
    </div>
  </div>

  <div style="padding: 10px;">
    
    <!-- MAIN TICKET CONTAINER -->
    <div class="ticket-container">
      
      <!-- Binder style binder line -->
      <div class="binder-bar">
        <div class="binder-notch"></div>
        <div class="binder-notch"></div>
        <div class="binder-notch"></div>
        <div class="binder-notch"></div>
        <div class="binder-notch"></div>
        <div class="binder-notch"></div>
        <div class="binder-notch"></div>
        <div class="binder-notch"></div>
        <div class="binder-notch"></div>
      </div>

      <!-- Content wrapper -->
      <div class="ticket-content">
        
        <!-- HEADER HEADER -->
        <div class="ticket-header">
          <div class="header-logo-section">
            <div class="header-icon-box">
              <svg style="width: 24px; height: 24px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-3-12h.008v.008H13.5V6zm0 6h.008v.008H13.5V12zm0 6h.008v.008H13.5V18M11 18.25h.008v.008H11v-.008zm0-6h.008v.008H11V12zm0-6h.008v.008H11V6zm-3 12.25h.008v.008H8v-.008zm0-6h.008v.008H8V12zm0-6h.008v.008H8V6zM3.75 6A2.25 2.25 0 016 3.75h12A2.25 2.25 0 0120.25 6v12A2.25 2.25 0 0118 20.25H6A2.25 2.25 0 013.75 18V6z" />
              </svg>
            </div>
            <div class="header-title-block">
              <h1 class="header-main-title">TRAINING TICKET</h1>
              <p class="header-subtitle">FORMULIR PERMINTAAN TRAINING KARYAWAN · ALORA GROUP</p>
            </div>
          </div>

          <div class="header-meta-section">
            <div class="meta-stat-box">
              <div class="meta-stat-label">STATUS</div>
              <span class="status-badge ${statusCls}">${statusText}</span>
            </div>
            <div class="meta-stat-box">
              <div class="meta-stat-label">TICKET ID</div>
              <div class="meta-stat-val" style="font-family: monospace; font-weight: 800; letter-spacing: 0.5px;">${code}</div>
            </div>
            <div class="meta-stat-box">
              <div class="meta-stat-label">TANGGAL PENGAJUAN</div>
              <div class="meta-stat-val">${formatDate(training.request_date)}</div>
            </div>
          </div>
        </div>

        <!-- ROW SECTION 1: Meta profile -->
        <div class="row-grid">
          <!-- A. DATA PENGAJU -->
          <div class="panel-card">
            <div class="panel-card-title">
              <svg style="width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 2.5;" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              <span>A. Data Pengaju</span>
            </div>
            <div class="field-row">
              <div class="field-label">Nama Pengaju</div>
              <div class="field-val">: ${training.requester_name || "-"}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Departemen</div>
              <div class="field-val">: ${training.department_name || "-"}</div>
            </div>
            <div class="field-row">
              <div class="field-label">Unit Bisnis</div>
              <div class="field-val">: ${training.company_name || "-"}</div>
            </div>
          </div>

          <!-- B. INFORMASI TRAINING -->
          <div class="panel-card">
            <div class="panel-card-title">
              <svg style="width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 2.5;" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18c-2.305 0-4.408.867-6 2.292m0-14.25v14.25" />
              </svg>
              <span>B. Informasi Training</span>
            </div>
            <div class="field-row" style="margin-bottom: 4px;">
              <div class="field-label" style="width: 30%;">Topik</div>
              <div class="field-val" style="width: 70%; line-height: 1.2;">: ${training.topic || "-"}</div>
            </div>
            <div class="field-row">
              <div class="field-label" style="width: 30%;">Jenis</div>
              <div class="field-val" style="width: 70%;">: ${training.training_type || "-"}</div>
            </div>
            <div class="field-row">
              <div class="field-label" style="width: 30%;">Metode</div>
              <div class="field-val" style="width: 70%;">: ${training.training_method || "-"}</div>
            </div>
          </div>

          <!-- D. PESERTA TRAINING -->
          <div class="panel-card">
            <div class="panel-card-title">
              <svg style="width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 2.5;" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
              <span>D. Peserta Training</span>
            </div>
            ${traineesHtml}
            ${partnerHtml}
          </div>
        </div>

        <!-- ROW SECTION 2: Alasan & Kompetensi Karyawan -->
        <div class="panel-card" style="margin-bottom: 16px;">
          <div class="panel-card-title" style="margin-bottom: 10px;">
            <svg style="width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 2.5;" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <span>C. Alasan & Kebutuhan Training</span>
          </div>
          
          <div class="req-grid">
            <div class="req-item">
              <div class="req-item-title">1. Alasan Pengajuan & Dampak Bisnis</div>
              <div class="req-item-content">${training.reasons_and_impact || "-"}</div>
            </div>
            <div class="req-item">
              <div class="req-item-title">2. Kompetensi Saat Ini</div>
              <div class="req-item-content">${training.current_competency || "-"}</div>
            </div>
            <div class="req-item">
              <div class="req-item-title">3. Kompetensi Sasaran</div>
              <div class="req-item-content">${training.target_competency || "-"}</div>
            </div>
            <div class="req-item">
              <div class="req-item-title">4. Target Setelah Training</div>
              <div class="req-item-content">${training.training_target || "-"}</div>
            </div>
            <div class="req-item" style="grid-column: span 2;">
              <div class="req-item-title">5. Materi Pembahasan Prioritas</div>
              <div class="req-item-content">${training.priority_material || "-"}</div>
            </div>
          </div>
        </div>

        <!-- ROW SECTION 3: Narahubung & Extra metadata -->
        <div style="display: grid; grid-template-columns: 40% 60%; gap: 16px;">
          <!-- E. Narahubung & Detail -->
          <div class="panel-card">
            <div class="panel-card-title">
              <svg style="width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 2.5;" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 8.511c.083.205.13.43.13.665v7.07c0 1.01-1.045 1.768-2.025 1.5l-2.025-.558A2.99 2.99 0 0015.75 18H8.25a2.99 2.99 0 00-.58-.088l-2.025.558C4.665 18.736 3.62 17.977 3.62 16.968v-7.07c0-.236.047-.46.13-.665m16.5 0a3 3 0 00-2.25-2.25m-12 0A3 3 0 003.62 6.26m16.5 2.25v.038m0-.038a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75A3.375 3.375 0 006.375 5.625v1.5c0 .622-.504 1.125-1.125 1.125h-1.5a3.375 3.375 0 00-3.375 3.375v.038" />
              </svg>
              <span>E. Narahubung & Diskusi</span>
            </div>
            <div class="field-row">
              <div class="field-label" style="width: 50%;">Narahubung (CP)</div>
              <div class="field-val" style="width: 50%;">: ${training.contact_person_name || "-"}</div>
            </div>
            <div class="field-row" style="margin-top: 4px;">
              <div class="field-label" style="width: 50%;">Supervisor Pemeriksa</div>
              <div class="field-val" style="width: 50%;">: ${training.supervisor_name || "-"}</div>
            </div>
            <div class="field-row" style="margin-top: 4px;">
              <div class="field-label" style="width: 50%;">HRD Penanggungjawab</div>
              <div class="field-val" style="width: 50%;">: ${training.hrd_name || "-"}</div>
            </div>
            ${training.scheduled_date ? `
              <div style="margin-top: 10px; padding: 6px 10px; border-radius: 6px; background-color: #e0e7ff; border: 1px solid #c7d2fe; display: flex; align-items: center; gap: 6px;">
                <svg style="width: 14px; height: 14px; color: #4f46e5;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <div style="font-size: 10px; color: #3730a3; font-weight: 700;">Pelaksanaan: ${formatDate(training.scheduled_date)}</div>
              </div>
            ` : ""}
          </div>

          <!-- G. RIWAYAT PERSURATAN / PERSURATAN LOG -->
          <div class="panel-card timeline-wrapper" style="margin-top: 0; padding-top: 14px;">
            <div class="panel-card-title" style="margin-bottom: 12px; border: none; padding: 0;">
              <svg style="width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 2.5;" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.746 3.746 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
              </svg>
              <span>G. Riwayat Approval & Persetujuan</span>
            </div>

            <div class="timeline-steps">
              <div class="timeline-line"></div>
              
              <!-- Step 1: Diajukan -->
              <div class="timeline-step">
                <div class="step-circle success">✓</div>
                <div class="step-label">Diajukan</div>
                <div class="step-user">${training.requester_name ? training.requester_name.split(" ")[0] : "-"}</div>
                <div class="step-date">${formatDate(training.request_date)}</div>
              </div>

              <!-- Step 2: Supervisor -->
              <div class="timeline-step">
                <div class="step-circle ${spvApproved ? "success" : spvRejected ? "danger" : "active"}">
                  ${spvApproved ? "✓" : spvRejected ? "✗" : "2"}
                </div>
                <div class="step-label">Supervisor</div>
                <div class="step-user">${training.supervisor_name ? training.supervisor_name.split(" ")[0] : "-"}</div>
                <div class="step-date">${training.supervisor_approved_at ? formatDate(training.supervisor_approved_at) : "Menunggu"}</div>
              </div>

              <!-- Step 3: HRD -->
              <div class="timeline-step">
                <div class="step-circle ${hrdApproved ? "success" : hrdRejected ? "danger" : (spvApproved && !spvRejected) ? "active" : ""}">
                  ${hrdApproved ? "✓" : hrdRejected ? "✗" : "3"}
                </div>
                <div class="step-label">HRD</div>
                <div class="step-user">${training.hrd_name ? training.hrd_name.split(" ")[0] : "HRD"}</div>
                <div class="step-date">${training.hrd_approved_at ? formatDate(training.hrd_approved_at) : "Menunggu"}</div>
              </div>

              <!-- Step 4: Pelaksanaan -->
              <div class="timeline-step">
                <div class="step-circle ${["Scheduled", "Selesai"].includes(training.status) ? "success" : ""}">
                  ${training.status === "Selesai" ? "✓" : "4"}
                </div>
                <div class="step-label">Terjadwal</div>
                <div class="step-user">Training</div>
                <div class="step-date">${training.scheduled_date ? formatDate(training.scheduled_date) : "Belum"}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- FOOTER BAR DISPLAY -->
        <div style="margin-top: 24px; padding: 12px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 8px; display: flex; justify-content: space-between; font-size: 9px; color: #64748b; font-weight: 600;">
          <div>METODE PELAKSANAAN: <span style="color: #0f172a; font-weight: 800;">${training.training_method.toUpperCase()}</span></div>
          <div>JENIS TRAINING: <span style="color: #0f172a; font-weight: 800;">${training.training_type.toUpperCase()}</span></div>
          <div>DIBUAT PADA: <span style="color: #0f172a; font-weight: 800;">${formatDateTime(training.created_at)}</span></div>
        </div>

      </div>

    </div>

  </div>

  <script>
    window.onload = function() {
      // Trigger printing automatically
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
  `;

  const win = window.open("", "_blank", "width=1000,height=800");
  if (!win) {
    alert("Popup diblokir oleh browser. Harap izinkan popup pada website ini untuk melakukan cetak PDF.");
    return;
  }
  win.document.write(html);
  win.document.close();
}
