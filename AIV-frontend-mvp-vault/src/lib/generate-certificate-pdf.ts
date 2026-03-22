/**
 * Certificate PDF Generator
 *
 * Generates a clean, legal-document-style one-page PDF certificate
 * with AIV branding, watermark, certification hash, blockchain proof,
 * and all relevant identity fields.
 */
import jsPDF from "jspdf";

interface CertificateData {
  ownerName: string;
  publicName?: string;
  certifiedAt: string;
  hash: string;
  version: string;
  txHash?: string | null;
  blockNumber?: string | null;
  network?: string | null;
  coveredAssets: string[];
  verifyUrl: string;
}

export function generateCertificatePdf(data: CertificateData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 25;
  const contentW = pageW - margin * 2;

  // --- Watermark ---
  doc.setTextColor(240, 240, 240);
  doc.setFontSize(54);
  doc.setFont("helvetica", "bold");
  const watermarkText = "CERTIFIED";
  // Diagonal watermark across the page
  doc.saveGraphicsState();
  // We'll draw it multiple times for a pattern effect
  for (let y = 40; y < pageH; y += 80) {
    for (let x = -20; x < pageW; x += 140) {
      doc.text(watermarkText, x, y, { angle: 35 });
    }
  }
  doc.restoreGraphicsState();

  // --- Border ---
  doc.setDrawColor(30, 30, 30);
  doc.setLineWidth(0.8);
  doc.rect(15, 15, pageW - 30, pageH - 30);
  doc.setLineWidth(0.3);
  doc.rect(17, 17, pageW - 34, pageH - 34);

  let y = 32;

  // --- Header: AIV Logo text ---
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("AIV", pageW / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text("Digital Identity Protection Platform", pageW / 2, y, { align: "center" });
  y += 10;

  // --- Divider ---
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 10;

  // --- Title ---
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("CERTIFICATE OF", pageW / 2, y, { align: "center" });
  y += 8;
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Digital Identity Ownership", pageW / 2, y, { align: "center" });
  y += 12;

  // --- Divider ---
  doc.setDrawColor(200, 200, 200);
  doc.line(pageW / 2 - 20, y, pageW / 2 + 20, y);
  y += 10;

  // --- Attestation ---
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text("This certifies that", pageW / 2, y, { align: "center" });
  y += 9;

  // --- Owner Name ---
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 20);
  doc.text(data.ownerName, pageW / 2, y, { align: "center" });
  y += 6;
  if (data.publicName && data.publicName !== data.ownerName) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text(`(${data.publicName})`, pageW / 2, y, { align: "center" });
    y += 5;
  }
  y += 4;

  // --- Attestation body ---
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  const certDate = new Date(data.certifiedAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const bodyText = `has captured, reviewed, and certified their digital identity profile through the AIV Identity Protection Platform on ${certDate}. This certification constitutes an immutable, cryptographically sealed record of identity ownership.`;
  const bodyLines = doc.splitTextToSize(bodyText, contentW - 20);
  doc.text(bodyLines, pageW / 2, y, { align: "center", maxWidth: contentW - 20 });
  y += bodyLines.length * 5 + 8;


  // --- Cryptographic Seal Section ---
  doc.setDrawColor(180, 180, 180);
  doc.setFillColor(248, 248, 248);
  doc.roundedRect(margin + 5, y, contentW - 10, 28, 2, 2, "FD");

  y += 6;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80, 80, 80);
  doc.text("BLOCKCHAIN-ANCHORED CRYPTOGRAPHIC SEAL", margin + 10, y);

  if (data.network) {
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(130, 80, 200);
    doc.text(`● ${data.network.toUpperCase()} NETWORK`, pageW - margin - 10, y, { align: "right" });
  }

  y += 6;
  doc.setFontSize(7);
  doc.setFont("courier", "normal");
  doc.setTextColor(30, 130, 76);
  doc.text(`SHA-256: ${data.hash}`, margin + 10, y);

  if (data.txHash) {
    y += 5;
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(`Transaction: ${data.txHash}`, margin + 10, y);
    if (data.blockNumber) {
      doc.text(`Block: ${data.blockNumber}`, pageW - margin - 10, y, { align: "right" });
    }
  }

  y += 14;

  // --- Covered Assets ---
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80, 80, 80);
  doc.text("CERTIFIED ASSETS", margin + 5, y);
  y += 5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  const assetsPerRow = 3;
  const colW = (contentW - 10) / assetsPerRow;
  data.coveredAssets.forEach((asset, i) => {
    const col = i % assetsPerRow;
    const row = Math.floor(i / assetsPerRow);
    const xPos = margin + 8 + col * colW;
    const yPos = y + row * 5;
    doc.text(`✓  ${asset}`, xPos, yPos);
  });
  y += Math.ceil(data.coveredAssets.length / assetsPerRow) * 5 + 8;

  // --- Verification URL ---
  doc.setDrawColor(200, 200, 200);
  doc.line(margin + 5, y, pageW - margin - 5, y);
  y += 7;

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80, 80, 80);
  doc.text("PUBLIC VERIFICATION", margin + 5, y);
  y += 5;
  doc.setFontSize(7);
  doc.setFont("courier", "normal");
  doc.setTextColor(50, 80, 160);
  doc.textWithLink(data.verifyUrl, margin + 5, y, { url: data.verifyUrl });

  if (data.txHash) {
    y += 5;
    const isAmoy = data.network === "polygon-amoy";
    const polygonUrl = isAmoy
      ? `https://amoy.polygonscan.com/tx/${data.txHash}`
      : `https://polygonscan.com/tx/${data.txHash}`;
    doc.setTextColor(130, 80, 200);
    doc.textWithLink(`Blockchain Proof: ${polygonUrl}`, margin + 5, y, { url: polygonUrl });
  }

  y += 10;

  // --- Divider ---
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // --- Certification ID + Version ---
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(140, 140, 140);
  doc.text(`Certification Version: ${data.version}`, margin + 5, y);
  doc.text(`Algorithm: SHA-256`, pageW - margin - 5, y, { align: "right" });
  y += 5;
  doc.text(`Issued: ${certDate}`, margin + 5, y);
  doc.text(`Immutable Record — Cannot Be Re-Issued`, pageW - margin - 5, y, { align: "right" });

  // --- Footer ---
  const footerY = pageH - 22;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, footerY, pageW - margin, footerY);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150, 150, 150);
  doc.text(
    "This document was generated by the AIV Identity Protection Platform. It constitutes a cryptographically",
    pageW / 2, footerY + 5, { align: "center" }
  );
  doc.text(
    "verifiable record of digital identity ownership. Verify authenticity at the URL above.",
    pageW / 2, footerY + 9, { align: "center" }
  );
  doc.text(
    `© ${new Date().getFullYear()} AIV — aiv.chat`,
    pageW / 2, footerY + 14, { align: "center" }
  );

  // --- Download ---
  const fileName = `AIV-Certificate-${data.ownerName.replace(/\s+/g, "-")}-${data.hash.slice(0, 8)}.pdf`;
  doc.save(fileName);
}
