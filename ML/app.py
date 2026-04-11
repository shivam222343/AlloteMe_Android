from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
import os
import werkzeug
import json
import fitz  # PyMuPDF
import re

app = Flask(__name__)
CORS(app) 

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def extract_college_cutoff_data(pdf_path):
    doc = fitz.open(pdf_path)
    colleges_dict = {}
    current_college = None
    current_branch = None
    
    for page_num in range(doc.page_count):
        page = doc[page_num]
        blocks = page.get_text("blocks")
        blocks.sort(key=lambda b: (b[1], b[0]))
        
        i = 0
        while i < len(blocks):
            text = blocks[i][4].strip()
            
            m_coll = re.match(r'^(\d{4,5})\s*-\s*(.+)$', text)
            if m_coll:
                dte_code = m_coll.group(1).strip()
                if dte_code not in colleges_dict:
                    colleges_dict[dte_code] = {
                        "college": m_coll.group(2).strip(),
                        "DTE code": dte_code,
                        "branches": []
                    }
                current_college = colleges_dict[dte_code]
                i += 1
                continue
                
            m_branch = re.match(r'^(\d{9,10})\s*-\s*(.+)$', text)
            if m_branch:
                if current_college:
                    branch_code = m_branch.group(1).strip()
                    branch_name = m_branch.group(2).strip()
                    
                    # Prevent duplicating branches if the same branch spans multiple pages
                    # We use branch_code as a hidden property or just check if the last branch has the same name
                    existing_branch = next((b for b in current_college["branches"] if b.get("_code") == branch_code), None)
                    if existing_branch:
                        current_branch = existing_branch
                    else:
                        current_branch = {
                            "_code": branch_code,
                            "branchName": branch_name,
                            "cutoffData": []
                        }
                        current_college["branches"].append(current_branch)
                i += 1
                continue
                
            if text == 'Stage' and i > 0 and i + 1 < len(blocks):
                data_block = blocks[i+1][4].strip()
                if data_block.startswith('I\n') or data_block.startswith('II\n') or data_block.startswith('III\n'):
                    # Collect all category blocks preceding 'Stage' 
                    # Sometimes categories are split across multiple text blocks
                    raw_parts = []
                    for j in range(i-1, max(-1, i-6), -1):
                        b_text = blocks[j][4].strip()
                        if "Level" in b_text or "Status" in b_text or "University" in b_text or re.match(r'^\d{9,10}\s*-', b_text):
                            break
                        raw_parts = b_text.split('\n') + raw_parts
                        
                    # Reconstruct the categories and merge wrapped letters (e.g., PWDROBC \n S)
                    categories = []
                    for part in raw_parts:
                        part = part.strip()
                        if not part: continue
                        # Merge 1-char floating letters to the previous category
                        if len(part) <= 1 and categories:
                            categories[-1] += part
                        else:
                            categories.append(part)
                    
                    data_vals = data_block.split('\n')[1:] # drop the 'I' or 'II' rank symbol
                    
                    if current_branch:
                        for c_idx, cat in enumerate(categories):
                            # The ranks and percentiles are in pairs: Rank, (Percentile)
                            if c_idx * 2 + 1 < len(data_vals):
                                rank_str = data_vals[c_idx * 2]
                                perc_str = data_vals[c_idx * 2 + 1]
                                
                                rank = re.sub(r'\D', '', rank_str)
                                perc = re.search(r'\(([\d\.]{1,15})\)', perc_str)
                                if rank and perc:
                                    clean_cat = cat
                                    if "OPEN" in cat: clean_cat = "OPEN"
                                    elif "SC" in cat: clean_cat = "SC"
                                    elif "ST" in cat: clean_cat = "ST"
                                    elif "VJ" in cat: clean_cat = "VJ"
                                    elif "NT1" in cat: clean_cat = "NT1"
                                    elif "NT2" in cat: clean_cat = "NT2"
                                    elif "NT3" in cat: clean_cat = "NT3"
                                    elif "OBC" in cat: clean_cat = "OBC"
                                    elif "SEBC" in cat: clean_cat = "SEBC"
                                    elif "EWS" in cat: clean_cat = "EWS"
                                    elif "TFWS" in cat: clean_cat = "TFWS"
                                    elif "ORPHAN" in cat: clean_cat = "ORPHAN"
                                    elif "MI" in cat: clean_cat = "Minority"
                                    elif cat == "AI": clean_cat = "All India"
                                    
                                    # Handle sub-types properly
                                    if cat.startswith('L') and clean_cat not in ["TFWS", "EWS", "All India", "Minority"] and "DEF" not in clean_cat and "PWD" not in clean_cat and 'Female' not in clean_cat:
                                        clean_cat += " Female"
                                    if cat.startswith('DEF') and "DEFENCE" not in clean_cat:
                                        clean_cat = "DEFENCE " + clean_cat
                                    if cat.startswith('PWD') and "PWD" not in clean_cat:
                                        clean_cat = "PWD " + clean_cat
                                        
                                    current_branch["cutoffData"].append({
                                        "category": clean_cat,
                                        "percentile": float(perc.group(1)),
                                        "rank": int(rank),
                                        "seatType": cat
                                    })
                    i += 1 # Skip immediately the data block since we just parsed it
            i += 1
            
    # Clean up the hidden _code before returning
    final_colleges = list(colleges_dict.values())
    for coll in final_colleges:
        for b in coll["branches"]:
            if "_code" in b:
                del b["_code"]
                
    return final_colleges

# Basic beautiful UI for the uploader
HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MHT-CET Data Extractor</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; color: #333; margin: 0; padding: 20px; }
        .container { max-width: 900px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        h1 { color: #2c3e50; text-align: center; }
        .upload-area { margin: 30px 0; padding: 40px; border: 2px dashed #3498db; border-radius: 8px; text-align: center; background: #f8fbff; cursor: pointer; transition: all 0.3s ease; }
        .upload-area:hover { background: #eef5ff; border-color: #2980b9; }
        .btn { background: #3498db; color: white; border: none; padding: 12px 24px; font-size: 16px; border-radius: 5px; cursor: pointer; transition: 0.2s; }
        .btn:hover { background: #2980b9; }
        .btn:disabled { background: #95a5a6; cursor: not-allowed; }
        .college-block { margin-top: 30px; background: #2c3e50; border-radius: 8px; overflow: hidden; position: relative; }
        .college-header { background: #1a252f; color: white; padding: 12px 20px; font-size: 16px; font-weight: bold; display: flex; justify-content: space-between; align-items: center; }
        .copy-btn { background: #2ecc71; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; }
        .copy-btn:hover { background: #27ae60; }
        pre { margin: 0; padding: 20px; color: #ecf0f1; overflow-x: auto; font-size: 14px; }
        .loader { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 20px auto; display: none; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="container">
        <h1>MHT-CET PDF Extractor</h1>
        <p style="text-align:center; color:#7f8c8d;">Upload your MHT-CET Cutoff PDF to extract branch constraints and rankings</p>
        
        <div class="upload-area" onclick="document.getElementById('fileInput').click()">
            <h3 style="margin-top:0;">Click here to select PDF file</h3>
            <p id="fileName" style="color: #e74c3c;">No file selected</p>
            <input type="file" id="fileInput" accept=".pdf" style="display: none;" onchange="updateFileName()">
        </div>
        
        <div style="text-align:center;">
            <button class="btn" id="uploadBtn" onclick="uploadPDF()">Extract Data</button>
        </div>
        
        <div id="searchContainer" style="display: none; margin: 30px 0; text-align: center;">
            <input type="text" id="searchInput" placeholder="Search by DTE number or college name..." style="padding: 12px; width: 100%; max-width: 600px; border-radius: 6px; border: 1px solid #bdc3c7; font-size: 16px; box-sizing: border-box;" oninput="filterColleges()">
        </div>

        <div class="loader" id="loader"></div>
        <div id="results"></div>
    </div>

    <script>
        function updateFileName() {
            const input = document.getElementById('fileInput');
            const nameDisplay = document.getElementById('fileName');
            if(input.files.length > 0) {
                nameDisplay.textContent = input.files[0].name;
                nameDisplay.style.color = '#27ae60';
            } else {
                nameDisplay.textContent = 'No file selected';
                nameDisplay.style.color = '#e74c3c';
            }
        }

        async function uploadPDF() {
            const fileInput = document.getElementById('fileInput');
            if (fileInput.files.length === 0) {
                alert('Please select a PDF file first!');
                return;
            }

            const formData = new FormData();
            formData.append('file', fileInput.files[0]);

            const loader = document.getElementById('loader');
            const resultsDiv = document.getElementById('results');
            const uploadBtn = document.getElementById('uploadBtn');

            loader.style.display = 'block';
            resultsDiv.innerHTML = '';
            uploadBtn.disabled = true;
            uploadBtn.textContent = 'Extracting... (might take time)';
            document.getElementById('searchContainer').style.display = 'none';
            document.getElementById('searchInput').value = '';

            try {
                const response = await fetch('/api/extract-pdf', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.success) {
                    renderResults(data.data);
                } else {
                    alert('Error: ' + data.error);
                }
            } catch (error) {
                alert('Request failed: ' + error.message);
            } finally {
                loader.style.display = 'none';
                uploadBtn.disabled = false;
                uploadBtn.textContent = 'Extract Data';
            }
        }

        function renderResults(colleges) {
            const resultsDiv = document.getElementById('results');
            if(colleges.length === 0) {
                resultsDiv.innerHTML = '<p style="text-align:center; color:#e74c3c;">No data could be extracted.</p>';
                return;
            }

            document.getElementById('searchContainer').style.display = 'block';

            colleges.forEach((college, index) => {
                const block = document.createElement('div');
                block.className = 'college-block';
                
                // Keep exactly the requested JSON format wrapper
                // User's example had [ {college...}, {branch...} ]
                // But typically it's an array for one college
                // We will format the output exactly as an array for this single college
                const formattedJson = JSON.stringify([
                    { "college": college.college, "DTE code": college["DTE code"] },
                    ...college.branches
                ], null, 2);

                block.innerHTML = `
                    <div class="college-header">
                        <span>${college["DTE code"]} - ${college.college.substring(0, 50)}...</span>
                        <button class="copy-btn" onclick="copySnippet(${index})">Copy JSON</button>
                    </div>
                    <pre><code id="code-${index}">${formattedJson}</code></pre>
                `;
                resultsDiv.appendChild(block);
            });
        }

        function copySnippet(id) {
            const codeEl = document.getElementById('code-' + id);
            navigator.clipboard.writeText(codeEl.textContent).then(() => {
                alert('Copied to clipboard!');
            });
        }

        function filterColleges() {
            const input = document.getElementById('searchInput');
            const filter = input.value.toLowerCase();
            const resultsDiv = document.getElementById('results');
            const blocks = resultsDiv.getElementsByClassName('college-block');

            for (let i = 0; i < blocks.length; i++) {
                const header = blocks[i].getElementsByClassName('college-header')[0];
                if (header) {
                    const textValue = header.textContent || header.innerText;
                    if (textValue.toLowerCase().indexOf(filter) > -1) {
                        blocks[i].style.display = "";
                    } else {
                        blocks[i].style.display = "none";
                    }
                }
            }
        }
    </script>
</body>
</html>
"""

@app.route('/', methods=['GET'])
def index():
    return render_template_string(HTML_TEMPLATE)

@app.route('/api/extract-pdf', methods=['POST'])
def upload_and_extract_pdf():
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "No file part provided"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"success": False, "error": "No file selected"}), 400
        
    if file and file.filename.lower().endswith('.pdf'):
        filename = werkzeug.utils.secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            extracted_json = extract_college_cutoff_data(filepath)
            return jsonify({
                "success": True,
                "data": extracted_json
            }), 200
        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({
                "success": False, 
                "error": f"Failed to process PDF: {str(e)}"
            }), 500
    else:
        return jsonify({"success": False, "error": "Invalid file format."}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5005, debug=True)
