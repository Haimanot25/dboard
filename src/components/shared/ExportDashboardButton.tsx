"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { FileImage, FileText, Loader2 } from "lucide-react";

interface ExportDashboardButtonProps {
  dashboardRef: React.RefObject<HTMLDivElement>;
  dashboardName: string;
}

export function ExportDashboardButton({ dashboardRef, dashboardName }: ExportDashboardButtonProps) {
  const [exporting, setExporting] = useState<"png" | "pdf" | null>(null);

  const exportAsPNG = useCallback(async () => {
    if (!dashboardRef.current) return;
    setExporting("png");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(dashboardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `${dashboardName.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(null);
    }
  }, [dashboardRef, dashboardName]);

  const exportAsPDF = useCallback(async () => {
    if (!dashboardRef.current) return;
    setExporting("pdf");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { default: jsPDF } = await import("jspdf");
      const canvas = await html2canvas(dashboardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const pdfWidth = imgWidth * 0.75;
      const pdfHeight = imgHeight * 0.75;
      const pdf = new jsPDF({
        orientation: imgWidth > imgHeight ? "landscape" : "portrait",
        unit: "px",
        format: [pdfWidth, pdfHeight],
      });
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${dashboardName.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.pdf`);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(null);
    }
  }, [dashboardRef, dashboardName]);

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        className="h-7 gap-1.5 px-2 text-[11px] text-muted-foreground"
        onClick={exportAsPNG}
        disabled={!!exporting}
      >
        {exporting === "png" ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <FileImage className="h-3 w-3" />
        )}
        PNG
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-7 gap-1.5 px-2 text-[11px] text-muted-foreground"
        onClick={exportAsPDF}
        disabled={!!exporting}
      >
        {exporting === "pdf" ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <FileText className="h-3 w-3" />
        )}
        PDF
      </Button>
    </div>
  );
}
