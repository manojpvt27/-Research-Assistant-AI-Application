import os
import logging
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from config import EXPORTS_DIR

logger = logging.getLogger(__name__)

def clean_text(text: str) -> str:
    """
    Cleans unicode text to ASCII to prevent ReportLab font encoding errors.
    """
    if not text:
        return ""
    # PDF encoding error: encode text with .encode('ascii','ignore').decode() before ReportLab
    return text.encode('ascii', 'ignore').decode('ascii')

class BrandedCanvas(canvas.Canvas):
    """
    Custom canvas that draws running headers and footers with a dynamic page count.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.pages = []

    def showPage(self):
        self.pages.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        page_count = len(self.pages)
        for page in self.pages:
            self.__dict__.update(page)
            self.draw_header()
            self.draw_footer(page_count)
            super().showPage()
        super().save()

    def draw_header(self):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#06B6D4"))  # Cyan accent
        self.drawString(54, 792 - 36, "PERSONAL RESEARCH ASSISTANT REPORT")
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(54, 792 - 42, 612 - 54, 792 - 42)
        self.restoreState()

    def draw_footer(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#7C3AED"))  # Purple accent
        self.drawString(54, 36, "AI-Powered Synthesis & Search Vector Memory")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(612 - 54, 36, page_text)
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(54, 48, 612 - 54, 48)
        self.restoreState()


def generate_report_pdf(report_data: dict) -> str:
    """
    Generates a stylized PDF report and returns its absolute path.
    """
    os.makedirs(EXPORTS_DIR, exist_ok=True)
    
    report_id = report_data.get("id", "temp")
    filename = f"report_{report_id}.pdf"
    output_path = os.path.join(EXPORTS_DIR, filename)
    
    logger.info(f"Generating PDF for report {report_id} at {output_path}")

    # Page setup
    # Margins: 0.75 in (54 pt)
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Custom Palette
    primary_color = colors.HexColor("#7C3AED")    # Purple
    secondary_color = colors.HexColor("#06B6D4")  # Cyan
    text_color = colors.HexColor("#1E293B")       # Slate 800
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=primary_color,
        spaceAfter=15
    )
    
    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=secondary_color,
        spaceBefore=15,
        spaceAfter=8,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'SectionBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=15,
        textColor=text_color,
        spaceAfter=10
    )
    
    bullet_style = ParagraphStyle(
        'SectionBullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=text_color,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=6
    )

    meta_style = ParagraphStyle(
        'MetaStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#64748B"),
        spaceAfter=20
    )

    story = []

    # Title
    story.append(Paragraph(clean_text(report_data.get("topic", "Research Report")), title_style))
    
    # Metadata block
    date_str = ""
    created_at = report_data.get("created_at")
    if created_at:
        if hasattr(created_at, "strftime"):
            date_str = created_at.strftime("%B %d, %Y at %I:%M %p")
        else:
            date_str = str(created_at)
            
    word_count = report_data.get("word_count", 0)
    meta_text = f"Compiled on {date_str}  |  Word Count: {word_count} words"
    story.append(Paragraph(clean_text(meta_text), meta_style))
    story.append(Spacer(1, 10))

    # Executive Summary
    story.append(Paragraph("Executive Summary", h1_style))
    exec_summary = report_data.get("executive_summary", "")
    for paragraph in exec_summary.split("\n\n"):
        if paragraph.strip():
            story.append(Paragraph(clean_text(paragraph), body_style))

    # Key Findings
    findings = report_data.get("key_findings", [])
    if findings:
        story.append(Paragraph("Key Findings", h1_style))
        for finding in findings:
            if finding.strip():
                story.append(Paragraph(f"&bull; {clean_text(finding)}", bullet_style))
        story.append(Spacer(1, 5))

    # Detailed Analysis
    story.append(Paragraph("Detailed Analysis", h1_style))
    analysis = report_data.get("detailed_analysis", "")
    for paragraph in analysis.split("\n\n"):
        if paragraph.strip():
            story.append(Paragraph(clean_text(paragraph), body_style))

    # Conclusion
    story.append(Paragraph("Conclusion", h1_style))
    conclusion = report_data.get("conclusion", "")
    for paragraph in conclusion.split("\n\n"):
        if paragraph.strip():
            story.append(Paragraph(clean_text(paragraph), body_style))

    # Sources
    sources_list = report_data.get("sources", [])
    if sources_list:
        story.append(Paragraph("Sources & Credibility Ratings", h1_style))
        table_data = [["Source Title / URL", "Credibility", "Relevance"]]
        
        for src in sources_list:
            title = src.get("title") or src.get("url") or "Source"
            url = src.get("url") or ""
            cred = str(src.get("credibility", "N/A"))
            rel = str(src.get("relevance", "N/A"))
            
            # Format title and URL
            cell_text = f"<b>{title}</b><br/><font color='#64748B'>{url}</font>"
            table_data.append([
                Paragraph(clean_text(cell_text), body_style),
                Paragraph(cred, body_style),
                Paragraph(rel, body_style)
            ])
            
        # Draw elegant sources grid
        sources_table = Table(table_data, colWidths=[360, 70, 70])
        sources_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F8FAFC")),
            ('TEXTCOLOR', (0,0), (-1,0), primary_color),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('BOTTOMPADDING', (0,0), (-1,0), 8),
            ('TOPPADDING', (0,0), (-1,0), 8),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,1), (-1,-1), 8),
            ('TOPPADDING', (0,1), (-1,-1), 8),
        ]))
        story.append(sources_table)

    # Build the document
    doc.build(story, canvasmaker=BrandedCanvas)
    logger.info(f"PDF creation completed successfully at {output_path}")
    return output_path
