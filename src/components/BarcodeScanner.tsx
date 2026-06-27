import React, { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";
import { 
  X, 
  UploadCloud, 
  Beaker, 
  AlertCircle, 
  CheckCircle, 
  Calendar, 
  MapPin, 
  Activity, 
  CornerDownRight, 
  Loader2, 
  Camera, 
  Trash2, 
  Boxes,
  Compass,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { InventoryItem } from "../types";
import { api } from "../services/api";

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
  inventory?: InventoryItem[];
  currentUser?: string;
  onSuccess?: () => void;
}

export default function BarcodeScanner({ 
  isOpen, 
  onClose, 
  onScan, 
  inventory = [], 
  currentUser = "", 
  onSuccess 
}: BarcodeScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [activeTab, setActiveTab] = useState<"camera" | "upload">("camera");

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isDecoding, setIsDecoding] = useState(false);
  const [decodeError, setDecodeError] = useState("");
  const [decodedCode, setDecodedCode] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);

  // Search Results State
  const [matchedItem, setMatchedItem] = useState<InventoryItem | null>(null);

  // Inline Update State
  const [updateType, setUpdateType] = useState<"usage" | "disposal">("usage");
  const [updateQty, setUpdateQty] = useState("");
  const [updateDate, setUpdateDate] = useState(new Date().toISOString().split("T")[0]);
  const [disposalReason, setDisposalReason] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateSuccessMsg, setUpdateSuccessMsg] = useState("");
  const [updateErrorMsg, setUpdateErrorMsg] = useState("");

  // Start/Clear Camera helper
  useEffect(() => {
    if (isOpen && activeTab === "camera") {
      const timer = setTimeout(() => {
        try {
          scannerRef.current = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false
          );
          scannerRef.current.render(
            (code) => {
              // Successfully scanned via camera
              handleDecodedBarcode(code);
            },
            (error) => {
              // Ignore frequent frame-read warnings
            }
          );
        } catch (err) {
          console.error("Scanner setup error", err);
        }
      }, 200);

      return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
          scannerRef.current = null;
        }
      };
    }
  }, [isOpen, activeTab]);

  // Clean preview URLs
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Unified barcode result handler
  const handleDecodedBarcode = (code: string) => {
    const trimmedCode = code.trim();
    if (!trimmedCode) return;

    setDecodedCode(trimmedCode);
    setDecodeError("");
    setUpdateSuccessMsg("");
    setUpdateErrorMsg("");
    setUpdateQty("");

    // Look up in passed inventory items
    const match = inventory.find(item => 
      String(item.id) === trimmedCode ||
      item.cas_number.toLowerCase().trim() === trimmedCode.toLowerCase() ||
      (item.batch_number && item.batch_number.toLowerCase().trim() === trimmedCode.toLowerCase()) ||
      item.chemical_name.toLowerCase().trim() === trimmedCode.toLowerCase()
    );

    if (match) {
      setMatchedItem(match);
    } else {
      setMatchedItem(null);
    }
  };

  // Process selected file
  const processFile = async (file: File) => {
    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setDecodeError("Invalid file type. Please upload a standard image (PNG, JPG, or JPEG).");
      setSelectedFile(null);
      setPreviewUrl("");
      setDecodedCode("");
      setMatchedItem(null);
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setIsDecoding(true);
    setDecodeError("");
    setDecodedCode("");
    setMatchedItem(null);
    setUpdateSuccessMsg("");
    setUpdateErrorMsg("");

    // Small delay for rich visual feedback and loading indicator
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("upload-scan-helper");
        const decodedText = await html5QrCode.scanFile(file, false);
        handleDecodedBarcode(decodedText);
      } catch (err: any) {
        console.warn("File decode failed", err);
        const errorString = String(err);
        let userMessage = "Could not decode any barcode or QR code in this image. Please make sure the barcode is well-centered and clearly visible.";
        if (errorString.includes("Monomorphic")) {
          userMessage = "The uploaded file doesn't seem to contain a clear barcode. Try another image with high contrast.";
        }
        setDecodeError(userMessage);
      } finally {
        setIsDecoding(false);
      }
    }, 800);
  };

  // Drag and drop event handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Form Submission Handler
  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchedItem) return;

    const qty = parseFloat(updateQty);
    if (isNaN(qty) || qty <= 0) {
      setUpdateErrorMsg("Please specify a valid positive chemical quantity.");
      return;
    }

    if (updateType === "usage" && qty > matchedItem.quantity) {
      setUpdateErrorMsg(`Insufficient chemical volume. Available stock is only ${matchedItem.quantity} ${matchedItem.unit}.`);
      return;
    }

    setUpdateLoading(true);
    setUpdateErrorMsg("");
    setUpdateSuccessMsg("");

    try {
      const usernameToUse = currentUser || "admin";
      if (updateType === "usage") {
        await api.recordUsage(matchedItem.id, qty, usernameToUse, updateDate);
        setUpdateSuccessMsg(`Successfully logged usage of ${qty} ${matchedItem.unit}!`);
        
        // Update local quantity state so the UI reflects it instantly
        setMatchedItem(prev => prev ? { ...prev, quantity: prev.quantity - qty } : null);
      } else {
        await api.recordDisposal(matchedItem.id, qty, usernameToUse, updateDate, disposalReason);
        setUpdateSuccessMsg(`Successfully logged disposal of ${qty} ${matchedItem.unit}!`);
        
        // Update local quantity state so the UI reflects it instantly
        setMatchedItem(prev => prev ? { ...prev, quantity: prev.quantity - qty } : null);
      }
      
      setUpdateQty("");
      setDisposalReason("");
      
      // Trigger parent reload
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error(err);
      setUpdateErrorMsg("Failed to log transaction. Please verify database connection.");
    } finally {
      setUpdateLoading(false);
    }
  };

  const resetUploader = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    setDecodedCode("");
    setMatchedItem(null);
    setDecodeError("");
    setUpdateSuccessMsg("");
    setUpdateErrorMsg("");
  };

  const handleCloseModal = () => {
    resetUploader();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseModal}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />

          {/* Hidden scanner element required for html5-qrcode scanFile */}
          <div id="upload-scan-helper" className="hidden" aria-hidden="true" />

          {/* Modal Container */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.93, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden z-10 max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100">
                  <Activity className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">Advanced Barcode scanner</h3>
                  <p className="text-xs text-slate-500">Scan camera feed or upload chemical sticker image</p>
                </div>
              </div>
              <button 
                onClick={handleCloseModal} 
                className="p-2 hover:bg-slate-200 rounded-xl transition-colors"
                id="close-scanner-btn"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Mode Selector Tabs */}
            <div className="px-6 py-3 bg-slate-50/30 border-b border-slate-100 flex gap-2">
              <button
                onClick={() => {
                  setActiveTab("camera");
                  resetUploader();
                }}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                  activeTab === "camera" 
                    ? "bg-slate-900 text-white shadow-md" 
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                }`}
                id="scan-mode-camera-btn"
              >
                <Camera className="w-4 h-4" />
                Camera scanner
              </button>
              <button
                onClick={() => {
                  setActiveTab("upload");
                  if (scannerRef.current) {
                    scannerRef.current.clear().catch(err => console.error(err));
                    scannerRef.current = null;
                  }
                }}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                  activeTab === "upload" 
                    ? "bg-slate-900 text-white shadow-md" 
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                }`}
                id="scan-mode-upload-btn"
              >
                <UploadCloud className="w-4 h-4" />
                Upload Barcode Image
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              {activeTab === "camera" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 overflow-hidden bg-slate-950 p-1">
                    <div id="reader" className="w-full overflow-hidden rounded-xl"></div>
                  </div>
                  <p className="text-center text-xs text-slate-500 font-medium">
                    Position the barcode nicely within the red/green crosshairs scanner frame to decode automatically.
                  </p>
                </div>
              )}

              {activeTab === "upload" && (
                <div className="space-y-4">
                  {!selectedFile ? (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`relative rounded-3xl p-8 text-center border-3 border-dashed transition-all duration-300 flex flex-col items-center justify-center cursor-pointer gap-4 ${
                        isDragActive 
                          ? "border-indigo-500 bg-indigo-50/40 scale-[0.99]" 
                          : "border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                      onClick={() => document.getElementById("barcode-image-upload")?.click()}
                    >
                      <input 
                        type="file" 
                        id="barcode-image-upload" 
                        accept="image/png, image/jpeg, image/jpg" 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            processFile(e.target.files[0]);
                          }
                        }} 
                      />
                      <div className="w-14 h-14 bg-indigo-50 border border-indigo-100/40 text-indigo-500 rounded-2xl flex items-center justify-center shadow-sm">
                        <UploadCloud className="w-7 h-7" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-sm">Select Barcode Image</h4>
                        <p className="text-xs text-slate-400 mt-1">Drag and drop or browse PNG, JPG, or JPEG file</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex flex-col sm:flex-row items-center gap-6 relative">
                      {/* Image Preview with a scanner laser indicator */}
                      <div className="relative w-32 h-32 rounded-2xl overflow-hidden shadow-md border border-slate-200 bg-white flex-shrink-0">
                        <img 
                          src={previewUrl} 
                          alt="Barcode source scan" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                        {isDecoding && (
                          <div className="absolute inset-x-0 h-1 bg-red-500 animate-bounce top-1/2 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                        )}
                      </div>

                      <div className="flex-1 text-center sm:text-left space-y-2">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                          <span className="text-[10px] bg-slate-200 text-slate-600 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                            Source Image preview
                          </span>
                          <button 
                            onClick={resetUploader}
                            className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all duration-300 flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Discard
                          </button>
                        </div>
                        <h5 className="font-bold text-slate-800 text-sm truncate max-w-[250px]">{selectedFile.name}</h5>
                        <p className="text-xs text-slate-400">File size: {(selectedFile.size / 1024).toFixed(1)} KB</p>

                        {isDecoding && (
                          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold justify-center sm:justify-start">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Analysing computer vision decode algorithms...
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {decodeError && (
                    <div className="p-4 bg-red-50/80 border border-red-100 text-red-700 text-xs font-bold rounded-2xl flex items-start gap-2 animate-shake">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-extrabold text-red-800">Scan Decryption Failure</p>
                        <p className="mt-1 font-medium leading-relaxed">{decodeError}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Status Output & Matches */}
              {decodedCode && (
                <div className="pt-4 border-t border-slate-100 space-y-6">
                  {/* Decoded value bar */}
                  <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Decoded Sticker Value</p>
                        <p className="text-sm font-black text-slate-800 font-mono">{decodedCode}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onScan(decodedCode)}
                      className="text-xs font-extrabold bg-slate-200 text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-300 transition-all flex items-center gap-1.5"
                    >
                      Search list
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Product detail card */}
                  {matchedItem ? (
                    <div className="space-y-6">
                      {/* Detailed Bento info section */}
                      <div className="bg-indigo-950 text-white rounded-[2rem] p-6 shadow-xl border border-indigo-900 flex flex-col gap-6 relative overflow-hidden">
                        {/* Decorative chemical background bubble */}
                        <div className="absolute right-0 bottom-0 opacity-10 -translate-x-12 translate-y-12 select-none pointer-events-none">
                          <Beaker className="w-64 h-64" />
                        </div>

                        <div>
                          <span className="text-[9px] font-bold tracking-widest uppercase text-indigo-300 bg-indigo-900/60 border border-indigo-800 px-3 py-1 rounded-full">
                            Database Match Found
                          </span>
                          <h4 className="text-2xl font-black mt-3 text-white leading-tight">{matchedItem.chemical_name}</h4>
                          <p className="text-sm text-indigo-200 mt-1 font-semibold">{matchedItem.formula || "No Formula listed"}</p>
                        </div>

                        {/* Inventory Specs Cards (Bento style grid) */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 z-10">
                          <div className="bg-indigo-900/40 border border-indigo-800/40 p-4 rounded-2xl">
                            <p className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider">Storage Location</p>
                            <p className="text-sm font-extrabold text-white mt-1.5 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {matchedItem.location}
                            </p>
                          </div>
                          
                          <div className="bg-indigo-900/40 border border-indigo-800/40 p-4 rounded-2xl">
                            <p className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider">Volume Stock</p>
                            <p className="text-lg font-black text-emerald-400 mt-1 flex items-center gap-1.5 matches-stock-value">
                              <Boxes className="w-4 h-4" />
                              {matchedItem.quantity} <span className="text-xs text-indigo-200 font-semibold">{matchedItem.unit}</span>
                            </p>
                          </div>

                          <div className="bg-indigo-900/40 border border-indigo-800/40 p-4 rounded-2xl">
                            <p className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider">Expiry date</p>
                            <p className={`text-sm font-extrabold mt-1.5 flex items-center gap-1 ${
                              new Date(matchedItem.expiry_date) < new Date() ? "text-red-400 animate-pulse font-black" : "text-white"
                            }`}>
                              <Calendar className="w-4 h-4" />
                              {matchedItem.expiry_date || "N/A"}
                            </p>
                          </div>

                          <div className="bg-indigo-900/40 border border-indigo-800/40 p-4 rounded-2xl">
                            <p className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider">Hazard Rating</p>
                            <span className="inline-block mt-2 text-xs font-black px-2.5 py-1 text-red-400 bg-red-950/80 border border-red-900 rounded-lg">
                              {matchedItem.hazard_class || "None Rated"}
                            </span>
                          </div>
                        </div>

                        {/* Extra metadata */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-indigo-200 pt-2 border-t border-indigo-900">
                          <div>
                            <span className="font-extrabold text-white pr-2">CAS Registry:</span> {matchedItem.cas_number}
                          </div>
                          <div>
                            <span className="font-extrabold text-white pr-2">Batch Number:</span> {matchedItem.batch_number || "Default SKU Batch"}
                          </div>
                        </div>
                      </div>

                      {/* Stock Update / Transaction Form */}
                      <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-6 space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-200/60">
                          <div>
                            <h5 className="font-black text-slate-800 leading-tight">Fast Update Inventory Transaction</h5>
                            <p className="text-xs text-slate-400">Log chemical use or safe discard procedures</p>
                          </div>

                          {/* Quick selector options */}
                          <div className="bg-white border border-slate-200 p-1 rounded-xl flex gap-1 shadow-sm">
                            <button 
                              type="button"
                              onClick={() => {
                                setUpdateType("usage");
                                setUpdateErrorMsg("");
                              }}
                              className={`px-3 py-1 text-[10px] font-extrabold uppercase rounded-lg transition-all ${
                                updateType === "usage" ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-800"
                              }`}
                            >
                              Usage
                            </button>
                            <button 
                              type="button"
                              onClick={() => {
                                setUpdateType("disposal");
                                setUpdateErrorMsg("");
                              }}
                              className={`px-3 py-1 text-[10px] font-extrabold uppercase rounded-lg transition-all ${
                                updateType === "disposal" ? "bg-red-600 text-white" : "text-slate-500 hover:text-slate-800"
                              }`}
                            >
                              Disposal
                            </button>
                          </div>
                        </div>

                        <form onSubmit={handleUpdateStock} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[11px] font-extrabold uppercase tracking-wide text-slate-600">
                              Quantity to deduct ({matchedItem.unit})
                            </label>
                            <div className="relative">
                              <input 
                                type="number" 
                                step="0.01"
                                required
                                value={updateQty}
                                onChange={(e) => setUpdateQty(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold placeholder-slate-300"
                                placeholder={`Max: ${matchedItem.quantity}`}
                                id="scanner-qty-input"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-extrabold uppercase tracking-wide text-slate-600">
                              Date
                            </label>
                            <input 
                              type="date" 
                              required
                              value={updateDate}
                              onChange={(e) => setUpdateDate(e.target.value)}
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold"
                            />
                          </div>

                          {updateType === "disposal" && (
                            <div className="md:col-span-2 space-y-1">
                              <label className="text-[11px] font-extrabold uppercase tracking-wide text-slate-600">
                                Disposal Reason / Note
                              </label>
                              <input 
                                type="text" 
                                required
                                value={disposalReason}
                                onChange={(e) => setDisposalReason(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold"
                                placeholder="E.g., Expired chemical, container damage, spill etc."
                                id="scanner-disposal-reason-input"
                              />
                            </div>
                          )}

                          {updateErrorMsg && (
                            <div className="md:col-span-2 p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-bold">
                              {updateErrorMsg}
                            </div>
                          )}

                          {updateSuccessMsg && (
                            <div className="md:col-span-2 p-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-xs font-black flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                              {updateSuccessMsg}
                            </div>
                          )}

                          <div className="md:col-span-2">
                            <button 
                              type="submit"
                              disabled={updateLoading}
                              className={`w-full py-3 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${
                                updateType === "usage" 
                                  ? "bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200"
                                  : "bg-red-600 hover:bg-red-700 hover:shadow-red-200"
                              }`}
                              id="scanner-submit-update-btn"
                            >
                              {updateLoading ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Applying update...
                                </>
                              ) : (
                                `Confirm ${updateType === "usage" ? "Usage" : "Disposal"} Deduction`
                              )}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center border border-amber-100/50">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-md">Chemical not found in inventory.</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          The barcode values "<span className="font-semibold text-slate-600">{decodedCode}</span>" does not match any existing item ID, CAS registry, or chemical batch code in our database.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

