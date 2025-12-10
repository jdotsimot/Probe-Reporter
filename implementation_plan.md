# CNC Probe Data Reporter Plan

## Goal
Create a user-friendly "dashboard" application to analyze CNC probe result files. The app will allow non-technical users to select a batch of files (e.g., for a specific job #), parse key metrics (specifically Finish Height `V78`), and visualize the data to ensure quality control across the lot.

## Approach: Local Web Application
We will build this as a **Client-Side Web Application** (HTML/CSS/JS).
*   **Why?**:
    *   **No Installation**: Runs directly in any web browser (Chrome, Edge, Firefox). No need to install Python or other dependencies on the shop floor computers.
    *   **Ease of Use**: Users can simply drag and drop files or select a folder.
    *   **Visuals**: Web technologies are excellent for building "heads up" dashboards with charts and colors.

## Features
1.  **File Selection**: A "drop zone" or file picker to load multiple `.txt` files at once.
2.  **Data Parsing**:
    *   Extract `Date`.
    *   Extract `Part Number` (and derive Job ID).
    *   Extract `V78` (Finish Height). **Ignore V1-V6**.
    *   Extract `PassFail Enum` (1 = Pass, 4 = Fail).
3.  **Dashboard Display**:
    *   **Job Summary**: Job Number, Total Parts Scanned.
    *   **Key Metrics**:
        *   **Max Height** (Tallest).
        *   **Min Height** (Shortest).
        *   **Range** (Max - Min).
        *   **Average Height**.
        *   **Pass/Fail Count**.
        *   **[NEW] Set Tolerance Check**: Verify `Range <= 0.005"`. If fail, highlight Max/Min parts.
        *   **[NEW] Outlier Identification**: Show the Part Number next to Max/Min values.
    *   **Visualization**: A bar or scatter chart showing the `V78` height for each part in sequence (01, 02, 03...). This makes spotting outliers instant.
    *   **Data Table**: A sortable table of the raw data.
    *   **[NEW] Export Controls**: Buttons for "Export PDF" and "Export Markdown".
    *   **[NEW] Reset Control**: "New Dataset" button to clear data and start over.

## Proposed Files
*   `index.html`: The main structure of the app.
*   `style.css`: Modern, clean styling ("Premium" look as per general guidelines).
*   `script.js`: Logic for parsing files (`FileReader` API) and calculating stats.

## Verification
1.  Use the existing sample files (e.g., `207269-*.txt`) to test the parser.
2.  Verify calculations (Range, Mean) against manual checks.
3.  Ensure the interface handles files from different jobs gracefully (though the use case implies selecting one job's files).
