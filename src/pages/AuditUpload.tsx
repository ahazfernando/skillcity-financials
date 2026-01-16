"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { createAuditSubmission, AuditQuestion } from "@/lib/firebase/audit";
import { getAllSites } from "@/lib/firebase/sites";
import { Site } from "@/types/financial";
import { uploadImage } from "@/lib/cloudinary/upload-client";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import Image from "next/image";

// Default questions for the audit
const DEFAULT_QUESTIONS: Omit<AuditQuestion, "id">[] = [
  { question: "Did you complete all assigned cleaning tasks?", answer: "", required: true },
  { question: "Were there any issues or concerns during cleaning?", answer: "", required: true },
  { question: "Did you use all required cleaning supplies?", answer: "", required: true },
  { question: "Is the site ready for client inspection?", answer: "", required: true },
  { question: "Any additional notes or comments?", answer: "", required: false },
];

export default function AuditUpload() {
  const { user, userData } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [date, setDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [questions, setQuestions] = useState<AuditQuestion[]>(
    DEFAULT_QUESTIONS.map((q, idx) => ({
      ...q,
      id: `q-${idx}`,
    }))
  );
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const loadSites = async () => {
      try {
        const fetchedSites = await getAllSites();
        setSites(fetchedSites.filter((s) => s.status === "active"));
      } catch (error) {
        console.error("Error loading sites:", error);
        toast.error("Failed to load sites");
      }
    };
    loadSites();
  }, []);

  const handleQuestionChange = (id: string, answer: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, answer } : q))
    );
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploadingImages(true);
      const uploadPromises = Array.from(files).map((file) =>
        uploadImage(file, "site-audits")
      );
      const results = await Promise.all(uploadPromises);
      const imageUrls = results.map((r) => r.secureUrl);

      setImages((prev) => [...prev, ...imageUrls]);
      toast.success("Images uploaded successfully");
    } catch (error) {
      console.error("Error uploading images:", error);
      toast.error("Failed to upload images. Please try again.");
    } finally {
      setUploadingImages(false);
      // Reset file input
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    // Check required questions
    const requiredQuestions = questions.filter((q) => q.required);
    for (const q of requiredQuestions) {
      if (!q.answer || q.answer.trim() === "") {
        toast.error(`Please answer: ${q.question}`);
        return false;
      }
    }

    // Check if at least one image is uploaded
    if (images.length === 0) {
      toast.error("Please upload at least one site image");
      return false;
    }

    // Check if site is selected
    if (!selectedSiteId) {
      toast.error("Please select a site");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!user || !userData) {
      toast.error("You must be logged in to submit an audit");
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      const selectedSite = sites.find((s) => s.id === selectedSiteId);

      await createAuditSubmission({
        cleanerId: user.uid,
        cleanerName: userData.name || user.email || "Unknown",
        cleanerEmail: user.email || "",
        siteId: selectedSiteId,
        siteName: selectedSite?.name || "",
        date,
        questions,
        images,
        notes: notes.trim() || undefined,
        status: "pending",
      });

      toast.success("Audit submission created successfully! Waiting for approval.");
      
      // Reset form
      setSelectedSiteId("");
      setDate(new Date().toISOString().split("T")[0]);
      setQuestions(
        DEFAULT_QUESTIONS.map((q, idx) => ({
          ...q,
          id: `q-${idx}`,
          answer: "",
        }))
      );
      setImages([]);
      setNotes("");
    } catch (error) {
      console.error("Error submitting audit:", error);
      toast.error("Failed to submit audit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Site Audit Submission</h1>
        <p className="text-muted-foreground">
          Upload site images and answer questions to submit your audit for approval
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audit Information</CardTitle>
          <CardDescription>
            Provide details about the site audit you're submitting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="site">Site *</Label>
              <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                <SelectTrigger id="site">
                  <SelectValue placeholder="Select a site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name} - {site.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit Questions</CardTitle>
          <CardDescription>
            Please answer all required questions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.map((question) => (
            <div key={question.id} className="space-y-2">
              <Label htmlFor={question.id}>
                {question.question}
                {question.required && <span className="text-destructive"> *</span>}
              </Label>
              <Textarea
                id={question.id}
                value={question.answer}
                onChange={(e) => handleQuestionChange(question.id, e.target.value)}
                placeholder="Enter your answer..."
                rows={3}
                required={question.required}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Site Images</CardTitle>
          <CardDescription>
            Upload images of the site. At least one image is required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Label htmlFor="image-upload" className="cursor-pointer">
              <Button
                type="button"
                variant="outline"
                disabled={uploadingImages}
                className="w-full"
              >
                {uploadingImages ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Images
                  </>
                )}
              </Button>
            </Label>
            <Input
              id="image-upload"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
              disabled={uploadingImages}
            />
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((imageUrl, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden border">
                    <Image
                      src={imageUrl}
                      alt={`Site image ${index + 1}`}
                      width={200}
                      height={200}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemoveImage(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {images.length === 0 && (
            <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
              <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No images uploaded yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Notes</CardTitle>
          <CardDescription>
            Any additional information about this audit (optional)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter any additional notes..."
            rows={4}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button
          onClick={handleSubmit}
          disabled={submitting || uploadingImages}
          size="lg"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Audit"
          )}
        </Button>
      </div>
    </div>
  );
}
