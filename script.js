
// -- DOM Elements --
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const dashboard = document.getElementById('dashboard');
const statusText = document.getElementById('status-text');
const statusDot = document.querySelector('.status-dot');

// Stats Elements
const jobIdEl = document.getElementById('job-id');
const fileCountEl = document.getElementById('file-count');
const avgHeightEl = document.getElementById('avg-height');
const rangeHeightEl = document.getElementById('range-height');
const maxHeightEl = document.getElementById('max-height');
const minHeightEl = document.getElementById('min-height');
const passCountEl = document.getElementById('pass-count');
const failCountEl = document.getElementById('fail-count');
const toleranceContainer = document.getElementById('tolerance-check-container');
const tableBody = document.querySelector('#data-table tbody');
const btnExportMd = document.getElementById('btn-export-md');
const btnPrint = document.getElementById('btn-print');
const btnReset = document.getElementById('btn-reset');

// Charts
let mainChart = null;
let passFailChart = null;

// -- State --
let parsedData = [];

// -- Event Listeners --
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-active');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-active');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-active');
    handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFiles(e.target.files);
    }
});

// -- File Handling --
async function handleFiles(fileList) {
    statusText.textContent = "Processing files...";
    statusDot.className = "status-dot"; // remove ready class

    // Convert FileList to Array and filter for .txt
    const files = Array.from(fileList).filter(f => f.name.endsWith('.txt'));

    if (files.length === 0) {
        alert("No .txt files found!");
        statusText.textContent = "Ready for Files";
        statusDot.classList.add('ready');
        return;
    }

    parsedData = []; // Clear previous run

    const fileReaders = files.map(file => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                const results = parseFileContent(file.name, content);
                if (results && results.length > 0) {
                    parsedData.push(...results);
                }
                resolve();
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    });

    try {
        await Promise.all(fileReaders);

        // Sort data by Part Number suffix (assuming format XXXXXX-YY)
        parsedData.sort((a, b) => {
            const getSuffix = (name) => {
                const match = name.match(/-(\d+)/);
                return match ? parseInt(match[1]) : 0;
            };
            return getSuffix(a.partNumber) - getSuffix(b.partNumber);
        });

        updateDashboard();

    } catch (error) {
        console.error("Error reading files:", error);
        alert("An error occurred while reading files.");
    } finally {
        statusText.textContent = "Analysis Complete";
        statusDot.classList.add('ready');
    }
}

// -- Parsing Logic --
function parseFileContent(filename, content) {
    // Regex Patterns based on user sample
    // Part Number: 207269-01
    // PassFail Enum: 1  (1=Pass, 4=Fail)
    // V78: 11.52921
    // Date: 2025-12-06 00:17:45

    const reports = [];
    // Split by the report header: *-*-* BEGIN PART PROBE REPORT *-*-*
    const reportBlocks = content.split(/\*-\*-\*\s*BEGIN PART PROBE REPORT\s*\*-\*-\*/);

    reportBlocks.forEach((block, index) => {
        if (!block.trim()) return; // skip empty blocks

        const partNumMatch = block.match(/Part Number:\s*(.+)/);
        const dateMatch = block.match(/Date:\s*(.+)/);
        const passFailMatch = block.match(/PassFail Enum:\s*(\d+)/);
        const v78Match = block.match(/V78:\s*([\d.]+)/);

        // If key data missing, skip
        if (!v78Match) return;

        const passFailCode = passFailMatch ? parseInt(passFailMatch[1]) : 0;

        // Determine Status
        let status = 'Unknown';
        if (passFailCode === 1) status = 'PASS';
        else if (passFailCode === 4) status = 'FAIL';

        // Add index suffix if more than one report in the file
        // Or if we already have multiple blocks being processed
        // We'll calculate the suffix after we know how many blocks we have
        // But for now, let's just collect the data.

        reports.push({
            filename: filename,
            partNumber: partNumMatch ? partNumMatch[1].trim() : filename,
            date: dateMatch ? dateMatch[1].trim() : '--',
            v78: parseFloat(v78Match[1]),
            status: status,
            rawStatus: passFailCode
        });
    });

    // If multiple reports were in the file, add (1), (2), etc.
    if (reports.length > 1) {
        reports.forEach((report, i) => {
            report.partNumber = `${report.partNumber} (${i + 1})`;
        });
    }

    return reports;
}

// -- UI Updates --
function updateDashboard() {
    if (parsedData.length === 0) return;

    // Show Dashboard
    dashboard.classList.remove('grid-hidden');
    dropZone.parentElement.style.display = 'none'; // Hide upload section

    // Show Header Controls
    btnExportMd.style.display = 'inline-block';
    btnPrint.style.display = 'inline-block';
    btnReset.style.display = 'inline-block';

    // 1. Job Overview
    // Attempt to extract Job ID from the first part number (Before the dash)
    const firstPart = parsedData[0].partNumber;
    const jobId = firstPart.includes('-') ? firstPart.split('-')[0] : 'Unknown';

    jobIdEl.textContent = jobId;
    fileCountEl.textContent = parsedData.length;

    // 2. Statistics
    const heights = parsedData.map(d => d.v78);
    const max = Math.max(...heights);
    const min = Math.min(...heights);
    const avg = heights.reduce((a, b) => a + b, 0) / heights.length;

    // Find matching parts for labels
    const maxPart = parsedData.find(d => d.v78 === max).partNumber;
    const minPart = parsedData.find(d => d.v78 === min).partNumber;

    maxHeightEl.innerHTML = `${max.toFixed(5)} <div style="font-size:0.6em; color:var(--text-secondary)">${maxPart}</div>`;
    minHeightEl.innerHTML = `${min.toFixed(5)} <div style="font-size:0.6em; color:var(--text-secondary)">${minPart}</div>`;
    avgHeightEl.textContent = avg.toFixed(5);
    const rangeVal = (max - min);
    rangeHeightEl.textContent = rangeVal.toFixed(5);

    // Pass/Fail Counts
    const passCount = parsedData.filter(d => d.status === 'PASS').length;
    const failCount = parsedData.filter(d => d.status === 'FAIL').length;

    passCountEl.textContent = passCount;
    failCountEl.textContent = failCount;

    // -- [NEW] Set Tolerance Check --
    const TOLERANCE = 0.005;
    const isWithinTolerance = rangeVal <= TOLERANCE;

    // Reset classes
    toleranceContainer.className = 'tolerance-check';

    if (isWithinTolerance) {
        toleranceContainer.classList.add('pass');
        toleranceContainer.innerHTML = `<span class="check-icon">✓</span> Set Passed Tolerance Check`;
    } else {
        toleranceContainer.classList.add('fail');
        toleranceContainer.innerHTML = `<span class="check-icon">✕</span> Set Failed Tolerance (> 0.005")`;
    }

    // Identify Outliers (Min and Max) for highlighting
    const outliers = parsedData.filter(d => d.v78 === max || d.v78 === min).map(d => d.partNumber);

    // 3. Update Table
    renderTable(outliers);

    // 4. Charts
    renderCharts(heights, passCount, failCount);
}

function renderTable(outliers = []) {
    tableBody.innerHTML = '';
    parsedData.forEach(item => {
        const tr = document.createElement('tr');

        const badgeClass = item.status === 'PASS' ? 'pass' : (item.status === 'FAIL' ? 'fail' : '');

        // Highlight logic
        const isOutlier = outliers.includes(item.partNumber);
        const rowStyle = isOutlier ? 'background: rgba(239, 68, 68, 0.1);' : '';
        const outlierText = isOutlier ? ' (Outlier)' : '';

        tr.innerHTML = `
            <td style="${rowStyle}">${item.partNumber}</td>
            <td style="${rowStyle}">${item.date}</td>
            <td style="font-family:monospace; font-weight:600; ${rowStyle}">${item.v78.toFixed(5)}</td>
            <td style="${rowStyle}"><span class="status-badge ${badgeClass}">${item.status}</span>${outlierText}</td>
        `;
        tableBody.appendChild(tr);
    });
}

function exportMarkdown() {
    if (parsedData.length === 0) return alert("No data to export!");

    // Construct MD Table
    let md = `# CNC Probe Report\n\n`;
    md += `- Job ID: ${jobIdEl.textContent}\n`;
    md += `- Date: ${new Date().toLocaleString()}\n`;
    md += `- Set Status: ${toleranceContainer.textContent.trim()}\n\n`;

    md += `| Part # | Height (V78) | Status |\n`;
    md += `|--------|--------------|--------|\n`;

    parsedData.forEach(p => {
        md += `| ${p.partNumber} | ${p.v78.toFixed(5)} | ${p.status} |\n`;
    });

    // Create Download
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${jobIdEl.textContent}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function resetApp() {
    // Clear Data
    parsedData = [];

    // Reset UI Elements
    dashboard.classList.add('grid-hidden');
    dropZone.parentElement.style.display = 'block';

    // Hide Buttons
    btnExportMd.style.display = 'none';
    btnPrint.style.display = 'none';
    btnReset.style.display = 'none';

    // Reset Status
    statusText.textContent = "Ready for Files";
    statusDot.className = "status-dot ready";

    // Clear Input so same files can be selected again if needed
    fileInput.value = '';
}

function renderCharts(heights, passCount, failCount) {
    const labels = parsedData.map(d => {
        // Shorten label to just the suffix if possible (e.g. -01)
        const parts = d.partNumber.split('-');
        return parts.length > 1 ? `-${parts[parts.length - 1]}` : d.partNumber;
    });

    // Destroy previous charts if they exist
    if (mainChart) mainChart.destroy();
    if (passFailChart) passFailChart.destroy();

    // Main Chart (Line/Bar)
    const ctxMain = document.getElementById('mainChart').getContext('2d');

    // Create gradient
    const gradient = ctxMain.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    mainChart = new Chart(ctxMain, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Finish Height (V78)',
                data: heights,
                borderColor: '#3b82f6',
                backgroundColor: gradient,
                borderWidth: 2,
                pointBackgroundColor: '#fff',
                pointRadius: 4,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#1f2937',
                    titleColor: '#fff',
                    bodyColor: '#cbd5e1',
                    borderColor: '#374151',
                    borderWidth: 1
                }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#9ca3af' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#9ca3af' }
                }
            }
        }
    });

    // Pass Fail Doughnut
    const ctxPF = document.getElementById('passFailChart').getContext('2d');
    passFailChart = new Chart(ctxPF, {
        type: 'doughnut',
        data: {
            labels: ['Pass', 'Fail'],
            datasets: [{
                data: [passCount, failCount],
                backgroundColor: ['#10b981', '#ef4444'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            }
        }
    });
}
