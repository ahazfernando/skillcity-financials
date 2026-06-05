"use client";

import { useState, useEffect, useRef, FC } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import Image from "next/image";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
    Trash, HomeIcon, Building, Warehouse, Download, Loader2,
    ChevronRight, Sparkles, User, MapPin, Hash, Tag,
    BedDouble, Bath, Layers, RotateCcw, X,
} from "lucide-react";

type CleaningType = "apartment" | "endOfLeasing" | "house" | "townhouse";
type DocumentType = "quotation" | "invoice";

interface PriceIncrement { max: number; increments: number[]; }
interface ServiceData {
    name: string; basePrice: number;
    bedrooms: PriceIncrement; bathrooms: PriceIncrement;
    powderRooms: PriceIncrement; stories: PriceIncrement | null;
}
interface ExtraInfo { label: string; price: number; type: "checkbox" | "quantity"; }
interface QuoteItem {
    item: string;
    details: string;
    price: number;
    subItems?: { label: string; price: number }[];
}
interface QuoteState { subtotal: number; gst: number; discountAmount: number; total: number; breakdown: QuoteItem[]; }
interface ExtrasState { [key: string]: boolean | number; }
interface ExtrasData { [key: string]: ExtraInfo; }
type PricingData = { [K in CleaningType]: ServiceData } & { extras: ExtrasData; };

const pricingData: PricingData = {
    apartment: {
        name: "Apartment Cleaning", basePrice: 150,
        bedrooms: { max: 6, increments: [0, 25, 40, 60, 90, 120] },
        bathrooms: { max: 6, increments: [0, 25, 50, 75, 100, 125] },
        powderRooms: { max: 5, increments: [10, 20, 30, 40, 50] }, stories: null,
    },
    endOfLeasing: {
        name: "End of Leasing Cleaning", basePrice: 360,
        bedrooms: { max: 6, increments: [0, 60, 120, 220, 520, 680] },
        bathrooms: { max: 6, increments: [0, 25, 50, 75, 100, 125] },
        powderRooms: { max: 5, increments: [20, 40, 60, 80, 100] },
        stories: { max: 2, increments: [0, 50] },
    },
    house: {
        name: "House Cleaning", basePrice: 150,
        bedrooms: { max: 6, increments: [0, 30, 55, 80, 100, 130] },
        bathrooms: { max: 6, increments: [0, 55, 80, 130, 158, 185] },
        powderRooms: { max: 5, increments: [40, 50, 60, 70, 80] },
        stories: { max: 2, increments: [0, 60] },
    },
    townhouse: {
        name: "Townhouse Cleaning", basePrice: 150,
        bedrooms: { max: 5, increments: [0, 25, 45, 65, 80] },
        bathrooms: { max: 6, increments: [0, 35, 60, 85, 110, 135] },
        powderRooms: { max: 5, increments: [20, 30, 40, 50, 60] },
        stories: { max: 2, increments: [0, 40] },
    },
    extras: {
        insideOven: { label: "Inside Oven", price: 75, type: "checkbox" },
        insideFridge: { label: "Inside Fridge", price: 39, type: "checkbox" },
        greenSupplies: { label: "Green Supplies", price: 10, type: "checkbox" },
        insideWindows: { label: "Inside Windows", price: 79, type: "checkbox" },
        outsideWindows: { label: "Outside Windows", price: 209, type: "checkbox" },
        dishWashing: { label: "Dish Washing", price: 39, type: "checkbox" },
        ceilingFans: { label: "Ceiling Fans", price: 25, type: "checkbox" },
        verandaClean: { label: "Veranda Clean", price: 45, type: "checkbox" },
        garageClean: { label: "Garage Clean", price: 45, type: "checkbox" },
        blindCleaning: { label: "Blind Cleaning", price: 30, type: "checkbox" },
        deepClean: { label: "Deep Clean (Recommended)", price: 90, type: "checkbox" },
        insideKitchenCupboards: { label: "Inside Kitchen Cupboards", price: 60, type: "checkbox" },
        laundry: { label: "Laundry", price: 39, type: "quantity" },
        bedChanging: { label: "Bed Changing", price: 15, type: "quantity" },
        wallCleaning: { label: "Wall Cleaning", price: 29, type: "quantity" },
        steamCleaning: { label: "Carpet Steam Cleaning", price: 55, type: "quantity" },
    },
};

const serviceConfig: { [key in CleaningType]: { icon: React.ReactNode; desc: string } } = {
    house: { icon: <HomeIcon className="h-6 w-6" />, desc: "Standard residential" },
    townhouse: { icon: <Warehouse className="h-6 w-6" />, desc: "Multi-level dwelling" },
    apartment: { icon: <Building className="h-6 w-6" />, desc: "Unit or flat" },
    endOfLeasing: { icon: <Trash className="h-6 w-6" />, desc: "Bond clean" },
};

// Default bank details
const DEFAULT_BANK_DETAILS = {
    bankName: "ANZ Bank",
    accountName: "Skill City PTY LTD",
    accountNumber: "169246778",
    bsbNumber: "013-547",
};

// Helper: build the base service description line
function buildBaseDescription(
    cleaningType: CleaningType,
    bedrooms: number,
    bathrooms: number,
    powderRooms: number,
    stories: number,
): string {
    const data = pricingData[cleaningType];
    const storyLabel = data.stories
        ? `${stories === 1 ? "1 story" : "2 story"} `
        : "";
    const parts: string[] = [`${bedrooms} bedroom`];
    parts.push(`${bathrooms} bathroom${bathrooms > 1 ? "s" : ""}`);
    if (powderRooms > 0) parts.push(`${powderRooms} powder room${powderRooms > 1 ? "s" : ""}`);
    return `Includes cleaning of ${storyLabel}${data.name.toLowerCase()} with ${parts.join(", ")}`;
}

// Helper: quantity extra label for PDF
function buildQuantityLabel(key: string, label: string, qty: number): string {
    if (key === "steamCleaning") return `Carpet Steam Cleaning Service (${qty} room${qty > 1 ? "s" : ""})`;
    if (key === "laundry") return `Laundry Service (${qty} load${qty > 1 ? "s" : ""})`;
    if (key === "bedChanging") return `Bed Changing Service (${qty} bed${qty > 1 ? "s" : ""})`;
    if (key === "wallCleaning") return `Wall Cleaning Service (${qty} wall${qty > 1 ? "s" : ""})`;
    return `${label} (x${qty})`;
}

const QuoteTemplate: FC = () => {
    const [cleaningType, setCleaningType] = useState<CleaningType>("house");
    const [bedrooms, setBedrooms] = useState<number>(1);
    const [bathrooms, setBathrooms] = useState<number>(1);
    const [powderRooms, setPowderRooms] = useState<number>(0);
    const [stories, setStories] = useState<number>(1);
    const [extras, setExtras] = useState<ExtrasState>({});
    const [discount, setDiscount] = useState<number>(0);
    const [quote, setQuote] = useState<QuoteState>({ subtotal: 0, gst: 0, discountAmount: 0, total: 0, breakdown: [] });
    const [isDownloading, setIsDownloading] = useState(false);
    const [clientName, setClientName] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    const [clientEmail, setClientEmail] = useState("");
    const [clientAddress, setClientAddress] = useState("");
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [documentType, setDocumentType] = useState<DocumentType>("quotation");
    const [isPaid, setIsPaid] = useState<boolean>(false);

    // Bank details state
    const [bankName, setBankName] = useState(DEFAULT_BANK_DETAILS.bankName);
    const [accountName, setAccountName] = useState(DEFAULT_BANK_DETAILS.accountName);
    const [accountNumber, setAccountNumber] = useState(DEFAULT_BANK_DETAILS.accountNumber);
    const [bsbNumber, setBsbNumber] = useState(DEFAULT_BANK_DETAILS.bsbNumber);

    const [activeSection, setActiveSection] = useState<string>("service");

    const invoiceRef = useRef<HTMLDivElement>(null);
    const currentServiceData: ServiceData = pricingData[cleaningType];

    const currentDate = new Date().toLocaleDateString("en-AU", { year: "numeric", month: "long", day: "numeric" });

    useEffect(() => { setBedrooms(1); setBathrooms(1); setPowderRooms(0); setStories(1); }, [cleaningType]);

    useEffect(() => {
        const data = pricingData[cleaningType];
        if (!data) return;
        const newBreakdown: QuoteItem[] = [];
        let subtotal = 0;
        let baseTotal = data.basePrice
            + (data.bedrooms.increments[bedrooms - 1] || 0)
            + (data.bathrooms.increments[bathrooms - 1] || 0)
            + (data.powderRooms.increments[powderRooms] || 0);
        if (data.stories) baseTotal += data.stories.increments[stories - 1] || 0;

        const baseDesc = buildBaseDescription(cleaningType, bedrooms, bathrooms, powderRooms, stories);
        newBreakdown.push({ item: `${data.name} Service`, details: baseDesc, price: baseTotal });
        subtotal += baseTotal;

        Object.keys(extras).forEach((key) => {
            const extraInfo = pricingData.extras[key];
            const value = extras[key];
            if (value) {
                const qty = extraInfo.type === "quantity" ? (value as number) : 1;
                const price = extraInfo.price * qty;
                subtotal += price;

                if (extraInfo.type === "quantity") {
                    const itemLabel = buildQuantityLabel(key, extraInfo.label, qty);
                    newBreakdown.push({
                        item: itemLabel,
                        details: "",
                        price,
                        subItems: [{ label: `Per Room : ${extraInfo.price.toFixed(2)} AUD`, price: extraInfo.price }],
                    });
                } else {
                    newBreakdown.push({ item: `${extraInfo.label} Service`, details: "", price });
                }
            }
        });

        const discountAmount = subtotal * (discount / 100);
        const preDiscountTotal = subtotal - discountAmount;
        const gst = preDiscountTotal * 0.1;
        const total = preDiscountTotal + gst;
        setQuote({ breakdown: newBreakdown, subtotal, gst, discountAmount, total });
    }, [cleaningType, bedrooms, bathrooms, powderRooms, stories, extras, discount]);

    const handleExtraChange = (key: string, value: boolean | number | "indeterminate") => {
        if (value === "indeterminate") return;
        setExtras((prev) => ({ ...prev, [key]: value }));
    };

    const handleDownloadPdf = async () => {
        const invoiceElement = invoiceRef.current;
        if (!invoiceElement || isDownloading) return;
        setIsDownloading(true);
        try {
            const canvas = await html2canvas(invoiceElement, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff",
                logging: false,
            });
            const imgData = canvas.toDataURL("image/jpeg", 0.92);
            const pdfWidth = 210;
            const margin = 0;
            const imgWidth = pdfWidth - 2 * margin;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            const pdf = new jsPDF("p", "mm", [pdfWidth, imgHeight + 2 * margin]);
            pdf.addImage(imgData, "JPEG", margin, margin, imgWidth, imgHeight);

            const suffix = documentType === "invoice" ? "INV" : "QT";
            pdf.save(`#${invoiceNumber || "0001"} ${suffix}.pdf`);
        } catch (error) { console.error("Failed to generate PDF:", error); }
        finally { setIsDownloading(false); }
    };

    const clearServiceSection = () => setCleaningType("house");
    const clearPropertySection = () => { setBedrooms(1); setBathrooms(1); setPowderRooms(0); setStories(1); };
    const clearExtrasSection = () => setExtras({});
    const clearClientSection = () => {
        setClientName(""); setClientPhone(""); setClientEmail(""); setClientAddress("");
        setInvoiceNumber(""); setDiscount(0);
    };
    const clearAll = () => {
        clearServiceSection(); clearPropertySection(); clearExtrasSection();
        clearClientSection();
        setDocumentType("quotation");
        setBankName(DEFAULT_BANK_DETAILS.bankName);
        setAccountName(DEFAULT_BANK_DETAILS.accountName);
        setAccountNumber(DEFAULT_BANK_DETAILS.accountNumber);
        setBsbNumber(DEFAULT_BANK_DETAILS.bsbNumber);
        setActiveSection("service");
        setIsPaid(false);
    };

    const renderOptions = (max: number, start = 1) =>
        Array.from({ length: max - start + 1 }, (_, i) => (
            <SelectItem key={i + start} value={String(i + start)} className="text-white focus:bg-green-900/40 focus:text-green-300">
                {i + start}
            </SelectItem>
        ));

    const sections = [
        { id: "service", label: "Service Type", icon: <Sparkles className="h-4 w-4" /> },
        { id: "property", label: "Property", icon: <HomeIcon className="h-4 w-4" /> },
        { id: "extras", label: "Add-ons", icon: <Tag className="h-4 w-4" /> },
        { id: "client", label: "Client Info", icon: <User className="h-4 w-4" /> },
    ];

    const SectionHeader = ({ title, step, onClear }: { title: string; step: string; onClear: () => void }) => (
        <div className="flex items-center justify-between">
            <h2 className="font-bold text-base text-foreground/90">{title}</h2>
            <div className="flex items-center gap-2">
                <button
                    onClick={onClear}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-2xl text-xs font-semibold uppercase tracking-wide
                               bg-red-500/10 border border-red-500/20 text-red-400
                               hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400 transition-all duration-200"
                >
                    <X className="h-3 w-3" /> Clear
                </button>
                <span className="bg-green-500/10 border border-green-500/25 text-foreground text-xs font-semibold px-2.5 py-0.5 rounded-full tracking-wide">
                    {step}
                </span>
            </div>
        </div>
    );

    const ContinueButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
        <button
            onClick={onClick}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold
                       bg-green-500/10 border border-green-500/25 text-foreground
                       hover:bg-green-500/20 hover:border-green-500/40 transition-all duration-200"
        >
            {label} <ChevronRight className="h-4 w-4" />
        </button>
    );

    return (
        <>
            <style>
                {`
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Red+Hat+Display:wght@300;400;500;600;700;800&display=swap');
`}
            </style>

            <main className="min-h-screen bg-background text-foreground font-[Poppins,sans-serif]">
                <div className="mx-auto">
                    <div className="mb-8 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-green-600 to-green-400">
                                    <Sparkles className="h-4 w-4 text-white" />
                                </div>
                                <h1 className="text-2xl font-bold text-foreground font-[Poppins,sans-serif]">Quote Builder</h1>
                            </div>
                            <p className="text-foreground/80 text-sm">Configure your cleaning service quotation</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={clearAll}
                                className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold
                                           bg-red-500/10 border border-red-500/25 text-red-400
                                           hover:bg-red-500/18 hover:border-red-500/50 hover:text-red-400
                                           hover:-translate-y-px hover:shadow-lg hover:shadow-red-500/10
                                           transition-all duration-200"
                            >
                                <RotateCcw className="h-4 w-4" /> Clear All
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-7 space-y-5">
                            <div className="bg-background/10 border border-foreground/10 backdrop-blur-xl rounded-2xl p-2 flex gap-1">
                                {sections.map(s => {
                                    const active = activeSection === s.id;
                                    return (
                                        <button
                                            key={s.id}
                                            onClick={() => setActiveSection(s.id)}
                                            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium border transition-all duration-200 cursor-pointer
                                                ${active
                                                    ? "bg-green-500/15 border-green-500/40 text-foreground"
                                                    : "border-transparent text-foreground/80 hover:bg-green-500/10 hover:border-green-500/40"
                                                }`}
                                        >
                                            {s.icon}
                                            <span className="hidden sm:inline">{s.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {activeSection === "service" && (
                                <div className="bg-background/10 border border-foreground/10 backdrop-blur-xl rounded-2xl p-6 space-y-5">
                                    <SectionHeader title="Select Service Type" step="Step 1 of 4" onClear={clearServiceSection} />
                                    <RadioGroup value={cleaningType} onValueChange={(v) => setCleaningType(v as CleaningType)}>
                                        <div className="grid grid-cols-2 gap-3">
                                            {(Object.keys(pricingData) as (CleaningType | "extras")[])
                                                .filter(k => k !== "extras")
                                                .map(key => {
                                                    const cfg = serviceConfig[key as CleaningType];
                                                    const isSelected = cleaningType === key;
                                                    return (
                                                        <Label key={key} htmlFor={key} className="cursor-pointer">
                                                            <RadioGroupItem value={key} id={key} className="sr-only" />
                                                            <div className={`rounded-xl p-4 border transition-all duration-200 cursor-pointer
                                                                ${isSelected
                                                                    ? "bg-green-500/10 border-green-500/60 shadow-[0_0_20px_rgba(34,197,94,0.1)]"
                                                                    : "bg-background/10 border-foreground/10 hover:-translate-y-0.5 hover:border-green-500/40"
                                                                }`}>
                                                                <div className="flex items-start gap-3">
                                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors
                                                                        ${isSelected ? "bg-green-500/20 text-green-500" : "bg-foreground/10 text-foreground/80"}`}>
                                                                        {cfg.icon}
                                                                    </div>
                                                                    <div>
                                                                        <p className={`font-semibold text-sm font-[Poppins,sans-serif] ${isSelected ? "text-green-600" : "text-foreground/80"}`}>
                                                                            {pricingData[key as CleaningType].name}
                                                                        </p>
                                                                        <p className="text-[0.72rem] text-foreground/60 mt-0.5">{cfg.desc}</p>
                                                                        <p className={`text-[0.78rem] font-semibold mt-1 ${isSelected ? "text-green-600" : "text-foreground/60"}`}>
                                                                            from ${pricingData[key as CleaningType].basePrice}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </Label>
                                                    );
                                                })}
                                        </div>
                                    </RadioGroup>
                                    <ContinueButton label="Continue to Property Details" onClick={() => setActiveSection("property")} />
                                </div>
                            )}

                            {activeSection === "property" && (
                                <div className="bg-background/10 border border-foreground/10 backdrop-blur-xl rounded-2xl p-6 space-y-5">
                                    <SectionHeader title="Property Details" step="Step 2 of 4" onClear={clearPropertySection} />

                                    {currentServiceData.stories && (
                                        <div className="bg-background/10 border border-foreground/10 rounded-xl p-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Layers className="h-4 w-4 text-green-600" />
                                                <span className="text-foreground text-[0.72rem] uppercase tracking-widest font-medium">Number of Levels</span>
                                            </div>
                                            <div className="flex gap-2">
                                                {Array.from({ length: currentServiceData.stories.max }, (_, i) => i + 1).map(n => (
                                                    <button
                                                        key={n}
                                                        onClick={() => setStories(n)}
                                                        className={`flex-1 rounded-lg py-2.5 text-sm font-semibold border transition-all duration-200
                                                            ${stories === n
                                                                ? "bg-green-500/20 border-green-500/50 text-foreground"
                                                                : "bg-background/10 border-foreground/10 text-foreground/80 hover:border-green-500/20"
                                                            }`}
                                                    >
                                                        {n === 1 ? "Single" : "Double"}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { label: "Bedrooms", icon: <BedDouble className="h-4 w-4" />, value: bedrooms, setter: setBedrooms, max: currentServiceData.bedrooms.max, start: 1 },
                                            { label: "Bathrooms", icon: <Bath className="h-4 w-4" />, value: bathrooms, setter: setBathrooms, max: currentServiceData.bathrooms.max, start: 1 },
                                            { label: "Powder Rooms", icon: <Building className="h-4 w-4" />, value: powderRooms, setter: setPowderRooms, max: currentServiceData.powderRooms.max, start: 1 },
                                        ].map(field => (
                                            <div key={field.label} className="bg-white/[0.06] border border-white/10 rounded-xl p-4 space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-green-400">{field.icon}</span>
                                                    <span className="text-foreground text-[0.72rem] uppercase tracking-widest font-medium">{field.label}</span>
                                                </div>
                                                <Select value={String(field.value)} onValueChange={v => field.setter(Number(v))}>
                                                    <SelectTrigger className="h-9 rounded-lg text-sm text-foreground">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-[#0d1410] border-white/10 text-white">
                                                        {renderOptions(field.max, field.start)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        ))}
                                    </div>
                                    <ContinueButton label="Continue to Add-ons" onClick={() => setActiveSection("extras")} />
                                </div>
                            )}

                            {activeSection === "extras" && (
                                <div className="bg-background/10 border border-foreground/10 backdrop-blur-xl rounded-2xl p-6 space-y-4">
                                    <SectionHeader title="Additional Services" step="Step 3 of 4" onClear={clearExtrasSection} />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {Object.entries(pricingData.extras).map(([key, extra]) => {
                                            const extraInfo: ExtraInfo = extra;
                                            const isChecked = !!extras[key];
                                            const isSteamCleaning = key === "steamCleaning";
                                            const initialValue = extraInfo.type === "quantity" ? (isSteamCleaning ? bedrooms : 1) : true;
                                            return (
                                                <div
                                                    key={key}
                                                    className={`p-2.5 rounded-xl border transition-all duration-200
                                                        ${isChecked
                                                            ? "bg-green-500/[0.05] border-green-500/20"
                                                            : "border-transparent hover:bg-white/[0.03] hover:border-white/[0.06]"
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <Checkbox
                                                                id={key}
                                                                checked={isChecked}
                                                                onCheckedChange={checked => handleExtraChange(key, checked ? initialValue : false)}
                                                                className="border-green-600/50 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                                                            />
                                                            <div>
                                                                <Label htmlFor={key} className="cursor-pointer text-sm font-medium text-foreground">
                                                                    {extraInfo.label}
                                                                </Label>
                                                                <p className="text-[0.7rem] text-foreground/80 font-bold mt-0.5">
                                                                    ${extraInfo.price}{extraInfo.type === "quantity" ? " / unit" : ""}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {extraInfo.type === "quantity" && isChecked && (
                                                            <Input
                                                                type="number" min="1"
                                                                className="h-8 w-16 text-center rounded-lg text-sm text-foreground placeholder:text-foreground/30 focus:border-green-500/50"
                                                                value={extras[key] === true ? 1 : (extras[key] as number)}
                                                                onChange={e => handleExtraChange(key, parseInt(e.target.value, 10) || 1)}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <ContinueButton label="Continue to Client Info" onClick={() => setActiveSection("client")} />
                                </div>
                            )}

                            {activeSection === "client" && (
                                <div className="bg-background/10 border border-foreground/10 backdrop-blur-xl rounded-2xl p-6 space-y-5">
                                    <SectionHeader title="Client & Document Information" step="Step 4 of 4" onClear={clearClientSection} />

                                    {/* Document Type Selector */}
                                    <div className="bg-background/10 border border-foreground/10 rounded-xl p-5">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Tag className="h-4 w-4 text-green-600" />
                                            <span className="text-foreground text-[0.72rem] uppercase tracking-widest font-medium">Document Type</span>
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setDocumentType("quotation")}
                                                className={`flex-1 py-3 rounded-xl text-sm font-semibold border transition-all
                                                    ${documentType === "quotation"
                                                        ? "bg-green-500/20 border-green-500 text-foreground"
                                                        : "border-foreground/20 hover:border-green-500/30"}`}
                                            >
                                                Quotation
                                            </button>
                                            <button
                                                onClick={() => setDocumentType("invoice")}
                                                className={`flex-1 py-3 rounded-xl text-sm font-semibold border transition-all
                                                    ${documentType === "invoice"
                                                        ? "bg-green-500/20 border-green-500 text-foreground"
                                                        : "border-foreground/20 hover:border-green-500/30"}`}
                                            >
                                                Invoice
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {[
                                            { label: "Client Name", id: "client-name", value: clientName, setter: setClientName, placeholder: "Full name", icon: <User className="h-4 w-4" />, col: 2 },
                                            { label: "Address", id: "client-address", value: clientAddress, setter: setClientAddress, placeholder: "Street, Suburb, State", icon: <MapPin className="h-4 w-4" />, col: 2 },
                                        ].map(f => (
                                            <div key={f.id} className={f.col === 2 ? "sm:col-span-2" : ""}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-green-500">{f.icon}</span>
                                                    <label className="text-foreground text-[0.72rem] uppercase tracking-widest font-medium">{f.label}</label>
                                                </div>
                                                <Input
                                                    id={f.id} value={f.value}
                                                    onChange={e => f.setter(e.target.value)}
                                                    placeholder={f.placeholder}
                                                    className="h-11 rounded-xl text-foreground placeholder:text-foreground/60 focus:border-green-500/50 focus:ring-green-500/10"
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <div className="border-t border-green-500/20 pt-5">
                                        <h3 className="font-bold text-sm text-foreground mb-4 font-[Poppins,sans-serif]">Quotation Settings</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Hash className="h-4 w-4 text-green-500" />
                                                    <label className="text-foreground text-[0.72rem] uppercase tracking-widest font-medium">Number</label>
                                                </div>
                                                <Input
                                                    value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)}
                                                    placeholder="e.g. 0001"
                                                    className="h-11 rounded-xl text-foreground placeholder:text-foreground/60 focus:border-green-500/50 focus:ring-green-500/10"
                                                />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Tag className="h-4 w-4 text-green-500" />
                                                    <label className="text-foreground text-[0.72rem] uppercase tracking-widest font-medium">Discount (%)</label>
                                                </div>
                                                <Input
                                                    type="number" min="0" max="100" value={discount}
                                                    onChange={e => setDiscount(Number(e.target.value) || 0)}
                                                    placeholder="0"
                                                    className="h-11 rounded-xl text-foreground placeholder:text-foreground/60 focus:border-green-500/50 focus:ring-green-500/10"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {documentType === "invoice" && (
                                        <div className="border-t border-green-500/20 pt-5">
                                            <h3 className="font-bold text-sm text-foreground mb-4 font-[Poppins,sans-serif]">Bank Details</h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-foreground text-[0.72rem] uppercase tracking-widest font-medium block mb-2">Bank Name</label>
                                                    <Input
                                                        value={bankName}
                                                        onChange={e => setBankName(e.target.value)}
                                                        className="h-11 rounded-xl text-foreground"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-foreground text-[0.72rem] uppercase tracking-widest font-medium block mb-2">Account Name</label>
                                                    <Input
                                                        value={accountName}
                                                        onChange={e => setAccountName(e.target.value)}
                                                        className="h-11 rounded-xl text-foreground"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-foreground text-[0.72rem] uppercase tracking-widest font-medium block mb-2">Account Number</label>
                                                    <Input
                                                        value={accountNumber}
                                                        onChange={e => setAccountNumber(e.target.value)}
                                                        className="h-11 rounded-xl text-foreground"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-foreground text-[0.72rem] uppercase tracking-widest font-medium block mb-2">BSB Number</label>
                                                    <Input
                                                        value={bsbNumber}
                                                        onChange={e => setBsbNumber(e.target.value)}
                                                        className="h-11 rounded-xl text-foreground"
                                                    />
                                                </div>
                                                <div className="border-t border-green-500/20 pt-5 flex items-center justify-between">
                                                    <div>
                                                        <h3 className="font-bold text-sm text-foreground">Invoice Status</h3>
                                                        <p className="text-sm text-foreground/70">Mark this invoice as paid</p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className={`text-sm font-medium ${isPaid ? 'text-green-500' : 'text-foreground/60'}`}>
                                                            {isPaid ? "PAID" : "UNPAID"}
                                                        </span>
                                                        <Switch
                                                            checked={isPaid}
                                                            onCheckedChange={setIsPaid}
                                                            className="data-[state=checked]:bg-green-600"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-5">
                            <div className="sticky top-6 space-y-4">
                                <div className="bg-background/10 border border-foreground/10 backdrop-blur-xl rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(34,197,94,0.15),0_0_60px_rgba(34,197,94,0.05)]">
                                    <div className="p-5 bg-gradient-to-br from-green-500/12 to-green-500/[0.03] border-b border-green-500/10">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h2 className="font-bold text-foreground text-lg font-[Poppins,sans-serif]">Live Quote</h2>
                                                <p className="text-[0.78rem] text-foreground/60 mt-0.5">{currentServiceData.name}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-3xl font-bold text-foreground leading-none font-[Poppins,sans-serif]">
                                                    ${quote.total.toFixed(2)}
                                                </div>
                                                <div className="text-[0.7rem] text-foreground/60 mt-0.5">incl. GST</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 space-y-1 max-h-72 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-green-500/30 [&::-webkit-scrollbar-thumb]:rounded-full">
                                        {quote.breakdown.length === 0 ? (
                                            <div className="text-center py-8 text-foreground/60 text-sm">
                                                Configure your service to see pricing
                                            </div>
                                        ) : (
                                            quote.breakdown.map((item, i) => (
                                                <div key={i} className="rounded-xl px-3 py-2.5 transition-all duration-200 hover:bg-green-500/10 hover:translate-x-0.5">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-green-500 mt-1.5" />
                                                            <div className="min-w-0">
                                                                <p className="text-[0.82rem] text-foreground font-medium">{item.item}</p>
                                                                {item.details && <p className="text-[0.7rem] text-foreground/60 mt-0.5 leading-relaxed">{item.details}</p>}
                                                                {item.subItems && item.subItems.map((sub, si) => (
                                                                    <p key={si} className="text-[0.68rem] text-foreground/60 mt-0.5">{sub.label}</p>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <span className="text-[0.85rem] font-semibold text-foreground whitespace-nowrap ml-3">${item.price.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    <div className="p-4 space-y-2 border-t border-green-500/10">
                                        <div className="flex justify-between items-center px-1">
                                            <span className="text-[0.8rem] text-foreground/80">Subtotal</span>
                                            <span className="text-[1rem] font-semibold text-foreground">${quote.subtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center px-1">
                                            <span className="text-[0.8rem] text-foreground/80">Discount ({discount}%)</span>
                                            <span className="text-[1rem] font-semibold text-red-500">-${quote.discountAmount.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center px-1">
                                            <span className="text-[0.8rem] text-foreground/80">GST (10%)</span>
                                            <span className="text-[1rem] font-semibold text-foreground">${quote.gst.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center px-4 py-3 mt-3 rounded-xl bg-gradient-to-r from-green-700 to-green-800">
                                            <span className="font-bold text-white text-base font-[Poppins,sans-serif]">TOTAL</span>
                                            <span className="font-bold text-white text-xl font-[Poppins,sans-serif]">${quote.total.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleDownloadPdf}
                                    disabled={isDownloading}
                                    className="relative overflow-hidden w-full flex items-center justify-center gap-3 rounded-2xl py-4
                                               bg-gradient-to-r from-green-700 to-green-800 text-white font-semibold text-base
                                               hover:-translate-y-px hover:shadow-[0_8px_25px_rgba(22,163,74,0.35)]
                                               disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300
                                               before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/15 before:to-transparent
                                               before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-500
                                               font-[Poppins,sans-serif] tracking-wide"
                                >
                                    {isDownloading ? (
                                        <><Loader2 className="h-5 w-5 animate-spin" /> Generating PDF...</>
                                    ) : (
                                        <><Download className="h-5 w-5" /> Download {documentType === "invoice" ? "Invoice" : "Quote"} as PDF</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <div
                ref={invoiceRef}
                style={{
                    position: "absolute",
                    left: "-9999px",
                    top: 0,
                    width: "794px",
                    minHeight: "1123px",
                    backgroundColor: "#ffffff",
                    fontFamily: "Red Hat Display, sans-serif",
                    borderTop: "20px solid #008D1F",
                    borderBottom: "10px solid #008D1F",
                    paddingTop: "40px",
                    paddingBottom: "40px",
                    paddingLeft: "80px",
                    paddingRight: "80px",
                    boxSizing: "border-box",
                    color: "#111827",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <div style={{ flex: 2 }}>
                    <div className="flex justify-between items-start">
                        <div>
                            <Image
                                src="/Logo.png"
                                alt="Skill City Logo"
                                width={128}
                                height={64}
                                priority
                                className="object-contain"
                            />
                        </div>

                        <div className="pt-10">
                            <h1
                                style={{
                                    fontSize: "36px",
                                    fontWeight: 800,
                                    color: "#008D1F",
                                    margin: 0,
                                    lineHeight: 1,
                                    fontFamily: "Red Hat Display, sans-serif",
                                    letterSpacing: "-0.02em",
                                }}
                            >
                                {documentType === "invoice" ? "INVOICE" : "QUOTE"}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-start">
                        <div className="flex-1 mt-2 flex items-center">
                            <div
                                style={{
                                    width: "40px",
                                    height: "6px",
                                    background: "#008D1F",
                                    borderRadius: "9999px"
                                }}
                            />
                            <div
                                style={{
                                    flex: 1,
                                    height: "1px",
                                    background: "#a6a6a6"
                                }}
                            />
                        </div>

                        <div className="text-right items-start ml-2 pt-1">
                            <p style={{
                                fontSize: "13.5px",
                                fontWeight: 800,
                                color: "#111827",
                                marginBottom: "2px",
                            }}>
                                ABN: 52 672 903 034
                            </p>
                            <p style={{
                                fontSize: "13.5px",
                                fontWeight: 800,
                                color: "#111827",
                                marginBottom: "2px",
                            }}>
                                #{invoiceNumber || "0001"} {documentType === "invoice" ? "INV" : "QT"}
                            </p>
                            <p style={{
                                fontSize: "12.5px",
                                color: "#001122",
                                marginBottom: "4px"
                            }}>
                                {currentDate}
                            </p>
                        </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 24 }}>
                        <div>
                            <p style={{
                                fontSize: 10,
                                color: "#001122",
                                fontWeight: 700,
                                margin: 0,
                            }}>
                                {documentType === "invoice" ? "Invoice to :" : "Quote to :"}
                            </p>
                            <p style={{
                                fontSize: 20,
                                fontWeight: 800,
                                color: "#000000",
                                margin: "4px 0 0",
                                fontFamily: "Red Hat Display, sans-serif",
                                lineHeight: 1.2,
                            }}>
                                {clientName || "Client Name"}
                            </p>
                            {clientAddress && (
                                <p style={{ fontSize: 12, color: "#001122", margin: "1px 0 0", lineHeight: 1.5 }}>
                                    {clientAddress}
                                </p>
                            )}
                            {currentServiceData.name && (
                                <p style={{ fontSize: 12, color: "#001122", margin: "1px 0 0", lineHeight: 1.5 }}>
                                    {currentServiceData.name}
                                </p>
                            )}
                        </div>
                    </div>

                    <div style={{ marginTop: 24 }}>
                        <div style={{
                            background: "#008D1F",
                            padding: "6px 14px",
                            display: "grid",
                            gridTemplateColumns: "44px 1fr 110px",
                            gap: 4,
                            font: "14px 'Red Hat Display', sans-serif",
                        }}>
                            <span style={{ color: "white", fontSize: 14, fontWeight: 800 }}>#</span>
                            <span style={{ color: "white", fontSize: 14, fontWeight: 800 }}>Service & Description</span>
                            <span style={{ color: "white", fontSize: 14, fontWeight: 800, textAlign: "right" }}>Amount</span>
                        </div>

                        {quote.breakdown.map((item, idx) => (
                            <div
                                key={idx}
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "44px 1fr 110px",
                                    gap: 4,
                                    padding: "14px 14px",
                                    borderBottom: "1px solid #001122",
                                    background: idx % 2 === 0 ? "#ffffff" : "#ffffff",
                                    alignItems: "start",
                                }}
                            >
                                <span style={{ fontSize: 12, color: "#111827", paddingTop: 2, fontWeight: 700 }}>
                                    {String(idx + 1).padStart(2, "0")})
                                </span>

                                <div>
                                    <p style={{
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: "#000000",
                                        margin: 0,
                                        lineHeight: 1.4,
                                    }}>
                                        {item.item}
                                    </p>
                                    {item.details && (
                                        <p style={{
                                            fontSize: 11,
                                            color: "#001122",
                                            margin: "4px 0 0",
                                            lineHeight: 1.6,
                                        }}>
                                            ({item.details})
                                        </p>
                                    )}
                                    {item.subItems && item.subItems.map((sub, si) => (
                                        <p key={si} style={{
                                            fontSize: 11,
                                            color: "#001122",
                                            margin: "4px 0 0",
                                            fontWeight: 500,
                                            lineHeight: 1.4,
                                        }}>
                                            • {sub.label}
                                        </p>
                                    ))}
                                </div>

                                <p style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: "#001122",
                                    textAlign: "right",
                                    margin: 0,
                                    paddingTop: 2,
                                }}>
                                    ${item.price.toFixed(2)}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                        <div style={{ minWidth: 260 }}>
                            {[
                                { label: "Sub Total :", value: `$${quote.subtotal.toFixed(2)}` },
                                ...(discount > 0
                                    ? [{ label: `Discount ${discount}% :`, value: `-$${quote.discountAmount.toFixed(2)}` }]
                                    : []),
                                { label: "GST 10% :", value: `$${quote.gst.toFixed(2)}` },
                            ].map(row => (
                                <div key={row.label} style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    padding: "1px 14px",
                                }}>
                                    <span style={{ fontSize: 12, color: "#000000", textAlign: "right", fontWeight: 800 }}>{row.label}</span>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: "#001122" }}>{row.value}</span>
                                </div>
                            ))}

                            <div style={{
                                width: "100%",
                                height: 1,
                                background: "#001122",
                                marginTop: 12,
                            }} />

                            <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                background: "#008D1F",
                                padding: "6px 14px",
                                marginTop: 8,
                            }}>
                                <span style={{
                                    fontSize: 14,
                                    fontWeight: 800,
                                    color: "white",
                                    fontFamily: "Red Hat Display, sans-serif",
                                    letterSpacing: "0.02em",
                                }}>
                                    GRAND TOTAL :
                                </span>
                                <span style={{
                                    fontSize: 14,
                                    fontWeight: 800,
                                    color: "white",
                                    fontFamily: "Red Hat Display, sans-serif",
                                }}>
                                    ${quote.total.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {documentType === "invoice" && (
                        <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 20 }}>
                            <div style={{ minWidth: 260 }}>
                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    background: "#008D1F",
                                    padding: "6px 14px",
                                    marginBottom: 8,
                                }}>
                                    <span style={{
                                        fontSize: 14,
                                        fontWeight: 800,
                                        color: "white",
                                        fontFamily: "Red Hat Display, sans-serif",
                                        letterSpacing: "0.02em",
                                    }}>
                                        PAYMENT DETAILS
                                    </span>
                                </div>

                                {[
                                    { label: "Bank Name :", value: bankName },
                                    { label: "Account Name :", value: accountName },
                                    { label: "Account Number :", value: accountNumber },
                                    { label: "BSB Number :", value: bsbNumber },
                                ].map(row => (
                                    <div key={row.label} style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        padding: "1px 14px",
                                    }}>
                                        <span style={{ fontSize: 12, color: "#000000", textAlign: "right", fontWeight: 800 }}>{row.label}</span>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: "#001122" }}>{row.value}</span>
                                    </div>
                                ))}

                                <div style={{
                                    width: "100%",
                                    height: 1,
                                    background: "#001122",
                                    marginTop: 8,
                                }} />

                                <span style={{
                                    fontSize: 14,
                                    color: "#000000",
                                    fontWeight: 800,
                                    marginTop: 8,
                                    padding: "1px 14px",
                                }}>
                                    Thank You for trusting us!
                                </span>
                                {isPaid && (
                                    <Image
                                        src="/Paid.png"
                                        alt="PAID"
                                        width={360}
                                        height={360}
                                        style={{
                                            position: "absolute",
                                            top: "30%",
                                            right: "27%",
                                            transform: "rotate(-5deg)",
                                            opacity: 0.95,
                                            zIndex: 10,
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ marginTop: "auto" }}>
                    <div style={{ marginTop: 24 }}>
                        <h4 style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "#1f2937",
                            margin: "0 0 8px",
                            fontFamily: "Poppins, sans-serif",
                        }}>
                            Term and Conditions :
                        </h4>
                        <p style={{
                            fontSize: 12,
                            color: "#001122",
                            lineHeight: 1.75,
                            margin: 0,
                            textAlign: "justify",
                        }}>
                            We deliver high-standard cleaning with meticulous attention to detail, ensuring a safe, hygienic, and
                            professional environment for your staff and clients. Our services are tailored to your needs and
                            completed with full compliance and quality assurance.
                        </p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", marginTop: 24 }}>
                        <div style={{ width: 44, height: 5, background: "#008D1F", borderRadius: 999 }} />
                        <div style={{ flex: 1, height: 1, background: "#d1d5db" }} />
                        <div style={{ width: 44, height: 5, background: "#008D1F", borderRadius: 999 }} />
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                            <div style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0
                            }}>
                                <svg style={{ width: "36px", height: "36px", fill: "#008D1F" }} viewBox="0 0 24 24"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" /></svg>
                            </div>
                            <div>
                                <p style={{ fontSize: "8px", color: "#008D1F", margin: 0, fontWeight: 500 }}>Email us now</p>
                                <p style={{
                                    fontSize: "12px",
                                    color: "#008D1F",
                                    margin: "1px 0 0",
                                    fontWeight: "800",
                                    fontFamily: "'Red Hat Display', sans-serif"
                                }}>
                                    admin@skillcityfs.com.au</p>
                            </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                            <div style={{ width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <svg style={{ width: "36px", height: "36px", fill: "#008D1F" }} viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm-1 17.93V18a1 1 0 0 0-1-1H8l-2-2v-2.5l2-2h4l2 2v1.5l-2 2v1.43zM17.5 16H16v-2l-1.5-1.5V11l1.5-1.5V8h1.5a8.02 8.02 0 0 1 0 8z" /></svg>
                            </div>
                            <div>
                                <p style={{ fontSize: "8px", color: "#008D1F", margin: 0, fontWeight: 500 }}>Visit Our Website</p>
                                <p style={{
                                    fontSize: "12px",
                                    color: "#008D1F",
                                    margin: "1px 0 0",
                                    fontWeight: "800",
                                    fontFamily: "'Red Hat Display', sans-serif"
                                }}>
                                    www.skillcityfs.com.au
                                </p>
                            </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                            <div style={{ width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <svg style={{ width: "36px", height: "36px", fill: "#008D1F" }} viewBox="0 0 24 24"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" /></svg>
                            </div>
                            <div>
                                <p style={{ fontSize: "8px", color: "#008D1F", margin: 0, fontWeight: 500 }}>Call us now</p>
                                <p style={{
                                    fontSize: "12px",
                                    color: "#008D1F",
                                    margin: "1px 0 0",
                                    fontWeight: "800",
                                    fontFamily: "'Red Hat Display', sans-serif"
                                }}>
                                    03 96 34 6492
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default QuoteTemplate;