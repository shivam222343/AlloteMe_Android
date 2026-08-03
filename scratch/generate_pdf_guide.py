import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        if self._pageNumber > 1:
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor("#1A365D"))
            self.drawString(54, 750, "ALLOTEME PLATFORM BRIEFING & TECHNICAL DEEP DIVE")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#718096"))
            self.drawRightString(612 - 54, 750, "CONFIDENTIAL & PROPRIETARY")
            self.setStrokeColor(colors.HexColor("#CBD5E0"))
            self.setLineWidth(0.75)
            self.line(54, 742, 612 - 54, 742)

        self.setStrokeColor(colors.HexColor("#CBD5E0"))
        self.setLineWidth(0.75)
        self.line(54, 48, 612 - 54, 48)

        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#718096"))
        self.drawString(54, 34, "AlloteMe Architecture & Research Guide — Internal Onboarding Document")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(612 - 54, 34, page_str)
        self.restoreState()

def build_pdf():
    pdf_filename = r"c:\Users\Shiva\OneDrive\Desktop\AlloteMe\AlloteMe\AlloteMe-Mobile\AlloteMe_Project_Deep_Dive_Guide.pdf"
    
    doc = SimpleDocTemplate(
        pdf_filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    primary_color = colors.HexColor("#1A365D")   # Dark Navy
    secondary_color = colors.HexColor("#2B6CB0") # Medium Blue
    accent_color = colors.HexColor("#319795")    # Teal Accent
    text_dark = colors.HexColor("#2D3748")       # Charcoal Body Text
    bg_light = colors.HexColor("#F7FAFC")        # Soft Light Grey
    card_bg = colors.HexColor("#EDF2F7")         # Card Grey

    styles['Normal'].textColor = text_dark
    styles['Normal'].fontSize = 9.5
    styles['Normal'].leading = 13.5
    styles['Normal'].fontName = 'Helvetica'

    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=primary_color,
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=secondary_color,
        spaceAfter=12
    )

    h1_style = ParagraphStyle(
        'CustomH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=primary_color,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'CustomH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=secondary_color,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=text_dark,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'CustomBullet',
        parent=body_style,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=3
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=text_dark
    )

    diagram_text_style = ParagraphStyle(
        'DiagramText',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.2,
        leading=9,
        textColor=colors.HexColor("#1A202C")
    )

    story = []

    # ==================== HEADER BANNER ====================
    story.append(Paragraph("ALLOTEME PLATFORM", ParagraphStyle('SubHeader', fontName='Helvetica-Bold', fontSize=9, textColor=accent_color, leading=11, spaceAfter=2)))
    story.append(Paragraph("Comprehensive Project Deep-Dive & Onboarding Manual", title_style))
    story.append(Paragraph("Executive Overview, Architectural Breakdown, Data Pipelines, and Research Roadmap", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=secondary_color, spaceBefore=0, spaceAfter=10))

    meta_data = [
        [Paragraph("<b>Target Audience:</b> New Core Engineers & Researchers", table_cell_style),
         Paragraph("<b>Project Version:</b> v1.0 Production Readiness", table_cell_style)],
        [Paragraph("<b>Document Date:</b> August 2026", table_cell_style),
         Paragraph("<b>Scope:</b> Mobile App, Web Portal, ML Engine & Backend", table_cell_style)]
    ]
    meta_table = Table(meta_data, colWidths=[250, 254])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg_light),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E0")),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 8))

    # ==================== SECTION 1: NON-TECHNICAL OVERVIEW ====================
    story.append(Paragraph("1. Non-Technical Executive Overview", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=accent_color, spaceBefore=0, spaceAfter=6))
    
    story.append(Paragraph(
        "<b>What is AlloteMe?</b><br/>"
        "AlloteMe (integrated with <i>CounselMe</i>) is a centralized counseling and college preference allotment platform. "
        "Every year, thousands of students undergo engineering entrance examinations (such as MHT-CET, JEE Main). "
        "The allotment process requires submitting complex choice lists (Option Forms), where students prioritize college branches based on category cutoffs, location, fees, and historical seat matrix distributions. "
        "A single error in preference ordering can lead to missing seat allocation entirely.",
        body_style
    ))
    
    story.append(Paragraph("<b>Core Value Proposition & Real-World Solutions:</b>", h2_style))
    story.append(Paragraph("• <b>Smart Option Form Generator:</b> Automatically generates tailored college priority lists based on student rank, percentile, caste category, and branch preferences, eliminating manual human errors.", bullet_style))
    story.append(Paragraph("• <b>Expert Counselor Ecosystem:</b> Connects students directly with expert human counselors who review, edit, and lock option forms via dedicated mobile and web tools.", bullet_style))
    story.append(Paragraph("• <b>Automated PDF Document Parsing:</b> Extracts multi-stage cut-off matrices directly from official government PDF booklets using Machine Learning routines.", bullet_style))
    story.append(Paragraph("• <b>Real-Time Live Chat & Notifications:</b> Ensures seamless, instant communication between counselors, parents, and students with real-time updates and push alerts.", bullet_style))
    story.append(Paragraph("• <b>Unified Mobile & Web Ecosystem:</b> Cross-platform accessibility allowing students to track their counseling lifecycle on iOS, Android, or desktop web browsers.", bullet_style))

    story.append(Spacer(1, 6))

    # ==================== SECTION 2: HIGH-LEVEL ARCHITECTURE ====================
    story.append(Paragraph("2. Platform High-Level Architecture", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=accent_color, spaceBefore=0, spaceAfter=6))

    story.append(Paragraph(
        "The AlloteMe ecosystem operates on a micro-service-oriented architecture comprising four primary tiers: Client Layer, API Server Layer, Intelligent ML Engine, and Persistence Layer.",
        body_style
    ))

    arch_diagram_text = """
+-----------------------------------------------------------------------------------------+
|                                     CLIENT LAYER                                        |
|  +----------------------------------+          +-------------------------------------+  |
|  |     AlloteMe Mobile App          |          |      PublicFormsWeb Portal          |  |
|  |   React Native + Expo SDK 54     |          |       React Web Application         |  |
|  |  (Students & Counselors Mobile)  |          |   (Desktop Option Form Builders)    |  |
|  +----------------------------------+          +-------------------------------------+  |
+------------------------------------------+----------------------------------------------+
                                           | HTTP / REST API / WebSockets / Socket.io
                                           v
+-----------------------------------------------------------------------------------------+
|                                API SERVER LAYER (Backend)                               |
|  +-----------------------------------------------------------------------------------+  |
|  | Node.js / Express Server (Port 5000)                                              |  |
|  |   - Auth Middleware (JWT & Google OAuth2)                                         |  |
|  |   - Controllers: User, Counselor, Form, Cutoff, Payment (Razorpay), Chat          |  |
|  |   - WebSockets (Socket.io) for Live Messaging & Notifications                      |  |
|  +-----------------------------------------------------------------------------------+  |
+------------------------------------------+----------------------------------------------+
                       | REST Calls        | Mongoose ODM
                       v                   v
+----------------------------------+  +---------------------------------------------------+
|      ML ENGINE (Python Engine)   |  |                  PERSISTENCE LAYER                |
|  Flask Server + PyMuPDF (fitz)   |  |           MongoDB (Atlas / Managed Cluster)       |
|  - MHT-CET Cutoff PDF Extraction |  | - User & Counselor Profiles, Cutoff Data          |
|  - Intelligent Option Form Ranking|  | - Student Option Forms & Real-time Chat Logs      |
+----------------------------------+  +---------------------------------------------------+
"""
    
    diagram_box = Table([[Paragraph(arch_diagram_text.replace(" ", "&nbsp;").replace("\n", "<br/>"), diagram_text_style)]], colWidths=[504])
    diagram_box.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), card_bg),
        ('PADDING', (0,0), (-1,-1), 6),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E0")),
    ]))
    story.append(diagram_box)
    story.append(Spacer(1, 8))

    # ==================== SECTION 3: TECHNICAL DEEP DIVE ====================
    story.append(Paragraph("3. Technical Deep Dive by Subsystem", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=accent_color, spaceBefore=0, spaceAfter=6))

    story.append(Paragraph("3.1 Mobile & Web Frontend Tier", h2_style))
    story.append(Paragraph(
        "<b>Technology Stack:</b> React Native, Expo SDK 54, React Navigation v7, React Native Web.<br/>"
        "<b>Key Functionalities:</b> Cross-platform build target covering Android (APK via EAS), iOS, and Web. Complex interactive UI supporting drag-and-drop preference reordering (using <i>@dnd-kit</i> and <i>react-native-draggable-flatlist</i>). Native feature integrations: Expo Camera, Document Picker, PDF Generator (Expo Print), Secure Store, and Razorpay SDK for payments.",
        body_style
    ))

    story.append(Paragraph("3.2 Node.js Backend Microservices", h2_style))
    story.append(Paragraph(
        "<b>Technology Stack:</b> Node.js, Express.js, MongoDB (Mongoose ODM), Socket.io, JWT Authentication.<br/>"
        "<b>Core Models & Responsibilities:</b>",
        body_style
    ))

    tech_table_data = [
        [Paragraph("Model / Module", table_header_style), Paragraph("Database Entity Responsibilities", table_header_style), Paragraph("Key Features", table_header_style)],
        [Paragraph("<b>User.js</b>", table_cell_style), Paragraph("Stores student profiles, entrance ranks, category, assigned counselor, and auth tokens.", table_cell_style), Paragraph("Google OAuth, JWT Auth, Role management.", table_cell_style)],
        [Paragraph("<b>Counselor.js</b>", table_cell_style), Paragraph("Profile of verified counselors, assigned students, pricing tiers, and rating metrics.", table_cell_style), Paragraph("Counselor verification, capacity & review tracking.", table_cell_style)],
        [Paragraph("<b>Form.js</b>", table_cell_style), Paragraph("Student option form entries, ordered college choices, status (Draft/Locked/Submitted).", table_cell_style), Paragraph("Version control, counselor approval locking flow.", table_cell_style)],
        [Paragraph("<b>Cutoff.js</b>", table_cell_style), Paragraph("College information, DTE codes, branch codes, category-wise percentile ranks.", table_cell_style), Paragraph("Indexed fast search across college branches.", table_cell_style)],
        [Paragraph("<b>Chat.js</b>", table_cell_style), Paragraph("Real-time messaging history between students and assigned counselors.", table_cell_style), Paragraph("Socket.io room handling, instant message sync.", table_cell_style)]
    ]
    t_tech = Table(tech_table_data, colWidths=[90, 244, 170])
    t_tech.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E0")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, bg_light]),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_tech)
    story.append(Spacer(1, 6))

    story.append(Paragraph("3.3 Machine Learning & Data Extraction Engine", h2_style))
    story.append(Paragraph(
        "<b>Technology Stack:</b> Python 3, Flask, PyMuPDF (fitz), Regular Expressions (re), Flask-CORS.<br/>"
        "<b>Parsing Unstructured Cut-off PDFs:</b><br/>"
        "1. <b>Header Extraction:</b> Scans text blocks for 4-5 digit DTE codes (e.g., <i>6007 - Walchand College of Engineering</i>).<br/>"
        "2. <b>Branch Identification:</b> Detects 9-12 alphanumeric course codes (e.g., <i>600724510 - Computer Science</i>).<br/>"
        "3. <b>Matrix Alignment:</b> Uses coordinate spatial sorting (<font name='Courier'>b[1], b[0]</font>) to group category names (GOPENH, LOPENH, TFWS, PWD) with rank and percentile tuples.<br/>"
        "4. <b>JSON Export:</b> Converts complex PDF tables into structured JSON payloads for MongoDB storage.",
        body_style
    ))

    story.append(Spacer(1, 6))

    # ==================== SECTION 4: DATA FLOW ====================
    story.append(Paragraph("4. End-to-End User Lifecycle & Data Flow", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=accent_color, spaceBefore=0, spaceAfter=6))

    flow_diagram_text = """
 [Student Registration]  ---> [Input Percentile & Category] ---> [Backend Fetches Cutoffs]
                                                                          |
                                                                          v
 [Counselor Review & Edit] <--- [Auto-Generated Priority Form] <--- [ML Recommendation Engine]
            |
            v
 [Option Form Approval]  ---> [PDF Export & Print Generation] ---> [Submission to DTE Portal]
"""
    flow_box = Table([[Paragraph(flow_diagram_text.replace(" ", "&nbsp;").replace("\n", "<br/>"), diagram_text_style)]], colWidths=[504])
    flow_box.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), card_bg),
        ('PADDING', (0,0), (-1,-1), 6),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E0")),
    ]))
    story.append(flow_box)
    story.append(Spacer(1, 8))

    # ==================== SECTION 5: RESEARCH ROADMAP ====================
    story.append(Paragraph("5. Research & Optimization Roadmap for New Team Members", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=accent_color, spaceBefore=0, spaceAfter=6))

    story.append(Paragraph(
        "To make the AlloteMe project significantly more efficient and useful, incoming team members should prioritize research in these domain areas:",
        body_style
    ))

    research_data = [
        [Paragraph("Research Focus Area", table_header_style), Paragraph("Current State", table_header_style), Paragraph("Proposed Research Goal & Innovation", table_header_style)],
        [
            Paragraph("<b>1. Advanced Predictive ML Models</b>", table_cell_style),
            Paragraph("Rule-based cutoff matching against prior year data.", table_cell_style),
            Paragraph("Implement ML models (XGBoost/Random Forest) to predict <i>probabilistic seat allocation</i> taking seat matrix shifts and historical percentile trends into account.", table_cell_style)
        ],
        [
            Paragraph("<b>2. AI Counselor Chatbot</b>", table_cell_style),
            Paragraph("Direct human counselor chat via Socket.io.", table_cell_style),
            Paragraph("Integrate an LLM assistant (RAG over DTE brochures) to answer routine student queries 24/7, reducing human counselor workload.", table_cell_style)
        ],
        [
            Paragraph("<b>3. Document Parser Optimization</b>", table_cell_style),
            Paragraph("Python PyMuPDF string regex parser in Flask.", table_cell_style),
            Paragraph("Research Computer Vision table extraction (PaddleOCR, Camelot) to handle multi-column scanned PDF cut-off sheets without structural layout failures.", table_cell_style)
        ],
        [
            Paragraph("<b>4. Performance & Caching</b>", table_cell_style),
            Paragraph("Direct MongoDB queries per filter request.", table_cell_style),
            Paragraph("Introduce Redis caching for read-heavy cut-off data queries, reducing database load by over 80% during peak CAP round result releases.", table_cell_style)
        ],
        [
            Paragraph("<b>5. Multi-Tenant Counseling Portal</b>", table_cell_style),
            Paragraph("Single-institution / centralized database.", table_cell_style),
            Paragraph("Scale the platform into a SaaS framework where third-party coaching institutes can brand and manage their own student counseling cohorts.", table_cell_style)
        ]
    ]

    t_research = Table(research_data, colWidths=[120, 130, 254])
    t_research.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E0")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, bg_light]),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_research)

    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E0"), spaceBefore=6, spaceAfter=6))
    story.append(Paragraph("<b>Document Summary:</b> Prepared for internal team onboarding. For questions or setup assistance, consult the repository codebase under <i>CounselMe/backend</i>, <i>ML/app.py</i>, and root React Native mobile workspace.", ParagraphStyle('FooterNote', fontName='Helvetica-Oblique', fontSize=7.5, textColor=colors.HexColor("#718096"))))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully re-generated PDF at: {pdf_filename}")

if __name__ == '__main__':
    build_pdf()
