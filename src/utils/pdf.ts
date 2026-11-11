import { jsPDF } from 'jspdf';
import { Task, Category } from '../types';
import { formatJalaliHuman, toPersianDigits } from './jalali';

interface ReportStats {
  totalHours: number;
  weekHours: number;
  monthHours: number;
  yearHours: number;
}

/**
 * Draws a Persian PDF on a high-resolution canvas
 * (which natively handles Persian RTL text shaping) and adding it to jsPDF.
 */
export async function exportTasksToPDF(
  tasks: Task[],
  categories: Category[],
  stats: ReportStats,
  usePersianDigits: boolean,
  todayStr: string
) {
  // A4 paper dimensions at 150 DPI: 1240 x 1754
  const canvasWidth = 1240;
  const canvasHeight = 1754;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const getCategoryName = (id: string) => {
    return categories.find(c => c.id === id)?.name || 'دسته‌بندی نشده';
  };

  const getPriorityLabel = (p: string) => {
    switch (p) {
      case 'high': return 'بالا';
      case 'medium': return 'متوسط';
      case 'low': return 'پایین';
      default: return 'نامشخص';
    }
  };

  const getDurationText = (minutes?: number) => {
    if (!minutes) return '-';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    let text = '';
    if (hrs > 0) text += `${hrs} ساعت `;
    if (mins > 0) text += `${mins} دقیقه`;
    return usePersianDigits ? toPersianDigits(text) : text;
  };

  // Sort tasks: highest priority and newest date
  const priorityWeight = { high: 3, medium: 2, low: 1 };
  const sortedTasks = [...tasks].sort((a, b) => {
    const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
    if (pDiff !== 0) return pDiff;
    return b.date.localeCompare(a.date);
  });

  // Calculate pages
  const tasksPerPage = 12;
  const totalPages = Math.max(1, Math.ceil(sortedTasks.length / tasksPerPage));

  for (let pageNum = 0; pageNum < totalPages; pageNum++) {
    if (pageNum > 0) {
      pdf.addPage();
    }

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) continue;

    // Background color
    ctx.fillStyle = '#f8fafc'; // light gray slate
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Header Panel
    ctx.fillStyle = '#0f172a'; // deep slate
    ctx.fillRect(0, 0, canvasWidth, 240);

    // Decorative Accent
    ctx.fillStyle = '#3b82f6'; // primary blue
    ctx.fillRect(0, 240, canvasWidth, 10);

    // Header text
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';

    // App Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Tahoma, Arial, sans-serif';
    ctx.fillText('گزارش کارهای روزانه و بهره‌وری شخصی', canvasWidth - 80, 90);

    // Subtitle / Date
    ctx.fillStyle = '#94a3b8';
    ctx.font = '20px Tahoma, Arial, sans-serif';
    const dateLabel = `تاریخ گزارش: ${formatJalaliHuman(todayStr, usePersianDigits)}`;
    ctx.fillText(dateLabel, canvasWidth - 80, 145);

    // Page indicator
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '18px Tahoma, Arial, sans-serif';
    const pageStr = `صفحه ${pageNum + 1} از ${totalPages}`;
    ctx.fillText(usePersianDigits ? toPersianDigits(pageStr) : pageStr, 80, 90);

    // Reset align
    ctx.textAlign = 'right';

    // Statistics appear on the first page.
    if (pageNum === 0) {
      // Statistics Cards Grid
      const cardY = 280;
      const cardWidth = 250;
      const cardHeight = 130;
      const cardGap = 26;
      const startX = canvasWidth - 80;

      const statData = [
        { label: 'کل ساعات کار مفید', value: stats.totalHours, color: '#3b82f6' },
        { label: 'ساعات مفید هفته جاری', value: stats.weekHours, color: '#10b981' },
        { label: 'ساعات مفید ماه جاری', value: stats.monthHours, color: '#f59e0b' },
        { label: 'ساعات مفید سال جاری', value: stats.yearHours, color: '#8b5cf6' },
      ];

      statData.forEach((stat, idx) => {
        const x = startX - idx * (cardWidth + cardGap) - cardWidth;

        // Draw Card Shadow/Border
        ctx.fillStyle = '#ffffff';
        // Rounded-like rect
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x, cardY, cardWidth, cardHeight, 12) : ctx.rect(x, cardY, cardWidth, cardHeight);
        ctx.fill();

        // Left accent bar
        ctx.fillStyle = stat.color;
        ctx.beginPath();
        ctx.roundRect 
          ? ctx.roundRect(x + cardWidth - 8, cardY, 8, cardHeight, [0, 12, 12, 0]) 
          : ctx.rect(x + cardWidth - 8, cardY, 8, cardHeight);
        ctx.fill();

        // Label
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 15px Tahoma, Arial, sans-serif';
        ctx.fillText(stat.label, x + cardWidth - 25, cardY + 45);

        // Value
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 26px Tahoma, Arial, sans-serif';
        const formattedVal = `${stat.value.toFixed(1)} ساعت`;
        const valText = usePersianDigits ? toPersianDigits(formattedVal) : formattedVal;
        ctx.fillText(valText, x + cardWidth - 25, cardY + 95);
      });
    }

    // Tasks Section Title
    const tableStartY = pageNum === 0 ? 460 : 280;
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 24px Tahoma, Arial, sans-serif';
    ctx.fillText('لیست کارهای ثبت شده', canvasWidth - 80, tableStartY);

    // Table Setup
    const tableHeaderY = tableStartY + 30;
    const rowHeight = 75;

    // Column positions (measured from right to left)
    // Table width is 1080px (from x=80 to x=1160)
    const rightMargin = canvasWidth - 80; // 1160
    const colWidths = [
      400, // Title
      180, // Date
      180, // Category
      140, // Priority
      180, // Duration
    ];

    const colX = [
      rightMargin,                                        // Title right edge (1160)
      rightMargin - colWidths[0],                         // Date right edge (760)
      rightMargin - colWidths[0] - colWidths[1],          // Category right edge (580)
      rightMargin - colWidths[0] - colWidths[1] - colWidths[2], // Priority right edge (400)
      rightMargin - colWidths[0] - colWidths[1] - colWidths[2] - colWidths[3], // Duration right edge (260)
    ];

    // Draw Table Header Background
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(80, tableHeaderY, 1080, 50);

    // Draw Header Text
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 16px Tahoma, Arial, sans-serif';

    ctx.fillText('عنوان کار', colX[0] - 15, tableHeaderY + 32);
    ctx.fillText('تاریخ انجام', colX[1] - 15, tableHeaderY + 32);
    ctx.fillText('نوع کار', colX[2] - 15, tableHeaderY + 32);
    ctx.fillText('اولویت', colX[3] - 15, tableHeaderY + 32);
    ctx.fillText('مدت زمان', colX[4] - 15, tableHeaderY + 32);

    // Draw Rows
    const startIdx = pageNum * tasksPerPage;
    const pageTasks = sortedTasks.slice(startIdx, startIdx + tasksPerPage);

    pageTasks.forEach((task, index) => {
      const rowY = tableHeaderY + 50 + index * rowHeight;

      // Zebra striping
      ctx.fillStyle = index % 2 === 0 ? '#ffffff' : '#f1f5f9';
      ctx.fillRect(80, rowY, 1080, rowHeight);

      // Bottom border for row
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(80, rowY + rowHeight - 1, 1080, 1);

      // Checkbox or state indicator on the right edge
      ctx.fillStyle = task.isCompleted ? '#10b981' : '#cbd5e1';
      ctx.beginPath();
      ctx.arc(colX[0] - 15, rowY + rowHeight / 2, 8, 0, Math.PI * 2);
      ctx.fill();

      // Row Values
      ctx.fillStyle = task.isCompleted ? '#94a3b8' : '#1e293b';

      // Title (with completed line-through if completed)
      ctx.font = task.isCompleted ? '15px Tahoma, Arial, sans-serif' : 'bold 15px Tahoma, Arial, sans-serif';
      let titleText = task.title;
      if (titleText.length > 40) {
        titleText = titleText.slice(0, 38) + '...';
      }
      const titleX = colX[0] - 35;
      const textY = rowY + 44;
      ctx.fillText(titleText, titleX, textY);

      if (task.isCompleted) {
        // Draw strike-through line
        const textWidth = ctx.measureText(titleText).width;
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(titleX, textY - 6);
        ctx.lineTo(titleX - textWidth, textY - 6);
        ctx.stroke();
      }

      // Date
      ctx.font = '14px Tahoma, Arial, sans-serif';
      ctx.fillStyle = '#475569';
      const formattedDate = usePersianDigits ? toPersianDigits(task.date) : task.date;
      ctx.fillText(formattedDate, colX[1] - 15, textY);

      // Category
      ctx.fillText(getCategoryName(task.categoryId), colX[2] - 15, textY);

      // Priority with Color badge indicator
      const pLabel = getPriorityLabel(task.priority);
      let pColor = '#10b981'; // low (green)
      if (task.priority === 'high') pColor = '#ef4444';
      if (task.priority === 'medium') pColor = '#f97316';

      ctx.fillStyle = pColor;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(colX[3] - 100, rowY + 20, 90, 34, 17) : ctx.rect(colX[3] - 100, rowY + 20, 90, 34);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px Tahoma, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(pLabel, colX[3] - 55, rowY + 42);

      // Duration
      ctx.textAlign = 'right';
      ctx.fillStyle = '#475569';
      ctx.font = '14px Tahoma, Arial, sans-serif';
      ctx.fillText(getDurationText(task.durationMinutes), colX[4] - 15, textY);
    });

    // Draw Footer Accent
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(80, canvasHeight - 70, 1080, 4);

    ctx.fillStyle = '#64748b';
    ctx.font = '13px Tahoma, Arial, sans-serif';
    ctx.fillText('سامانه مدیریت هوشمند کارهای روزانه و بهره‌وری - طراحی شده به صورت ۱۰۰٪ آفلاین', canvasWidth - 80, canvasHeight - 45);

    // Convert canvas to image and add to PDF
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  }

  // Overdue tasks page
  const overdueTasks = tasks.filter(t => !t.isCompleted && t.date.localeCompare(todayStr) < 0);
  if (overdueTasks.length > 0) {
    pdf.addPage();
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Background color
      ctx.fillStyle = '#fdf2f2'; // very light warning red
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Header Panel (warning crimson)
      ctx.fillStyle = '#991b1b'; 
      ctx.fillRect(0, 0, canvasWidth, 240);

      // Decorative Accent
      ctx.fillStyle = '#f59e0b'; // amber
      ctx.fillRect(0, 240, canvasWidth, 10);

      ctx.direction = 'rtl';
      ctx.textAlign = 'right';

      // Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px Tahoma, Arial, sans-serif';
      ctx.fillText('گزارش کارهای باقی‌مانده از گذشته', canvasWidth - 80, 90);

      ctx.fillStyle = '#fecaca';
      ctx.font = '20px Tahoma, Arial, sans-serif';
      ctx.fillText(`تعداد کل موارد باقی‌مانده: ${usePersianDigits ? toPersianDigits(overdueTasks.length) : overdueTasks.length} کار انجام‌نشده از گذشته`, canvasWidth - 80, 145);

      // Reset align
      ctx.textAlign = 'right';

      const tableStartY = 280;
      ctx.fillStyle = '#7f1d1d';
      ctx.font = 'bold 24px Tahoma, Arial, sans-serif';
      ctx.fillText('لیست جزییات کارهای باقی‌مانده و انجام‌نشده', canvasWidth - 80, tableStartY);

      // Table Setup
      const tableHeaderY = tableStartY + 30;
      const rowHeight = 75;

      const rightMargin = canvasWidth - 80;
      const colWidths = [400, 180, 180, 140, 180];
      const colX = [
        rightMargin,
        rightMargin - colWidths[0],
        rightMargin - colWidths[0] - colWidths[1],
        rightMargin - colWidths[0] - colWidths[1] - colWidths[2],
        rightMargin - colWidths[0] - colWidths[1] - colWidths[2] - colWidths[3],
      ];

      // Draw Table Header
      ctx.fillStyle = '#fee2e2';
      ctx.fillRect(80, tableHeaderY, 1080, 50);

      ctx.fillStyle = '#991b1b';
      ctx.font = 'bold 16px Tahoma, Arial, sans-serif';
      ctx.fillText('عنوان کار', colX[0] - 15, tableHeaderY + 32);
      ctx.fillText('تاریخ سررسید', colX[1] - 15, tableHeaderY + 32);
      ctx.fillText('نوع کار', colX[2] - 15, tableHeaderY + 32);
      ctx.fillText('اولویت', colX[3] - 15, tableHeaderY + 32);
      ctx.fillText('مدت زمان', colX[4] - 15, tableHeaderY + 32);

      // Draw rows (up to 16 overdue tasks)
      const visibleOverdue = overdueTasks.slice(0, 17);
      visibleOverdue.forEach((task, index) => {
        const rowY = tableHeaderY + 50 + index * rowHeight;

        ctx.fillStyle = index % 2 === 0 ? '#ffffff' : '#fef2f2';
        ctx.fillRect(80, rowY, 1080, rowHeight);

        ctx.fillStyle = '#fca5a5';
        ctx.fillRect(80, rowY + rowHeight - 1, 1080, 1);

        // red warning dot
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(colX[0] - 15, rowY + rowHeight / 2, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 15px Tahoma, Arial, sans-serif';
        let titleText = task.title;
        if (titleText.length > 40) titleText = titleText.slice(0, 38) + '...';
        ctx.fillText(titleText, colX[0] - 35, rowY + 44);

        ctx.font = '14px Tahoma, Arial, sans-serif';
        ctx.fillStyle = '#7f1d1d';
        const formattedDate = usePersianDigits ? toPersianDigits(task.date) : task.date;
        ctx.fillText(formattedDate, colX[1] - 15, rowY + 44);

        ctx.fillText(getCategoryName(task.categoryId), colX[2] - 15, rowY + 44);

        // Priority
        const pLabel = getPriorityLabel(task.priority);
        let pColor = '#10b981';
        if (task.priority === 'high') pColor = '#ef4444';
        if (task.priority === 'medium') pColor = '#f97316';

        ctx.fillStyle = pColor;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(colX[3] - 100, rowY + 20, 90, 34, 17) : ctx.rect(colX[3] - 100, rowY + 20, 90, 34);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px Tahoma, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(pLabel, colX[3] - 55, rowY + 42);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#475569';
        ctx.font = '14px Tahoma, Arial, sans-serif';
        ctx.fillText(getDurationText(task.durationMinutes), colX[4] - 15, rowY + 44);
      });

      // Draw Footer Accent
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(80, canvasHeight - 70, 1080, 4);

      ctx.fillStyle = '#7f1d1d';
      ctx.font = '13px Tahoma, Arial, sans-serif';
      ctx.fillText('سامانه مدیریت هوشمند کارهای روزانه و بهره‌وری - لیست اختصاصی کارهای انجام‌نشده و معوقه', canvasWidth - 80, canvasHeight - 45);

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    }
  }

  // Save the PDF
  const filename = `گزارش_کارها_${todayStr.replace(/\//g, '_')}.pdf`;
  pdf.save(filename);
}
